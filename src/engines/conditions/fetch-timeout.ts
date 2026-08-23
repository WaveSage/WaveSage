export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 12_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let activeOpenMeteo = 0;
const openMeteoWaiters: Array<() => void> = [];
const OPEN_METEO_MAX = 4;

async function withOpenMeteoLimit<T>(task: () => Promise<T>): Promise<T> {
  while (activeOpenMeteo >= OPEN_METEO_MAX) {
    await new Promise<void>((resolve) => openMeteoWaiters.push(resolve));
  }
  activeOpenMeteo += 1;
  try {
    return await task();
  } finally {
    activeOpenMeteo -= 1;
    const next = openMeteoWaiters.shift();
    if (next) next();
  }
}

/** Fetch JSON and retry rate-limits / transient failures. Never cache error bodies. */
export async function fetchJsonWithRetry<T>(
  url: string,
  label: string,
  attempts = 3
): Promise<T> {
  return withOpenMeteoLimit(async () => {
    let lastError = new Error(`${label} unavailable`);

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) {
        await sleep(400 * 2 ** (attempt - 1));
      }

      try {
        const response = await fetchWithTimeout(url, {
          cache: "no-store",
          timeoutMs: 10_000,
        });

        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`${label} unavailable (${response.status})`);
          continue;
        }

        if (!response.ok) {
          throw new Error(`${label} unavailable (${response.status})`);
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof Error && error.message.includes("unavailable (")) {
          const status = Number(error.message.match(/\((\d+)\)/)?.[1]);
          if (status && status !== 429 && status < 500) throw error;
        }
        lastError = error instanceof Error ? error : lastError;
      }
    }

    throw lastError;
  });
}
