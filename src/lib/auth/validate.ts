import type { ExperienceLevel, RegisterInput, StylePreference } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "pro",
];

const STYLE_PREFERENCES: StylePreference[] = ["cruise", "trim", "carving"];

export function parseRegisterForm(
  formData: FormData
): { data: RegisterInput } | { error: string } {
  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const age = Number(formData.get("age"));
  const experienceLevel = String(
    formData.get("experienceLevel") ?? "intermediate"
  ) as ExperienceLevel;
  const stylePreference = String(
    formData.get("stylePreference") ?? "trim"
  ) as StylePreference;

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "A valid email is required." };
  }
  if (!username || username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!name) {
    return { error: "Name is required." };
  }
  if (!Number.isFinite(age) || age < 13 || age > 120) {
    return { error: "Enter a valid age (13+)." };
  }
  if (!EXPERIENCE_LEVELS.includes(experienceLevel)) {
    return { error: "Choose a valid experience level." };
  }
  if (!STYLE_PREFERENCES.includes(stylePreference)) {
    return { error: "Choose a valid style preference." };
  }

  return {
    data: {
      email,
      username,
      password,
      name,
      age,
      experienceLevel,
      stylePreference,
    },
  };
}

export function parseLoginForm(formData: FormData): {
  login: string;
  password: string;
  rememberMe: boolean;
  from: string;
} | { error: string } {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";
  const from = String(formData.get("from") ?? "/").trim() || "/";

  if (!login || !password) {
    return { error: "Email or username and password are required." };
  }

  return { login, password, rememberMe, from };
}
