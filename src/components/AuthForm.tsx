"use client";

import type {
  ExperienceLevel,
  StylePreference,
  UserProfile,
} from "@/lib/auth/types";
import {
  EXPERIENCE_LABELS,
  STYLE_LABELS,
} from "@/lib/auth/types";

import type { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  logoSrc?: string;
}

export function AuthShell({ title, subtitle, children, logoSrc }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <div className="auth-card panel">
        <div className="auth-brand">
          <AppLogo src={logoSrc} height={150} asHeading alt="WaveSage" />
        </div>
        <p className="muted">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

export function AuthField({ id, label, children }: AuthFieldProps) {
  return (
    <div className="auth-field">
      <label className="muted" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

export function ExperienceSelect({
  value,
  onChange,
}: {
  value: ExperienceLevel;
  onChange: (value: ExperienceLevel) => void;
}) {
  return (
    <select
      id="experience"
      value={value}
      onChange={(e) => onChange(e.target.value as ExperienceLevel)}
    >
      {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((level) => (
        <option key={level} value={level}>
          {EXPERIENCE_LABELS[level]}
        </option>
      ))}
    </select>
  );
}

export function StyleSelect({
  value,
  onChange,
}: {
  value: StylePreference;
  onChange: (value: StylePreference) => void;
}) {
  return (
    <select
      id="style"
      value={value}
      onChange={(e) => onChange(e.target.value as StylePreference)}
    >
      {(Object.keys(STYLE_LABELS) as StylePreference[]).map((style) => (
        <option key={style} value={style}>
          {STYLE_LABELS[style]}
        </option>
      ))}
    </select>
  );
}

export function ProfileBadge({ user }: { user: UserProfile }) {
  return (
    <p className="muted sage-profile">
      Signed in as <strong>{user.name}</strong> · {STYLE_LABELS[user.stylePreference]}
      {!user.emailVerified && (
        <span className="verify-badge"> · Email not verified</span>
      )}
    </p>
  );
}
