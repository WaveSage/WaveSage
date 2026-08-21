"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthError, AuthField, AuthShell } from "@/components/AuthForm";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [emailed, setEmailed] = useState<boolean | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setEmailed(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        resetUrl?: string;
        emailed?: boolean;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed.");
      }

      setEmailed(data.emailed === true);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
        setMessage(
          "Email delivery isn’t set up on the server yet. Use the button below to reset your password (link expires in 1 hour)."
        );
      } else if (data.emailed) {
        setMessage(
          "If an account exists for that email, a reset link was sent. Check your inbox and spam folder."
        );
      } else {
        setMessage(
          "If an account exists for that email, a reset option will appear here. Double-check the email address if nothing shows."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="WaveSage"
      subtitle="Enter the email on your account. We’ll give you a way to set a new password."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthField id="email" label="Email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </AuthField>
        <AuthError message={error} />
        {message ? <p className="auth-success">{message}</p> : null}
        {resetUrl ? (
          <div className="auth-reset-box">
            <p className="auth-reset-label">Your reset link</p>
            <a className="auth-reset-button" href={resetUrl}>
              Continue to reset password
            </a>
            <p className="auth-reset-url muted">{resetUrl}</p>
          </div>
        ) : null}
        {emailed === true && !resetUrl ? (
          <p className="muted">
            Didn’t get it? Wait a minute, check spam, or try again.
          </p>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? "Working…" : "Get reset link"}
        </button>
      </form>
      <p className="auth-footer muted">
        <Link href="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
