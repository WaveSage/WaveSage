import Link from "next/link";
import { AuthError, AuthField, AuthShell } from "@/components/AuthForm";
import { loginAction } from "@/lib/auth/actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error ?? null;
  const from = params.from ?? "/";

  return (
    <AuthShell
      title="WaveSage"
      subtitle="Sign in for personalized surf outlook at your favorite spot."
    >
      <form className="auth-form" action={loginAction}>
        <input type="hidden" name="from" value={from} />
        <AuthField id="login" label="Email or username">
          <input
            id="login"
            name="login"
            type="text"
            autoComplete="username"
            required
          />
        </AuthField>
        <AuthField id="password" label="Password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </AuthField>
        <label className="auth-checkbox">
          <input type="checkbox" name="rememberMe" defaultChecked />
          Stay logged in
        </label>
        <AuthError message={error} />
        <button type="submit">Sign in</button>
      </form>
      <p className="auth-footer muted">
        New here?{" "}
        <Link href="/signup">Create your profile</Link>
      </p>
    </AuthShell>
  );
}
