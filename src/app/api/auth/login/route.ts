import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  sessionCookieOptions,
  sessionMaxAge,
  verifySessionToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { findUserByLogin, findUserById } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import { toUserProfile } from "@/lib/auth/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      login?: string;
      password?: string;
      rememberMe?: boolean;
    };

    const login = (body.login ?? body.email)?.trim();
    const password = body.password;
    const rememberMe = body.rememberMe === true;

    if (!login || !password) {
      return NextResponse.json(
        { error: "Email or username and password are required." },
        { status: 400 }
      );
    }

    const user = await findUserByLogin(login);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email/username or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user.id, sessionMaxAge(rememberMe));
    const response = NextResponse.json({ user: toUserProfile(user) });
    response.cookies.set(sessionCookieOptions(token, rememberMe));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: toUserProfile(user) });
}
