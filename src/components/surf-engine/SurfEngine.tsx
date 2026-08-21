"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  HourlySurfPoint,
  StyleOutlook,
  SurfConditions,
  SurfSpot,
} from "@/lib/types";
import type { UserProfile } from "@/lib/auth/types";
import { STYLE_LABELS } from "@/lib/auth/types";
import { SOCAL_SPOTS } from "@/lib/socal-spots";
import { getSpotProfile } from "@/lib/spot-profiles/profiles";
import { SubmitPhotoFlow } from "@/components/SubmitPhotoFlow";
import {
  atmosphereFromConditions,
  buildScoreBreakdown,
  findBestWindow,
  formatHeightRange,
  goSignal,
  goSignalLabel,
  qualityLabel,
  recommendBoard,
  windTypeHeadline,
} from "@/lib/surf-engine/score";

interface FavoriteSnapshot {
  spot: SurfSpot;
  waveHeightFt?: number;
  quality?: SurfConditions["quality"];
}

interface SurfEngineProps {
  user: UserProfile;
  conditions: SurfConditions | null;
  styleOutlook: StyleOutlook | null;
  sageSpotId: string;
  selectedSpotIds: string[];
  regionalSnapshots?: FavoriteSnapshot[];
  briefingLoading?: boolean;
  reportsRefreshKey?: number;
  guestMode?: boolean;
  onSelectSpot: (spotId: string) => void;
  onEditSpots?: () => void;
  onReportSubmitted?: () => void;
  onViewReports?: () => void;
}

interface LastCheckSnapshot {
  spotId: string;
  waveHeightFt: number;
  windSpeedMph: number;
  wavePeriodSec: number;
  tideHeightFt: number | null;
  savedAt: string;
}

function qualityTone(q: SurfConditions["quality"]): string {
  return `quality-${q}`;
}

function ScoreBars({
  breakdown,
}: {
  breakdown: ReturnType<typeof buildScoreBreakdown>;
}) {
  const rows: { label: string; value: number }[] = [
    { label: "Wave Quality", value: breakdown.wave },
    { label: "Wind", value: breakdown.wind },
    { label: "Swell", value: breakdown.swell },
    { label: "Tide", value: breakdown.tide },
  ];
  return (
    <div className="se-score-bars">
      {rows.map((row) => (
        <div key={row.label} className="se-score-row">
          <span>{row.label}</span>
          <div className="se-score-track">
            <div
              className="se-score-fill"
              style={{ width: `${Math.min(100, row.value * 10)}%` }}
            />
          </div>
          <strong>{row.value.toFixed(1)}</strong>
        </div>
      ))}
    </div>
  );
}

function TideCurve({
  points,
  preferred,
}: {
  points: HourlySurfPoint[];
  preferred: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const fillId = useId().replace(/:/g, "");
  const [scrubIdx, setScrubIdx] = useState(0);

  const tides = useMemo(
    () =>
      points
        .map((p) => ({ h: p.tideHeightFt, label: p.label, trend: p.tideTrend }))
        .filter(
          (p): p is { h: number; label: string; trend: HourlySurfPoint["tideTrend"] } =>
            p.h != null
        ),
    [points]
  );

  useEffect(() => {
    setScrubIdx(0);
  }, [tides]);

  const w = 280;
  const h = 88;
  const pad = 8;

  const geometry = useMemo(() => {
    if (tides.length < 2) return null;
    const max = Math.max(...tides.map((t) => t.h), 1);
    const min = Math.min(...tides.map((t) => t.h), 0);
    const span = Math.max(0.5, max - min);
    const coords = tides.map((t, idx) => {
      const x = pad + (idx / (tides.length - 1)) * (w - pad * 2);
      const y = h - pad - ((t.h - min) / span) * (h - pad * 2);
      return { x, y, ...t };
    });
    return { max, min, span, coords };
  }, [tides]);

  const sampleAt = useCallback(
    (idx: number) => {
      if (!geometry || tides.length === 0) return null;
      const clamped = Math.max(0, Math.min(tides.length - 1, idx));
      const i0 = Math.floor(clamped);
      const i1 = Math.min(tides.length - 1, i0 + 1);
      const t = clamped - i0;
      const a = geometry.coords[i0];
      const b = geometry.coords[i1];
      const height = a.h + (b.h - a.h) * t;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const label = t < 0.5 ? a.label : b.label;
      let trend: string = a.trend ?? "steady";
      if (i1 > i0) {
        if (b.h > a.h + 0.05) trend = "rising";
        else if (b.h < a.h - 0.05) trend = "falling";
      }
      return { height, x, y, label, trend, atNow: clamped < 0.05 };
    },
    [geometry, tides.length]
  );

  const scrub = sampleAt(scrubIdx);

  const clientToIdx = useCallback(
    (clientX: number) => {
      if (!svgRef.current || tides.length < 2) return 0;
      const rect = svgRef.current.getBoundingClientRect();
      const xSvg = ((clientX - rect.left) / rect.width) * w;
      const frac = (xSvg - pad) / (w - pad * 2);
      return Math.max(0, Math.min(tides.length - 1, frac * (tides.length - 1)));
    },
    [tides.length]
  );

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!geometry) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubIdx(clientToIdx(e.clientX));
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    setScrubIdx(clientToIdx(e.clientX));
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  if (!geometry || !scrub) {
    return <p className="se-muted">Tide curve loading…</p>;
  }

  const linePoints = geometry.coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${pad},${h - pad} ${linePoints} ${w - pad},${h - pad}`;

  return (
    <div className="se-tide-visual">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="se-tide-svg se-tide-svg-interactive"
        role="slider"
        aria-label="Scrub tide forecast"
        aria-valuemin={0}
        aria-valuemax={tides.length - 1}
        aria-valuenow={Math.round(scrubIdx)}
        aria-valuetext={`${scrub.label}, ${scrub.height.toFixed(1)} feet, ${scrub.trend}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setScrubIdx((v) => Math.min(tides.length - 1, v + 0.25));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setScrubIdx((v) => Math.max(0, v - 0.25));
          } else if (e.key === "Home") {
            e.preventDefault();
            setScrubIdx(0);
          }
        }}
      >
        <defs>
          <linearGradient id={`tideFill-${fillId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(62,198,224,0.35)" />
            <stop offset="100%" stopColor="rgba(62,198,224,0.02)" />
          </linearGradient>
        </defs>
        <polyline
          fill={`url(#tideFill-${fillId})`}
          stroke="none"
          points={areaPoints}
        />
        <polyline
          fill="none"
          stroke="rgba(126, 220, 236, 0.95)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          points={linePoints}
        />
        <circle
          className="se-tide-scrubber"
          cx={scrub.x}
          cy={scrub.y}
          r="7"
          fill="#f0c75e"
          stroke="#041018"
          strokeWidth="1.5"
        />
      </svg>
      <div className="se-tide-meta">
        <span className="se-tide-now">
          {scrub.atNow ? "Now" : scrub.label} · {scrub.height.toFixed(1)} ft
          MLLW · {scrub.trend}
        </span>
        <span className="se-chip">Drag ball forward</span>
        <span className="se-chip">Spot prefers {preferred}</span>
        {!scrub.atNow ? (
          <button
            type="button"
            className="se-tide-reset"
            onClick={() => setScrubIdx(0)}
          >
            Reset to now
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SurfEngine({
  user,
  conditions,
  styleOutlook,
  sageSpotId,
  selectedSpotIds,
  regionalSnapshots = [],
  briefingLoading,
  reportsRefreshKey = 0,
  guestMode = false,
  onSelectSpot,
  onEditSpots,
  onReportSubmitted,
  onViewReports,
}: SurfEngineProps) {
  const [hourly, setHourly] = useState<HourlySurfPoint[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [deltas, setDeltas] = useState<
    { label: string; value: string; up?: boolean }[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHourly() {
      setHourlyLoading(true);
      try {
        const res = await fetch(
          `/api/conditions/hourly?spotId=${encodeURIComponent(sageSpotId)}&hours=12`,
          { signal: AbortSignal.timeout(90_000) }
        );
        const data = (await res.json()) as {
          points?: HourlySurfPoint[];
          error?: string;
        };
        if (!cancelled && res.ok && data.points) {
          setHourly(data.points);
        }
      } catch {
        if (!cancelled) setHourly([]);
      } finally {
        if (!cancelled) setHourlyLoading(false);
      }
    }
    void loadHourly();
    return () => {
      cancelled = true;
    };
  }, [sageSpotId]);

  useEffect(() => {
    if (!conditions || typeof window === "undefined") return;
    const key = `wavesage-last-check:${conditions.spot.id}`;
    try {
      const raw = localStorage.getItem(key);
      const current: LastCheckSnapshot = {
        spotId: conditions.spot.id,
        waveHeightFt: conditions.waveHeightFt,
        windSpeedMph: conditions.windSpeedMph,
        wavePeriodSec: conditions.wavePeriodSec,
        tideHeightFt: conditions.tide?.heightFt ?? null,
        savedAt: new Date().toISOString(),
      };
      if (raw) {
        const prev = JSON.parse(raw) as LastCheckSnapshot;
        const next: { label: string; value: string; up?: boolean }[] = [];
        const dWave = current.waveHeightFt - prev.waveHeightFt;
        const dWind = current.windSpeedMph - prev.windSpeedMph;
        const dPeriod = current.wavePeriodSec - prev.wavePeriodSec;
        if (Math.abs(dWave) >= 0.3) {
          next.push({
            label: "Swell",
            value: `${dWave > 0 ? "+" : ""}${dWave.toFixed(1)} ft`,
            up: dWave > 0,
          });
        }
        if (Math.abs(dWind) >= 1) {
          next.push({
            label: "Wind",
            value: `${dWind > 0 ? "+" : ""}${Math.round(dWind)} mph`,
            up: dWind < 0,
          });
        }
        if (Math.abs(dPeriod) >= 1) {
          next.push({
            label: "Period",
            value: `${dPeriod > 0 ? "+" : ""}${Math.round(dPeriod)} sec`,
            up: dPeriod > 0,
          });
        }
        if (
          current.tideHeightFt != null &&
          prev.tideHeightFt != null &&
          Math.abs(current.tideHeightFt - prev.tideHeightFt) >= 0.2
        ) {
          const rising = current.tideHeightFt > prev.tideHeightFt;
          next.push({
            label: "Tide",
            value: rising ? "rising" : "falling",
            up: rising,
          });
        }
        setDeltas(next.length ? next : null);
      }
      localStorage.setItem(key, JSON.stringify(current));
    } catch {
      setDeltas(null);
    }
  }, [conditions]);

  const breakdown = useMemo(
    () =>
      conditions
        ? buildScoreBreakdown(conditions, styleOutlook?.style_fit_score)
        : null,
    [conditions, styleOutlook]
  );

  const board = useMemo(
    () =>
      conditions
        ? recommendBoard(conditions, user.stylePreference, styleOutlook)
        : null,
    [conditions, user.stylePreference, styleOutlook]
  );

  const windowRec = useMemo(() => findBestWindow(hourly), [hourly]);

  const favorites = useMemo(() => {
    const unique = Array.from(
      new Set((selectedSpotIds ?? []).filter((id) => typeof id === "string"))
    );
    const base = unique.slice(0, 5);
    const display =
      base.length === 0
        ? sageSpotId
          ? [sageSpotId]
          : []
        : base.includes(sageSpotId)
          ? base
          : base.length < 5
            ? [...base, sageSpotId]
            : [...base.slice(0, 4), sageSpotId];

    const list: FavoriteSnapshot[] = [];
    for (const spotId of display) {
      const spot = SOCAL_SPOTS.find((s) => s.id === spotId);
      if (!spot) continue;

      if (conditions && conditions.spot.id === spotId) {
        list.push({
          spot,
          waveHeightFt: conditions.waveHeightFt,
          quality: conditions.quality,
        });
        continue;
      }

      const snap = regionalSnapshots.find((r) => r.spot.id === spotId);
      list.push(snap ?? { spot });
    }
    return list;
  }, [selectedSpotIds, regionalSnapshots, sageSpotId, conditions]);

  if (briefingLoading && !conditions) {
    return (
      <div className="se-loading">
        <div className="se-pulse" />
        <p>Reading the ocean…</p>
      </div>
    );
  }

  if (!conditions || !breakdown) {
    return (
      <div className="se-loading">
        <p className="se-muted">Conditions unavailable. Refresh and try again.</p>
      </div>
    );
  }

  const mood = atmosphereFromConditions(conditions);
  const score = styleOutlook?.style_fit_score ?? breakdown.overall;
  const signal = goSignal(score, conditions.windType);
  const arrowRotation = conditions.swellDirectionDeg;
  const spotTidePref = getSpotProfile(conditions.spot.id).tidePreference;
  const bestIdx = windowRec
    ? hourly.findIndex((p) => p.label === windowRec.startLabel)
    : -1;

  return (
    <div className={`surf-engine mood-${mood}`}>
      <div className="se-atmosphere" aria-hidden />

      {!guestMode ? (
        <>
          <div className="se-rail-head">
            <span className="se-rail-title">Your 5 spots</span>
            {onEditSpots ? (
              <button
                type="button"
                className="se-edit-spots-btn"
                onClick={onEditSpots}
              >
                Edit
              </button>
            ) : null}
          </div>

          <div className="se-spot-rail" role="list">
            {favorites.map((fav) => {
              const active = fav.spot.id === sageSpotId;
              return (
                <button
                  key={fav.spot.id}
                  type="button"
                  role="listitem"
                  className={`se-spot-chip ${active ? "active" : ""}`}
                  onClick={() => onSelectSpot(fav.spot.id)}
                >
                  <span className="se-spot-chip-name">{fav.spot.name}</span>
                  <span className="se-spot-chip-meta">
                    {fav.waveHeightFt != null
                      ? `${fav.waveHeightFt} ft · ${fav.quality ?? "—"}`
                      : "Tap for live"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="se-guest-banner">
          Preview · Lower Trestles —{" "}
          <a href="/signup">Create an account</a> for your spots and reports.
        </p>
      )}

      <section className={`se-hero ${qualityTone(conditions.quality)}`}>
        <div className="se-hero-top">
          <div className="se-hero-heading">
            <p className="se-kicker">Surf snapshot</p>
            <h2 className="se-spot-name">{conditions.spot.name}</h2>
            <p className={`se-quality-line ${qualityTone(conditions.quality)}`}>
              {qualityLabel(conditions.quality)} — {score.toFixed(1)}/10
            </p>
          </div>
          {!guestMode ? (
            <div className="se-hero-report">
              <SubmitPhotoFlow
                key={`${conditions.spot.id}-${reportsRefreshKey}`}
                spotId={conditions.spot.id}
                spotName={conditions.spot.name}
                onSubmitted={onReportSubmitted}
                onViewReports={onViewReports}
              />
            </div>
          ) : (
            <a className="se-guest-signin-chip" href="/login">
              Sign in to report
            </a>
          )}
        </div>

        <div className="se-gauge">
          <div className="se-gauge-wrap">
            <div
              className="se-gauge-arc"
              style={{ ["--score" as string]: String(score) }}
            />
            <div className="se-gauge-core">
              <span className="se-gauge-num">{score.toFixed(1)}</span>
              <span className="se-gauge-label">
                {qualityLabel(conditions.quality)}
              </span>
            </div>
          </div>
          <div className="se-gauge-scale">
            <span>POOR</span>
            <span>FAIR</span>
            <span>GOOD</span>
            <span>EPIC</span>
          </div>
        </div>

        <p className="se-ai-blurb">
          {styleOutlook?.one_line_verdict ?? conditions.summary}
        </p>

        <div className="se-stat-grid">
          <div className="se-stat-row se-stat-row-2">
            <div className="se-stat">
              <span className="se-stat-icon" aria-hidden>
                ≈
              </span>
              <span className="se-stat-label">Wave height</span>
              <strong className="se-stat-value">
                {formatHeightRange(conditions.waveHeightFt)}
              </strong>
            </div>
            <div className="se-stat">
              <span className="se-stat-icon" aria-hidden>
                ↗
              </span>
              <span className="se-stat-label">Swell</span>
              <strong className="se-stat-value">
                {conditions.swellDirectionLabel} {conditions.swellDirectionDeg}°
              </strong>
              <span className="se-stat-sub">
                @ {conditions.swellPeriodSec || conditions.wavePeriodSec}s
              </span>
            </div>
          </div>
          <div className="se-stat-row se-stat-row-3">
            <div className="se-stat">
              <span className="se-stat-icon" aria-hidden>
                ∿
              </span>
              <span className="se-stat-label">Wind</span>
              <strong className="se-stat-value">
                {conditions.windSpeedMph} mph {conditions.windDirectionLabel}
              </strong>
              <span className="se-stat-sub">
                {windTypeHeadline(conditions.windType)}
              </span>
            </div>
            <div className="se-stat">
              <span className="se-stat-icon" aria-hidden>
                ⌇
              </span>
              <span className="se-stat-label">Tide</span>
              <strong className="se-stat-value">
                {conditions.tide ? `${conditions.tide.heightFt} ft` : "—"}
              </strong>
              <span className="se-stat-sub">
                {conditions.tide?.trend ?? "unavailable"}
              </span>
            </div>
            <div className="se-stat">
              <span className="se-stat-icon" aria-hidden>
                °
              </span>
              <span className="se-stat-label">Water temp</span>
              <strong className="se-stat-value">
                {conditions.waterTempF != null ? `${conditions.waterTempF}°F` : "—"}
              </strong>
              <span className="se-stat-sub">sea surface</span>
            </div>
          </div>
        </div>
      </section>

      {deltas && deltas.length > 0 ? (
        <section className="se-card se-changed">
          <h3>Since your last check</h3>
          <div className="se-changed-row">
            {deltas.map((d) => (
              <span
                key={d.label}
                className={`se-delta ${d.up ? "up" : "down"}`}
              >
                {d.up ? "↑" : "↓"} {d.label} {d.value}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`se-card se-sage-take se-sage-take-${signal}`}>
        <div className="se-sage-ocean" aria-hidden>
          <div className="se-sage-swell se-sage-swell-a" />
          <div className="se-sage-swell se-sage-swell-b" />
          <div className="se-sage-sheen" />
        </div>
        <div className="se-sage-content">
          <div className="se-sage-head">
            <h3>Sage&apos;s take</h3>
            <span className={`se-go se-go-${signal}`}>
              {goSignalLabel(signal)}
            </span>
          </div>
          <p className="se-sage-copy">
            {styleOutlook?.conditions_for_style ??
              styleOutlook?.simple_explanation ??
              conditions.summary}
          </p>
          {styleOutlook?.style_specific_feedback ? (
            <p className="se-sage-advice">
              {styleOutlook.style_specific_feedback}
            </p>
          ) : null}
          {windowRec ? (
            <p className="se-best-window">
              Best window:{" "}
              <strong>
                {windowRec.startLabel}–{windowRec.endLabel}
              </strong>
            </p>
          ) : null}
          <p className="se-style-tag">
            Tuned for {STYLE_LABELS[user.stylePreference].toLowerCase()}
          </p>
        </div>
      </section>

      <section className="se-card se-timeline">
        <div className="se-section-head">
          <h3>Hour-by-hour</h3>
          {windowRec ? (
            <span className="se-best-pill">
              Best {windowRec.startLabel}–{windowRec.endLabel}
            </span>
          ) : null}
        </div>
        {hourlyLoading && !hourly.length ? (
          <p className="se-muted">Building the session timeline…</p>
        ) : (
          <div className="se-timeline-scroll">
            {hourly.map((point, idx) => {
              const inBest =
                bestIdx >= 0 && idx >= bestIdx && idx < bestIdx + 3;
              return (
                <div
                  key={`${point.dateKey}-${point.hour}`}
                  className={`se-hour ${inBest ? "best" : ""}`}
                >
                  <span className="se-hour-time">{point.label}</span>
                  <strong className="se-hour-size">
                    {point.waveHeightFt} ft
                  </strong>
                  <span className="se-hour-wind">
                    {point.windSpeedMph} {point.windDirectionLabel}
                  </span>
                  <span className={`se-hour-windtype ${point.windType}`}>
                    {windTypeHeadline(point.windType)}
                  </span>
                  <span className="se-hour-tide">
                    {point.tideHeightFt != null
                      ? `${point.tideHeightFt} ft tide`
                      : "—"}
                  </span>
                  <span className={`se-hour-quality ${point.quality}`}>
                    {point.quality}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="se-split">
        <section className="se-card se-swell">
          <h3>Primary swell</h3>
          <div className="se-swell-body">
            <div
              className="se-swell-arrow"
              style={{ transform: `rotate(${arrowRotation}deg)` }}
              aria-hidden
            >
              ↑
            </div>
            <div>
              <p className="se-swell-dir">{conditions.swellDirectionLabel}</p>
              <p className="se-swell-nums">
                {conditions.swellHeightFt} ft @{" "}
                {conditions.swellPeriodSec || conditions.wavePeriodSec}s
              </p>
              <p className="se-muted">
                Fit {conditions.spotTransform?.swellFit ?? "—"} ·{" "}
                {conditions.spotTransform?.breakType ?? "beach"}
              </p>
            </div>
          </div>
          {conditions.spotTransform?.note ? (
            <p className="se-swell-note">{conditions.spotTransform.note}</p>
          ) : null}
        </section>

        <section className="se-card se-wind">
          <h3>Wind</h3>
          <p className={`se-wind-headline ${conditions.windType}`}>
            {windTypeHeadline(conditions.windType)}
          </p>
          <p className="se-wind-nums">
            {conditions.windSpeedMph} mph {conditions.windDirectionLabel}
          </p>
          <div className="se-wind-arrows" aria-hidden>
            <span className="se-wind-particle" />
            <span className="se-wind-particle delay" />
            <span className="se-wind-particle delay2" />
          </div>
          <p className="se-muted">
            {conditions.windType === "offshore"
              ? "Holding faces open — look for clean lines."
              : conditions.windType === "onshore"
                ? "Expect texture and softer sections."
                : conditions.windType === "cross-shore"
                  ? "Sideshore texture — pick protected peaks."
                  : "Wind direction is mixed — recheck before you paddle."}
          </p>
        </section>
      </div>

      <section className="se-card se-tide">
        <h3>Tide</h3>
        {!conditions.tide ? (
          <p className="se-tide-now">Tide unavailable</p>
        ) : null}
        <TideCurve points={hourly} preferred={`${spotTidePref} tide`} />
      </section>

      {board ? (
        <section className="se-card se-board">
          <h3>What to ride</h3>
          <p className="se-board-label">
            {board.fromQuiver ? "From your quiver" : "Recommended"}
          </p>
          <p className="se-board-name">{board.label}</p>
          <p className="se-muted">{board.why}</p>
        </section>
      ) : null}

      <section className="se-card se-breakdown">
        <h3>Surf score — {breakdown.overall.toFixed(1)}</h3>
        <ScoreBars breakdown={breakdown} />
      </section>
    </div>
  );
}
