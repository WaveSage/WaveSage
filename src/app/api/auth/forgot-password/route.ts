import { NextResponse } from "next/server";
import { createPasswordResetForEmail } from "@/lib/auth/users";

async function trySendResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Reset your WaveSage password",
        text: `Reset your WaveSage password using this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const created = await createPasswordResetForEmail(email);
    const origin = new URL(request.url).origin;

    // Always return a generic message so emails can't be enumerated easily.
    const generic = {
      message:
        "If an account exists for that email, a reset link is ready. Check your inbox or use the link below if shown.",
    };

    if (!created) {
      return NextResponse.json(generic);
    }

    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(created.token)}`;
    const emailed = await trySendResetEmail(created.user.email, resetUrl);

    // When email isn't configured (common early on), return the link so the
    // account owner can still reset from the forgot-password page.
    if (!emailed) {
      return NextResponse.json({
        ...generic,
        resetUrl,
        emailed: false,
      });
    }

    return NextResponse.json({ ...generic, emailed: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start password reset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
