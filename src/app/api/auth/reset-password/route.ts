import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";

    if (!token) {
      return NextResponse.json(
        { error: "Reset link is missing or invalid." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const user = await resetPasswordWithToken(token, password);
    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reset password.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
