"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  sessionCookieOptions,
  sessionMaxAge,
} from "./session";
import { createUser, findUserByLogin } from "./users";
import { verifyPassword } from "./password";
import { parseLoginForm, parseRegisterForm } from "./validate";

export async function signupAction(formData: FormData): Promise<void> {
  const parsed = parseRegisterForm(formData);
  if ("error" in parsed) {
    redirect(`/signup?error=${encodeURIComponent(parsed.error)}`);
  }

  try {
    const user = await createUser(parsed.data);
    const token = await createSessionToken(user.id, sessionMaxAge(true));
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token, true));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  redirect("/");
}

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = parseLoginForm(formData);
  if ("error" in parsed) {
    redirect(`/login?error=${encodeURIComponent(parsed.error)}`);
  }

  const user = await findUserByLogin(parsed.login);
  if (!user || !(await verifyPassword(parsed.password, user.passwordHash))) {
    redirect(
      `/login?error=${encodeURIComponent("Invalid email/username or password.")}&from=${encodeURIComponent(parsed.from)}`
    );
  }

  const token = await createSessionToken(
    user.id,
    sessionMaxAge(parsed.rememberMe)
  );
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token, parsed.rememberMe));

  const destination =
    parsed.from.startsWith("/") && !parsed.from.startsWith("//")
      ? parsed.from
      : "/";
  redirect(destination);
}
