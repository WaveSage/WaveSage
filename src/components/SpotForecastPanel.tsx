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
        {forecast.days.map((day) => {
          const periods = day.periods?.length
            ? day.periods
            : [
                {
                  id: "afternoon" as const,
                  label: "Afternoon",
                  hour: 13,
                  waveHeightFt: day.waveHeightFt,
                  wavePeriodSec: day.wavePeriodSec,
                  swellHeightFt: day.swellHeightFt,
                  swellPeriodSec: day.swellPeriodSec,
                  swellDirectionLabel: day.swellDirectionLabel,
                  windSpeedMph: day.windSpeedMph,
                  windDirectionLabel: day.windDirectionLabel,
                  windType: day.windType,
                  tideHeightFt: null as number | null,
                  tideTrend: null,
                  quality: day.quality,
                },
              ];

          return (
            <div key={day.date} className="forecast-day">
              <div className="forecast-day-top">
                <strong>{day.label}</strong>
                <span className={`badge ${day.quality}`}>{day.quality}</span>
              </div>
              <div className="forecast-periods">
                {periods.map((period) => (
                  <div key={period.id} className="forecast-period">
                    <div className="forecast-period-top">
                      <span>{period.label}</span>
                      <span className={`badge ${period.quality}`}>
                        {period.quality}
                      </span>
                    </div>
                    <p className="muted">
                      {period.waveHeightFt} ft @ {period.wavePeriodSec}s ·{" "}
                      {period.swellDirectionLabel}
                    </p>
                    <p className="muted">
                      Wind{" "}
                      {period.windSpeedMph < 8
                        ? "Calm"
                        : `${period.windDirectionLabel} ${period.windSpeedMph} mph`}
                      {period.windType !== "unknown" && period.windSpeedMph >= 8
                        ? ` · ${period.windType}`
                        : ""}
                      {period.tideHeightFt != null
                        ? ` · Tide ${period.tideHeightFt} ft ${period.tideTrend ?? ""}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
