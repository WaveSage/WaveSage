"use client";

import { useMemo, useState } from "react";
import type { UserProfile } from "@/lib/auth/types";
import type { SurfSpot } from "@/lib/types";
import { SOCAL_SPOTS } from "@/lib/socal-spots";

function normalizeSpotIds(ids: string[]): string[] {
  const unique = Array.from(new Set(ids.filter((id) => typeof id === "string")));
  return unique.slice(0, 5);
}

export function EditQuickSpotsModal({
  user,
  selectedSpotIds,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  selectedSpotIds: string[];
  onClose: () => void;
  onSaved: (user: UserProfile) => void;
}) {
  const initial = useMemo(
    () => normalizeSpotIds(selectedSpotIds ?? []),
    [selectedSpotIds]
  );
  const [picked, setPicked] = useState<string[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setError(null);
    setPicked((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const pickedSpots: SurfSpot[] = useMemo(() => {
    return picked
      .map((id) => SOCAL_SPOTS.find((s) => s.id === id))
      .filter((s): s is SurfSpot => Boolean(s));
  }, [picked]);

  async function handleSave() {
    setError(null);
    if (picked.length < 1 || picked.length > 5) {
      setError("Pick 1–5 spots.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteSpotIds: picked }),
      });
      const data = (await response.json()) as {
        user?: UserProfile;
        error?: string;
      };
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Could not save spots.");
      }
      onSaved(data.user);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save spots.");
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
        className="panel photo-modal account-modal howto-modal quickspots-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-spots-title"
      >
        <h2 id="edit-spots-title">Choose your 5 Sage spots</h2>
        <p className="muted account-modal-lead">
          These spots appear at the top of the Sage tab for fast switching.
          Pick 1–5.
        </p>

        <div className="quickspots-picked">
          {pickedSpots.length ? (
            pickedSpots.map((s) => (
              <span key={s.id} className="se-chip quickspots-picked-chip">
                {s.name}
              </span>
            ))
          ) : (
            <span className="muted">No spots selected.</span>
          )}
        </div>

        <div className="quickspots-grid" role="list">
          {SOCAL_SPOTS.map((spot) => {
            const active = pickedSet.has(spot.id);
            return (
              <button
                key={spot.id}
                type="button"
                className={`quickspots-item ${active ? "active" : ""}`}
                role="listitem"
                onClick={() => toggle(spot.id)}
              >
                <span className="quickspots-item-name">{spot.name}</span>
                {active ? <span className="quickspots-item-check">✓</span> : null}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="photo-modal-actions">
          <button
            type="button"
            className="account-secondary-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="account-primary-btn"
            onClick={handleSave}
            disabled={saving || picked.length < 1}
          >
            {saving ? "Saving…" : `Save (${picked.length}/5)`}
          </button>
        </div>
      </div>
    </div>
  );
}

