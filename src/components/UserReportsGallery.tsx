"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserReportGalleryItem } from "@/lib/reports/types";
import { displayCaption } from "@/lib/reports/caption";
import type { ReportNote } from "@/lib/reports/config";
import { SOCAL_SPOTS } from "@/lib/socal-spots";

function noteLabel(note: ReportNote): string {
  switch (note) {
    case "low_image_confidence":
      return "Low image confidence";
    case "gps_mismatch":
      return "GPS mismatch (device vs photo)";
    case "location_from_exif":
      return "Location from photo EXIF";
    default:
      return note;
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface UserReportsGalleryProps {
  refreshKey?: number;
  highlightReportId?: string | null;
  /** When set, only load reports for this spot (guest Trestles preview). */
  spotId?: string;
  readOnly?: boolean;
}

export function UserReportsGallery({
  refreshKey = 0,
  highlightReportId = null,
  spotId,
  readOnly = false,
}: UserReportsGalleryProps) {
  const [reports, setReports] = useState<UserReportGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSpotId, setFilterSpotId] = useState(spotId ?? "");

  useEffect(() => {
    setFilterSpotId(spotId ?? "");
  }, [spotId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ recent_hours: "168" });
      if (spotId) params.set("spot_id", spotId);
      const response = await fetch(`/api/reports?${params.toString()}`);
      const raw = await response.text();
      let data: { reports?: UserReportGalleryItem[]; error?: string };
      try {
        data = JSON.parse(raw) as {
          reports?: UserReportGalleryItem[];
          error?: string;
        };
      } catch {
        throw new Error("Could not load reports. Please refresh the page.");
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load reports.");
      }
      setReports(data.reports ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  const visibleReports = useMemo(() => {
    if (spotId || !filterSpotId) return reports;
    return reports.filter((report) => report.spotId === filterSpotId);
  }, [reports, spotId, filterSpotId]);

  const grouped = useMemo(() => {
    const groups: { spotId: string; spotName: string; items: UserReportGalleryItem[] }[] =
      [];
    const index = new Map<string, number>();
    for (const report of visibleReports) {
      const existing = index.get(report.spotId);
      if (existing == null) {
        index.set(report.spotId, groups.length);
        groups.push({
          spotId: report.spotId,
          spotName: report.spotName,
          items: [report],
        });
      } else {
        groups[existing].items.push(report);
      }
    }
    return groups;
  }, [visibleReports]);

  function renderCard(report: UserReportGalleryItem) {
    return (
      <article
        key={report.id}
        id={`report-${report.id}`}
        className={`report-card${highlightReportId === report.id ? " highlighted" : ""}`}
      >
        <img
          src={report.thumbnailUrl}
          alt={`User report at ${report.spotName}`}
          className="report-thumb"
        />
        <div className="report-body">
          <div className="report-top">
            <strong>{report.spotName}</strong>
            <span className="badge">accepted</span>
          </div>
          <p>{displayCaption(report.normalizedCaption)}</p>
          <p className="muted report-meta">
            {formatWhen(report.captureTimeUtc)} ·{" "}
            {report.distanceToSpotMiles.toFixed(1)} mi from break · confidence{" "}
            {Math.round(report.imageContentConfidence * 100)}%
          </p>
          {report.notes.length > 0 && (
            <ul className="report-notes">
              {report.notes.map((note) => (
                <li key={note}>{noteLabel(note)}</li>
              ))}
            </ul>
          )}
          <p className="muted report-source">
            User photo — {report.isOwn ? "you" : report.username}
          </p>
          {!readOnly && report.isOwn ? (
            <button
              type="button"
              className="report-delete-btn"
              onClick={() => void handleDelete(report.id)}
            >
              Delete my report
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  if (loading) {
    return <p className="muted">Loading user reports...</p>;
  }

  if (error) {
    return (
      <>
        <p className="muted">{error}</p>
        <button type="button" className="refresh-btn" onClick={() => void load()}>
          Retry
        </button>
      </>
    );
  }

  return (
    <div className="reports-gallery-wrap">
      {!spotId ? (
        <div className="reports-toolbar">
          <label className="reports-spot-filter">
            Filter by spot
            <select
              value={filterSpotId}
              onChange={(e) => setFilterSpotId(e.target.value)}
            >
              <option value="">All spots</option>
              {SOCAL_SPOTS.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted reports-toolbar-meta">
            {visibleReports.length} report{visibleReports.length === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}

      {!visibleReports.length ? (
        <p className="muted">
          {readOnly
            ? "No accepted Lower Trestles reports in the last week yet."
            : filterSpotId
              ? "No accepted reports for this spot yet. Submit a wave photo while you are at the break."
              : "No accepted reports yet. Submit a photo from Sage or this tab while at the break."}
        </p>
      ) : spotId ? (
        <div className="reports-gallery">{visibleReports.map(renderCard)}</div>
      ) : (
        <div className="reports-by-spot">
          {grouped.map((group) => (
            <section key={group.spotId} className="reports-spot-group">
              <h3 className="reports-spot-heading">
                {group.spotName}
                <span className="muted">
                  {" "}
                  · {group.items.length} report{group.items.length === 1 ? "" : "s"}
                </span>
              </h3>
              <div className="reports-gallery">{group.items.map(renderCard)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
