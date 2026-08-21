"use client";

import type { SpotForecast } from "@/lib/types";

interface SpotForecastPanelProps {
  forecast: SpotForecast | null;
  loading: boolean;
  error: string | null;
}

export function SpotForecastPanel({
  forecast,
  loading,
  error,
}: SpotForecastPanelProps) {
  if (loading) {
    return <p className="muted spot-forecast">Loading 5-day forecast...</p>;
  }

  if (error) {
    return <p className="muted spot-forecast">{error}</p>;
  }

  if (!forecast?.days.length) return null;

  return (
    <div className="spot-forecast">
      <h4>5-day forecast — {forecast.spot.name}</h4>
      <div className="forecast-grid">
        {forecast.days.map((day) => (
          <div key={day.date} className="forecast-day">
            <div className="forecast-day-top">
              <strong>{day.label}</strong>
              <span className={`badge ${day.quality}`}>{day.quality}</span>
            </div>
            <p className="muted">
              {day.waveHeightFt} ft @ {day.wavePeriodSec}s
            </p>
            <p className="muted">
              Swell {day.swellHeightFt} ft {day.swellDirectionLabel} · Wind{" "}
              {day.windDirectionLabel} {day.windSpeedMph} mph
              {day.windType !== "unknown" ? ` · ${day.windType}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
