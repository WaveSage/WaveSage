"use client";

import type { SurfConditions } from "@/lib/types";

interface ConditionsCardProps {
  conditions: SurfConditions | null;
}

function tideTrendLabel(trend: string): string {
  return trend.charAt(0).toUpperCase() + trend.slice(1);
}

export function ConditionsCard({ conditions }: ConditionsCardProps) {
  if (!conditions) {
    return (
      <section>
        <h2>Conditions</h2>
        <p className="muted">
          Ask about the waves to load live conditions for your spot.
        </p>
      </section>
    );
  }

  const windDetail =
    conditions.windType !== "unknown"
      ? `${conditions.windDirectionLabel} · ${conditions.windType}`
      : conditions.windDirectionLabel;

  return (
    <section>
      <h2>
        {conditions.spot.name}
        {conditions.spot.region ? (
          <span className="muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>
            {" "}
            · {conditions.spot.region}
          </span>
        ) : null}{" "}
        <span className={`badge ${conditions.quality}`}>{conditions.quality}</span>
      </h2>
      <p>{conditions.summary}</p>
      {conditions.spotTransform && (
        <p className="muted spot-transform-note">
          <strong>Spot-adjusted forecast</strong> ({conditions.spotTransform.breakType}{" "}
          break · swell fit: {conditions.spotTransform.swellFit}) — model{" "}
          {conditions.spotTransform.modelWaveHeightFt} ft →{" "}
          <strong>{conditions.waveHeightFt} ft</strong> at the beach.{" "}
          {conditions.spotTransform.note}
        </p>
      )}
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
        <div className="stat">
          <span className="muted">Swell</span>
          <strong>
            {conditions.swellHeightFt} ft @ {conditions.swellPeriodSec}s
          </strong>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {conditions.swellDirectionLabel}
          </span>
        </div>
        {conditions.tide && (
          <>
            <div className="stat">
              <span className="muted">Tide (MLLW)</span>
              <strong>{conditions.tide.heightFt} ft</strong>
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {tideTrendLabel(conditions.tide.trend)}
              </span>
            </div>
            <div className="stat">
              <span className="muted">Tide station</span>
              <strong style={{ fontSize: "0.9rem" }}>
                {conditions.tide.stationName}
              </strong>
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                {conditions.tide.stationDistanceKm} km away
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
