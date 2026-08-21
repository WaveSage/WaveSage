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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);
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
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed.");
      }
      setMessage(data.message ?? "Check your email for a reset link.");
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="WaveSage"
      subtitle="Enter the email on your account and we’ll help you reset your password."
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
          <p className="auth-reset-link">
            Reset link (email sending not configured yet):{" "}
            <a href={resetUrl}>{resetUrl}</a>
          </p>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="auth-footer muted">
        <Link href="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
