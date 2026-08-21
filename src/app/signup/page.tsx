import Link from "next/link";
import {
  AuthError,
  AuthField,
  AuthShell,
} from "@/components/AuthForm";
import { signupAction } from "@/lib/auth/actions";
import { EXPERIENCE_LABELS, STYLE_LABELS } from "@/lib/auth/types";
import type { ExperienceLevel, StylePreference } from "@/lib/auth/types";

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = params.error ?? null;

  return (
    <AuthShell
      title="Create your profile"
      subtitle="Set up your WaveSage profile for style-based surf outlook at your favorite spot."
    >
      <form className="auth-form" action={signupAction}>
        <AuthField id="email" label="Email (for verification)">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </AuthField>
        <AuthField id="username" label="Username">
          <input
            id="username"
            name="username"
            autoComplete="username"
            minLength={3}
            required
          />
        </AuthField>
        <AuthField id="password" label="Password (8+ characters)">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </AuthField>
        <AuthField id="name" label="Name">
          <input id="name" name="name" autoComplete="name" required />
        </AuthField>
        <AuthField id="age" label="Age">
          <input
            id="age"
            name="age"
            type="number"
            min={13}
            max={120}
            required
          />
        </AuthField>
        <AuthField id="experience" label="Experience level">
          <select
            id="experience"
            name="experienceLevel"
            defaultValue="intermediate"
          >
            {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map(
              (level) => (
                <option key={level} value={level}>
                  {EXPERIENCE_LABELS[level]}
                </option>
              )
            )}
          </select>
        </AuthField>
        <AuthField id="style" label="Style preference">
          <select id="style" name="stylePreference" defaultValue="trim">
            {(Object.keys(STYLE_LABELS) as StylePreference[]).map((style) => (
              <option key={style} value={style}>
                {STYLE_LABELS[style]}
              </option>
            ))}
          </select>
        </AuthField>
        <AuthError message={error} />
        <button type="submit">Create profile</button>
      </form>
      <p className="auth-footer muted">
        Already have an account? <Link href="/login">Sign in</Link>
        {" · "}
        <Link href="/">Continue as guest</Link>
      </p>
    </AuthShell>
  );
}
