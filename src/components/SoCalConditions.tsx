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
  /** Guests can view current conditions but not multi-day forecast. */
  guestMode?: boolean;
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
  guestMode = false,
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
    if (guestMode) {
      setSpotForecast(null);
      setForecastError(null);
      setForecastLoading(false);
      return;
    }
    if (expandedSpotId) {
      void loadSpotForecast(expandedSpotId);
    } else {
      setSpotForecast(null);
      setForecastError(null);
    }
  }, [expandedSpotId, loadSpotForecast, guestMode]);

  const handleMapSelect = useCallback(
    (spotId: string) => {
      const live = forecast?.conditions.find((c) => c.spot.id === spotId);
      const catalog = SOCAL_SPOTS.find((spot) => spot.id === spotId);
      if (live) {
        onSelectSpot(live.spot);
      } else if (catalog) {
        onSelectSpot(catalog);
      }
      setExpandedSpotId(spotId);
    },
    [forecast?.conditions, onSelectSpot]
  );

  const liveCount = forecast?.conditions.length ?? 0;
  const selected =
    forecast?.conditions.find((c) => c.spot.id === expandedSpotId) ??
    forecast?.conditions.find((c) => c.spot.id === selectedSpotId) ??
    null;
  const best = forecast?.conditions[0] ?? null;

  if (error && !forecast) {
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

  return (
    <section className="panel socal-panel">
      <div className="socal-header">
        <div>
          <h2>Spots — Live</h2>
          <p className="muted">
            {liveCount
              ? `${liveCount} beaches with live data`
              : loading
                ? "Loading live conditions across SoCal beaches…"
                : `${SOCAL_SPOTS.length} beaches on the map`}
            {best ? (
              <>
                {" "}
                · Best right now: <strong>{best.spot.name}</strong> ({best.quality})
              </>
            ) : null}
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
        spots={SOCAL_SPOTS}
        conditions={forecast?.conditions ?? []}
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
              {!guestMode ? (
                <button
                  type="button"
                  className={`favorite-btn${favoriteSpotId === selected.spot.id ? " active" : ""}`}
                  onClick={() => onFavoriteSpot(selected.spot)}
                >
                  {favoriteSpotId === selected.spot.id
                    ? "★ Favorite"
                    : "☆ Set favorite"}
                </button>
              ) : (
                <a href="/login" className="favorite-btn guest-favorite-cta">
                  Sign in to favorite
                </a>
              )}
            </div>
          </div>

          <p className="socal-spot-stats">
            {selected.waveHeightFt} ft · {selected.wavePeriodSec}s · swell{" "}
            {selected.swellDirectionLabel} · {selected.windDirectionLabel}{" "}
            {selected.windSpeedMph} mph
            {selected.windType !== "unknown" ? ` · ${selected.windType}` : ""}
            {selected.waterTempF != null ? ` · water ${selected.waterTempF}°F` : ""}
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
            onOpenReport={guestMode ? undefined : onOpenReport}
            hideUserPhoto={guestMode}
          />

          {!guestMode ? (
            <SpotForecastPanel
              forecast={spotForecast}
              loading={forecastLoading}
              error={forecastError}
            />
          ) : (
            <p className="muted spots-forecast-locked">
              Multi-day forecast is available after you{" "}
              <a href="/login">sign in</a> or{" "}
              <a href="/signup">create an account</a>.
            </p>
          )}
        </div>
      ) : (
        <p className="muted spots-map-hint">
          {guestMode
            ? "Tap a pin on the map to see current conditions. Sign in for forecast and favorites."
            : "Tap a pin on the map to see conditions, forecast, and set your favorite spot for Sage."}
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
