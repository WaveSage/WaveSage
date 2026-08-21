"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthForm";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          message?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Verification failed");
        }
        setStatus("ok");
        setMessage(data.message ?? "Email verified.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <AuthShell title="Email verification" subtitle={message}>
      {status === "loading" && <p className="muted">Verifying...</p>}
      {status === "ok" && (
        <p>
          <Link href="/">Continue to WaveSage</Link>
        </p>
      )}
      {status === "error" && (
        <p>
          <Link href="/login">Back to sign in</Link>
        </p>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="muted">Loading...</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
