import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
  sessionMaxAge,
} from "@/lib/auth/session";
import { createUser } from "@/lib/auth/users";
import { toUserProfile, type RegisterInput } from "@/lib/auth/types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterInput;

    if (!body.email?.trim() || !isValidEmail(body.email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }
    if (!body.username?.trim() || body.username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }
    if (!body.password || body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!body.age || body.age < 13 || body.age > 120) {
      return NextResponse.json(
        { error: "Enter a valid age (13+)." },
        { status: 400 }
      );
    }

    const user = await createUser({
      email: body.email,
      username: body.username,
      password: body.password,
      name: body.name,
      age: body.age,
      experienceLevel: body.experienceLevel,
      stylePreference: body.stylePreference,
    });

    const token = await createSessionToken(user.id, sessionMaxAge(true));
    const verifyUrl = `/verify-email?token=${user.verificationToken}`;

    const response = NextResponse.json({
      user: toUserProfile(user),
      verificationUrl: verifyUrl,
      message:
        "Account created. Check your email to verify your account (dev link included in response).",
    });
    response.cookies.set(sessionCookieOptions(token, true));
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    const status = message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
