"use client";

import { useEffect, useState } from "react";
import type { UserReportGalleryItem } from "@/lib/reports/types";
import { displayCaption } from "@/lib/reports/caption";

interface ConditionsUserPhotoProps {
  spotId: string;
  refreshKey?: number;
  onOpenReport?: (reportId: string) => void;
}

export function ConditionsUserPhoto({
  spotId,
  refreshKey = 0,
  onOpenReport,
}: ConditionsUserPhotoProps) {
  const [photo, setPhoto] = useState<UserReportGalleryItem | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(
        `/api/reports?spot_id=${encodeURIComponent(spotId)}&for_conditions=1&recent_hours=24`
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        selected: UserReportGalleryItem | null;
      };
      if (cancelled) return;
      setPhoto(data.selected);
      setLowConfidence(
        Boolean(
          data.selected?.notes.includes("low_image_confidence") ||
            (data.selected &&
              data.selected.imageContentConfidence < 0.6)
        )
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [spotId, refreshKey]);

  if (!photo) return null;

  return (
    <div className="conditions-user-photo">
      <button
        type="button"
        className="conditions-photo-btn"
        onClick={() => onOpenReport?.(photo.id)}
      >
        <img
          src={photo.thumbnailUrl}
          alt={`User photo at ${photo.spotName}`}
          className="conditions-photo-thumb"
        />
        <div className="conditions-photo-copy">
          <span className="conditions-photo-label">
            User photo — {photo.username}
            {lowConfidence && (
              <span className="badge low-confidence"> low confidence</span>
            )}
          </span>
          <p className="muted">
            {displayCaption(photo.normalizedCaption)}
          </p>
        </div>
      </button>
    </div>
  );
}
