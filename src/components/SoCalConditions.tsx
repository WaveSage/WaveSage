"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RegionalForecast, SpotForecast, SurfConditions, SurfSpot } from "@/lib/types";
import { SOCAL_SPOTS } from "@/lib/socal-spots";
import { SpotForecastPanel } from "@/components/SpotForecastPanel";
import { CurrentConditionsCard } from "@/components/CurrentConditionsCard";

const SpotsMap = dynamic(
  () => import("@/components/SpotsMap").then((mod) => mod.SpotsMap),
  {
    ssr: false,
    loading: () => (
      <div className="spots-map spots-map-loading">
        <p className="muted">Loading map…</p>
      </div>
    ),
  }
);

interface SoCalConditionsProps {
  forecast: RegionalForecast | null;
  loading: boolean;
  error: string | null;
  selectedSpotId: string;
  favoriteSpotId: string | null;
  reportsRefreshKey?: number;
  onSelectSpot: (spot: SurfSpot) => void;
  onFavoriteSpot: (spot: SurfSpot) => void;
  onRefresh: () => void;
  onOpenReport?: (reportId: string) => void;
}

export function SoCalConditions({
  forecast,
  loading,
  error,
  selectedSpotId,
  favoriteSpotId,
  onSelectSpot,
  onFavoriteSpot,
  onRefresh,
  reportsRefreshKey = 0,
  onOpenReport,
}: SoCalConditionsProps) {
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);
  const [spotForecast, setSpotForecast] = useState<SpotForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const loadSpotForecast = useCallback(async (spotId: string) => {
    setForecastLoading(true);
    setForecastError(null);

    try {
      const response = await fetch(`/api/conditions/forecast?spotId=${spotId}`);
      const data = (await response.json()) as SpotForecast & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Forecast failed");
      }
      setSpotForecast(data);
    } catch (err) {
      setSpotForecast(null);
      setForecastError(
        err instanceof Error ? err.message : "Could not load forecast."
      );
    } finally {
      setForecastLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expandedSpotId) {
      loadSpotForecast(expandedSpotId);
    } else {
      setSpotForecast(null);
      setForecastError(null);
    }
  }, [expandedSpotId, loadSpotForecast]);

  const handleMapSelect = useCallback(
    (spotId: string) => {
      const item = forecast?.conditions.find((c) => c.spot.id === spotId);
      if (!item) return;
      onSelectSpot(item.spot);
      setExpandedSpotId(spotId);
    },
    [forecast?.conditions, onSelectSpot]
  );

  if (loading && !forecast) {
    return (
      <section className="panel socal-panel">
        <h2>Spots</h2>
        <p className="muted">Loading live conditions across SoCal beaches…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel socal-panel">
        <h2>Spots</h2>
        <p className="muted">{error}</p>
        <button type="button" onClick={onRefresh} className="refresh-btn">
          Retry
        </button>
      </section>
    );
  }

  if (!forecast?.conditions.length) return null;

  const best = forecast.conditions[0];
  const selected =
    forecast.conditions.find((c) => c.spot.id === expandedSpotId) ??
    forecast.conditions.find((c) => c.spot.id === selectedSpotId) ??
    null;

  return (
    <section className="panel socal-panel">
      <div className="socal-header">
        <div>
          <h2>Spots — Live</h2>
          <p className="muted">
            {forecast.conditions.length} beaches on the map · Best right now:{" "}
            <strong>{best.spot.name}</strong> ({best.quality})
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>

      <SpotsMap
        conditions={forecast.conditions}
        selectedSpotId={expandedSpotId ?? selectedSpotId}
        onSelectSpot={handleMapSelect}
      />

      {selected ? (
        <div className="spots-detail-panel">
          <div className="spots-detail-header">
            <div>
              <h3>{selected.spot.name}</h3>
              <p className="muted spots-detail-region">{selected.spot.region}</p>
            </div>
            <div className="spots-detail-badges">
              <span className={`badge ${selected.quality}`}>
                {selected.quality}
              </span>
              <button
                type="button"
                className={`favorite-btn${favoriteSpotId === selected.spot.id ? " active" : ""}`}
                onClick={() => onFavoriteSpot(selected.spot)}
              >
                {favoriteSpotId === selected.spot.id
                  ? "★ Favorite"
                  : "☆ Set favorite"}
              </button>
            </div>
          </div>

          <p className="socal-spot-stats">
            {selected.waveHeightFt} ft · {selected.wavePeriodSec}s · swell{" "}
            {selected.swellDirectionLabel} · {selected.windDirectionLabel}{" "}
            {selected.windSpeedMph} mph
            {selected.windType !== "unknown" ? ` · ${selected.windType}` : ""}
            {selected.spotTransform
              ? ` · ${selected.spotTransform.breakType} · swell ${selected.spotTransform.swellFit}`
              : ""}
          </p>

          {selected.spotTransform &&
            Math.abs(
              selected.spotTransform.modelWaveHeightFt - selected.waveHeightFt
            ) >= 0.3 && (
              <p className="muted socal-spot-adjust">
                Model {selected.spotTransform.modelWaveHeightFt} ft → spot{" "}
                {selected.waveHeightFt} ft
              </p>
            )}

          <CurrentConditionsCard
            conditions={selected}
            reportsRefreshKey={reportsRefreshKey}
            onOpenReport={onOpenReport}
          />
          <SpotForecastPanel
            forecast={spotForecast}
            loading={forecastLoading}
            error={forecastError}
          />
        </div>
      ) : (
        <p className="muted spots-map-hint">
          Tap a pin on the map to see conditions, forecast, and set your
          favorite spot for Sage.
        </p>
      )}

      <p className="muted socal-footnote">
        Pin colors reflect surf quality. Heights are spot-adjusted for swell
        angle, break type, and structure — not just raw model readings.
      </p>
    </section>
  );
}

export function getDefaultSelectedSpotId(): string {
  return SOCAL_SPOTS.find((s) => s.id === "hermosa")?.id ?? SOCAL_SPOTS[0].id;
}
