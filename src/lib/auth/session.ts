import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "wavesage-session";

/** Stay logged in — 30 days */
export const PERSISTENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** Sign in without stay logged in — expires when browser closes (JWT capped at 24h) */
export const BRIEF_SESSION_MAX_AGE = 60 * 60 * 24;

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? "wavesage-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  userId: string,
  maxAgeSeconds: number
): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionMaxAge(rememberMe: boolean): number {
  return rememberMe ? PERSISTENT_SESSION_MAX_AGE : BRIEF_SESSION_MAX_AGE;
}

export function sessionCookieOptions(token: string, rememberMe = false) {
  const options = {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  if (rememberMe) {
    return { ...options, maxAge: PERSISTENT_SESSION_MAX_AGE };
  }

  // No maxAge — session cookie cleared when the browser closes.
  return options;
}
