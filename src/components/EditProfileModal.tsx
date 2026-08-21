"use client";

import { useState, type FormEvent } from "react";
import {
  EXPERIENCE_LABELS,
  STYLE_LABELS,
  type ExperienceLevel,
  type StylePreference,
  type UserProfile,
} from "@/lib/auth/types";

interface EditProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSaved: (user: UserProfile) => void;
}

export function EditProfileModal({
  user,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(String(user.age));
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    user.experienceLevel
  );
  const [stylePreference, setStylePreference] = useState<StylePreference>(
    user.stylePreference
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const ageNum = Number(age);
      if (!Number.isFinite(ageNum)) {
        throw new Error("Enter a valid age.");
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          age: ageNum,
          experienceLevel,
          stylePreference,
        }),
      });
      const data = (await response.json()) as {
        user?: UserProfile;
        error?: string;
      };
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Could not save profile.");
      }
      onSaved(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="photo-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel photo-modal account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <h2 id="edit-profile-title">Edit profile</h2>
        <p className="muted account-modal-lead">
          Update how Sage coaches you. Favorite spot is set from the Spots tab.
        </p>

        <form className="account-edit-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <span className="muted">Email</span>
            <p className="account-readonly">{user.email}</p>
          </div>
          <div className="auth-field">
            <span className="muted">Username</span>
            <p className="account-readonly">@{user.username}</p>
          </div>

          <div className="auth-field">
            <label className="muted" htmlFor="edit-name">
              Name
            </label>
            <input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>

          <div className="auth-field">
            <label className="muted" htmlFor="edit-age">
              Age
            </label>
            <input
              id="edit-age"
              type="number"
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="muted" htmlFor="edit-experience">
              Experience level
            </label>
            <select
              id="edit-experience"
              value={experienceLevel}
              onChange={(e) =>
                setExperienceLevel(e.target.value as ExperienceLevel)
              }
            >
              {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map(
                (level) => (
                  <option key={level} value={level}>
                    {EXPERIENCE_LABELS[level]}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="auth-field">
            <label className="muted" htmlFor="edit-style">
              Style preference
            </label>
            <select
              id="edit-style"
              value={stylePreference}
              onChange={(e) =>
                setStylePreference(e.target.value as StylePreference)
              }
            >
              {(Object.keys(STYLE_LABELS) as StylePreference[]).map((style) => (
                <option key={style} value={style}>
                  {STYLE_LABELS[style]}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="photo-modal-actions">
            <button
              type="button"
              className="account-secondary-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="account-primary-btn" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
