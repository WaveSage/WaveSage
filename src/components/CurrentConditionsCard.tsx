"use client";

import type { SurfConditions } from "@/lib/types";
import { ConditionsUserPhoto } from "@/components/ConditionsUserPhoto";

interface CurrentConditionsCardProps {
  conditions: SurfConditions;
  reportsRefreshKey?: number;
  onOpenReport?: (reportId: string) => void;
}

export function CurrentConditionsCard({
  conditions,
  reportsRefreshKey = 0,
  onOpenReport,
}: CurrentConditionsCardProps) {
  const windDetail =
    conditions.windType !== "unknown"
      ? `${conditions.windDirectionLabel} · ${conditions.windType}`
      : conditions.windDirectionLabel;

  return (
    <div className="current-conditions-card">
      <h4>Current conditions — {conditions.spot.name}</h4>
      <p>{conditions.summary}</p>
      <div className="conditions-stats">
        <div className="stat">
          <span className="muted">Wave height</span>
          <strong>{conditions.waveHeightFt} ft</strong>
        </div>
        <div className="stat">
          <span className="muted">Period</span>
          <strong>{conditions.wavePeriodSec}s</strong>
        </div>
        <div className="stat">
          <span className="muted">Wind</span>
          <strong>{conditions.windSpeedMph} mph</strong>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {windDetail}
          </span>
        </div>
        {conditions.tide && (
          <div className="stat">
            <span className="muted">Tide (MLLW)</span>
            <strong>{conditions.tide.heightFt} ft</strong>
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              {conditions.tide.trend}
            </span>
          </div>
        )}
      </div>

      <ConditionsUserPhoto
        spotId={conditions.spot.id}
        refreshKey={reportsRefreshKey}
        onOpenReport={onOpenReport}
      />
    </div>
  );
}
