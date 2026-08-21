"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserReportGalleryItem } from "@/lib/reports/types";
import { displayCaption } from "@/lib/reports/caption";
import type { ReportNote } from "@/lib/reports/config";

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
}

export function UserReportsGallery({
  refreshKey = 0,
  highlightReportId = null,
}: UserReportsGalleryProps) {
  const [reports, setReports] = useState<UserReportGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reports?recent_hours=168");
      const data = (await response.json()) as {
        reports: UserReportGalleryItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load reports.");
      }
      setReports(data.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
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

  if (!reports.length) {
    return (
      <p className="muted">
        No accepted reports yet. Submit a photo from the Sage tab while at the
        break.
      </p>
    );
  }

  return (
    <div className="reports-gallery">
      {reports.map((report) => (
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
            {report.isOwn && (
              <button
                type="button"
                className="report-delete-btn"
                onClick={() => void handleDelete(report.id)}
              >
                Delete my report
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
