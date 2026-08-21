import { promises as fs } from "fs";
import path from "path";
import type { RegisterInput, UserRecord } from "./types";
import { hashPassword } from "./password";
import { getDefaultSpot } from "@/engines/conditions";
import { dataPath } from "@/lib/data-root";

const DATA_DIR = dataPath();
const USERS_FILE = path.join(DATA_DIR, "users.json");

interface UserStore {
  users: UserRecord[];
}

async function readStore(): Promise<UserStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as UserStore;
    if (!Array.isArray(parsed.users)) {
      return { users: [] };
    }
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { users: [] };
    }
    throw error;
  }
}

async function saveStore(store: UserStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${USERS_FILE}.tmp`;
  const payload = JSON.stringify(store, null, 2);
  await fs.writeFile(tempFile, payload, "utf-8");
  await fs.rename(tempFile, USERS_FILE);
}

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createVerificationToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `verify-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email === normalized) ?? null;
}

export async function findUserByLogin(login: string): Promise<UserRecord | null> {
  const store = await readStore();
  const trimmed = login.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  return (
    store.users.find(
      (u) => u.email === lower || u.username.toLowerCase() === lower
    ) ?? null
  );
}

export async function findUserByUsername(
  username: string
): Promise<UserRecord | null> {
  const store = await readStore();
  return (
    store.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    ) ?? null
  );
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const store = await readStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function findUserByVerificationToken(
  token: string
): Promise<UserRecord | null> {
  const store = await readStore();
  return store.users.find((u) => u.verificationToken === token) ?? null;
}

export async function createUser(input: RegisterInput): Promise<UserRecord> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim();

  if (await findUserByEmail(normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }
  if (await findUserByUsername(normalizedUsername)) {
    throw new Error("This username is already taken.");
  }

  const defaultSpot = getDefaultSpot();

  const user: UserRecord = {
    id: createId(),
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    age: input.age,
    experienceLevel: input.experienceLevel,
    stylePreference: input.stylePreference,
    favoriteSpot: defaultSpot,
    favoriteSpotIds: [defaultSpot.id],
    emailVerified: false,
    verificationToken: createVerificationToken(),
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  store.users.push(user);
  await saveStore(store);
  return user;
}

export async function verifyUserEmail(token: string): Promise<UserRecord | null> {
  const store = await readStore();
  const index = store.users.findIndex((u) => u.verificationToken === token);
  if (index === -1) return null;

  store.users[index] = {
    ...store.users[index],
    emailVerified: true,
    verificationToken: undefined,
  };
  await saveStore(store);
  return store.users[index];
}

export async function updateUserFavoriteSpot(
  userId: string,
  favoriteSpot: UserRecord["favoriteSpot"]
): Promise<UserRecord | null> {
  const store = await readStore();
  const index = store.users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  store.users[index] = { ...store.users[index], favoriteSpot };
  await saveStore(store);
  return store.users[index];
}

export async function updateUserFavoriteSpotIds(
  userId: string,
  favoriteSpotIds: string[]
): Promise<UserRecord | null> {
  const store = await readStore();
  const index = store.users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  store.users[index] = {
    ...store.users[index],
    favoriteSpotIds,
  };
  await saveStore(store);
  return store.users[index];
}

export type UserProfileUpdate = {
  name?: string;
  age?: number;
  experienceLevel?: UserRecord["experienceLevel"];
  stylePreference?: UserRecord["stylePreference"];
};

export async function updateUserProfile(
  userId: string,
  patch: UserProfileUpdate
): Promise<UserRecord | null> {
  const store = await readStore();
  const index = store.users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  const current = store.users[index];
  store.users[index] = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.age !== undefined ? { age: patch.age } : {}),
    ...(patch.experienceLevel !== undefined
      ? { experienceLevel: patch.experienceLevel }
      : {}),
    ...(patch.stylePreference !== undefined
      ? { stylePreference: patch.stylePreference }
      : {}),
  };
  await saveStore(store);
  return store.users[index];
}
