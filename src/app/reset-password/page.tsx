"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthError, AuthField, AuthShell } from "@/components/AuthForm";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams]
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Reset link is missing. Request a new one.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not reset password.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="WaveSage"
      subtitle={
        done
          ? "Your password has been updated."
          : "Choose a new password for your account."
      }
    >
      {done ? (
        <p className="auth-footer">
          <Link href="/login">Sign in</Link>
        </p>
      ) : (
        <>
          <form className="auth-form" onSubmit={onSubmit}>
            <AuthField id="password" label="New password">
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </AuthField>
            <AuthField id="confirm" label="Confirm password">
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </AuthField>
            <AuthError message={error} />
            <button type="submit" disabled={loading || !token}>
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
          <p className="auth-footer muted">
            <Link href="/forgot-password">Request a new reset link</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="WaveSage" subtitle="Loading reset form…">
          <p className="muted">One moment…</p>
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
