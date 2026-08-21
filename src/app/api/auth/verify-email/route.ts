import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/auth/users";
import { toUserProfile } from "@/lib/auth/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  }

  const user = await verifyUserEmail(token);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired verification link." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: toUserProfile(user),
    message: "Email verified successfully.",
  });
}
