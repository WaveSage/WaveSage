"use client";

import { useCallback, useRef, useState } from "react";
import { SOCAL_SPOTS } from "@/lib/socal-spots";
import {
  displayCaption,
  validateCaption,
} from "@/lib/reports/caption";
import type { ReportSubmitResponse } from "@/lib/reports/types";

interface SubmitPhotoFlowProps {
  spotId: string;
  spotName: string;
  onSubmitted?: () => void;
  onViewReports?: () => void;
}

interface DeviceLocation {
  lat: number;
  lon: number;
  timestamp: string;
}

async function readDeviceLocation(): Promise<DeviceLocation> {
  if (!navigator.geolocation) {
    throw new Error(
      "Location is required. Enable location services and try again."
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timestamp: new Date(pos.timestamp).toISOString(),
        });
      },
      () => {
        reject(
          new Error(
            "Location is required. Enable location services and retake at the break."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  });
}

function clientFileChecks(file: File): string | null {
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return "Only JPEG or PNG photos are allowed.";
  }
  if (file.size > 8 * 1024 * 1024) {
    return "Photo is too large (max 8 MB).";
  }
  return null;
}

export function SubmitPhotoFlow({
  spotId,
  spotName,
  onSubmitted,
  onViewReports,
}: SubmitPhotoFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(
    null
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setCaption("");
    setDeviceLocation(null);
    setClientError(null);
    setSuccessMessage(null);
    setOpen(false);
  }, [previewUrl]);

  async function handlePick(selected: File) {
    setClientError(null);
    setSuccessMessage(null);

    const fileError = clientFileChecks(selected);
    if (fileError) {
      setClientError(fileError);
      return;
    }

    try {
      const location = await readDeviceLocation();
      setDeviceLocation(location);
    } catch (error) {
      setClientError(
        error instanceof Error ? error.message : "Location required."
      );
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
    setFile(selected);
    setOpen(true);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) void handlePick(selected);
    event.target.value = "";
  }

  async function handleSubmit() {
    if (!file || !deviceLocation) return;

    const captionCheck = validateCaption(caption);
    if (!captionCheck.ok) {
      setClientError(captionCheck.error ?? "Invalid caption.");
      return;
    }

    setSubmitting(true);
    setClientError(null);

    try {
      const form = new FormData();
      form.append("image_file", file);
      form.append("caption", captionCheck.normalized);
      form.append("spot_id", spotId);
      form.append("device_lat", String(deviceLocation.lat));
      form.append("device_lon", String(deviceLocation.lon));
      form.append("device_ts", deviceLocation.timestamp);

      const response = await fetch("/api/reports", {
        method: "POST",
        body: form,
      });

      const data = (await response.json()) as ReportSubmitResponse & {
        error?: string;
      };

      if (data.status === "rejected") {
        setClientError(data.user_message);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }

      setSuccessMessage(
        `Report submitted — thanks! Your photo and caption have been added for ${spotName}.`
      );
      onSubmitted?.();
    } catch (error) {
      setClientError(
        error instanceof Error ? error.message : "Could not submit report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const captionPreview = validateCaption(caption);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        hidden
        onChange={onFileChange}
      />
      <button
        type="button"
        className="submit-photo-btn"
        onClick={() => inputRef.current?.click()}
      >
        <svg
          className="submit-photo-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        User Wave Report
      </button>

      {open && (
        <div className="photo-modal-backdrop" role="dialog" aria-modal="true">
          <div className="photo-modal panel">
            <h3>Submit conditions photo</h3>
            <p className="muted">
              {spotName} · photo must be taken within 2 miles of the break
            </p>

            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview of surf conditions"
                className="photo-preview"
              />
            )}

            {successMessage ? (
              <>
                <p className="photo-success">{successMessage}</p>
                <div className="photo-modal-actions">
                  {onViewReports && (
                    <button type="button" onClick={onViewReports}>
                      View in Reports
                    </button>
                  )}
                  <button type="button" onClick={reset}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="photo-caption-label">
                  Caption (optional, max 140 chars)
                  <textarea
                    value={caption}
                    maxLength={160}
                    rows={3}
                    placeholder="Chest-high and clean, light offshore..."
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </label>
                <p className="muted photo-caption-meta">
                  {caption.length}/140 · {displayCaption(captionPreview.normalized)}
                </p>

                {clientError && <p className="photo-error">{clientError}</p>}

                <div className="photo-modal-actions">
                  <button type="button" onClick={reset} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit-photo-btn"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !captionPreview.ok}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function SpotPickerForPhoto({
  value,
  onChange,
}: {
  value: string;
  onChange: (spotId: string) => void;
}) {
  return (
    <label className="photo-spot-picker">
      Spot
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {SOCAL_SPOTS.map((spot) => (
          <option key={spot.id} value={spot.id}>
            {spot.name}
          </option>
        ))}
      </select>
    </label>
  );
}
