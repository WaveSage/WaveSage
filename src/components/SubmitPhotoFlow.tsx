"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOCAL_SPOTS, getSpotById } from "@/lib/socal-spots";
import { displayCaption, validateCaption } from "@/lib/reports/caption";
import { REPORT_CONFIG } from "@/lib/reports/config";
import { findNearestSpot, kmToMiles, haversineKm } from "@/lib/reports/location";
import {
  CONDITION_TAGS,
  CROWD_LEVELS,
  SURFACE_CONDITIONS,
  WAVE_QUALITY,
  WAVE_SIZES,
  type ConditionTag,
  type CrowdLevel,
  type SurfaceCondition,
  type WaveQuality,
  type WaveSize,
} from "@/lib/reports/structured";
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
      "Location is required to verify you are at the break. Enable location services and try again."
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
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        reject(
          new Error(
            denied
              ? "Location permission is required for spot verification. Enable it in Settings, then retry."
              : "Could not read your location. Enable location services and retry at the break."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 }
    );
  });
}

function clientFileChecks(file: File): string | null {
  const type = file.type.toLowerCase();
  if (type.startsWith("video/")) {
    return "Videos are not allowed. Take a still photo of the waves.";
  }
  if (type && !type.startsWith("image/") && type !== "application/octet-stream") {
    return "Only photos are allowed.";
  }
  if (file.size > 12 * 1024 * 1024) {
    return "Photo is too large (max 12 MB).";
  }
  return null;
}

async function fileToJpeg(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/png") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88)
    );
    bitmap.close();
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg") || "waves.jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

function milesToSpot(lat: number, lon: number, spotId: string): number | null {
  const spot = getSpotById(spotId);
  if (!spot) return null;
  return kmToMiles(haversineKm(lat, lon, spot.latitude, spot.longitude));
}

export function SubmitPhotoFlow({
  spotId,
  spotName,
  onSubmitted,
  onViewReports,
}: SubmitPhotoFlowProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [waveQuality, setWaveQuality] = useState<WaveQuality | null>(null);
  const [waveSize, setWaveSize] = useState<WaveSize | null>(null);
  const [surface, setSurface] = useState<SurfaceCondition | null>(null);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [tags, setTags] = useState<ConditionTag[]>([]);
  const [reportSpotId, setReportSpotId] = useState(spotId);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(
    null
  );
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationChecking, setLocationChecking] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setReportSpotId(spotId);
  }, [spotId]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setCaption("");
    setWaveQuality(null);
    setWaveSize(null);
    setSurface(null);
    setCrowd(null);
    setTags([]);
    setDeviceLocation(null);
    setLocationStatus(null);
    setLocationChecking(false);
    setClientError(null);
    setSuccessMessage(null);
    setReportSpotId(spotId);
    setOpen(false);
  }, [previewUrl, spotId]);

  async function applyLocation(location: DeviceLocation, preferredSpotId: string) {
    setDeviceLocation(location);
    const nearest = findNearestSpot(location.lat, location.lon);
    if (!nearest) {
      setLocationStatus(null);
      setClientError("Could not match your location to a WaveSage spot.");
      return;
    }

    if (nearest.miles <= REPORT_CONFIG.distanceThresholdMiles) {
      setReportSpotId(nearest.spot.id);
      setLocationStatus(
        `Spot verified: ${nearest.spot.name} (${nearest.miles.toFixed(1)} mi away).`
      );
      setClientError(null);
      return;
    }

    const chosenMiles = milesToSpot(location.lat, location.lon, preferredSpotId);
    setLocationStatus(
      `Closest listed break is ${nearest.spot.name} (${nearest.miles.toFixed(1)} mi). You must be within ${REPORT_CONFIG.distanceThresholdMiles} miles to submit.`
    );
    if (chosenMiles != null && chosenMiles > REPORT_CONFIG.distanceThresholdMiles) {
      setClientError(
        `Location is ${chosenMiles.toFixed(1)} miles from the selected spot. Walk to the break and retry location.`
      );
    }
  }

  async function refreshLocation(preferredSpotId: string) {
    setLocationChecking(true);
    setClientError(null);
    try {
      const location = await readDeviceLocation();
      await applyLocation(location, preferredSpotId);
    } catch (error) {
      setDeviceLocation(null);
      setLocationStatus(null);
      setClientError(
        error instanceof Error ? error.message : "Location required for spot verification."
      );
    } finally {
      setLocationChecking(false);
    }
  }

  async function handlePick(selected: File) {
    setClientError(null);
    setSuccessMessage(null);
    setCaption("");
    setWaveQuality(null);
    setWaveSize(null);
    setSurface(null);
    setCrowd(null);
    setTags([]);
    setDeviceLocation(null);
    setLocationStatus("Checking you are at the break…");
    setReportSpotId(spotId);

    const fileError = clientFileChecks(selected);
    if (fileError) {
      setClientError(fileError);
      setOpen(true);
      return;
    }

    const jpeg = await fileToJpeg(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(jpeg));
    setFile(jpeg);
    setOpen(true);

    await refreshLocation(spotId);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) void handlePick(selected);
    event.target.value = "";
  }

  const reportSpot = getSpotById(reportSpotId);
  const reportSpotName = reportSpot?.name ?? spotName;
  const distanceMiles =
    deviceLocation != null
      ? milesToSpot(deviceLocation.lat, deviceLocation.lon, reportSpotId)
      : null;
  const locationOk =
    distanceMiles != null &&
    distanceMiles <= REPORT_CONFIG.distanceThresholdMiles;

  async function handleSubmit() {
    if (!file) return;

    const captionCheck = validateCaption(caption);
    if (!captionCheck.ok) {
      setClientError(captionCheck.error ?? "Invalid caption.");
      return;
    }

    if (!waveQuality || !waveSize || !surface || !crowd) {
      setClientError("Tap quality, size, surface, and crowd before submitting.");
      return;
    }

    if (!deviceLocation || !locationOk) {
      setClientError(
        "Spot verification failed. Enable location at the break, then tap Retry location."
      );
      return;
    }

    setSubmitting(true);
    setClientError(null);

    try {
      const form = new FormData();
      form.append("image_file", file);
      form.append("caption", captionCheck.normalized);
      form.append("wave_quality", String(waveQuality ?? ""));
      form.append("wave_size", waveSize ?? "");
      form.append("surface", surface ?? "");
      form.append("crowd", crowd ?? "");
      form.append("tags", tags.join(","));
      form.append("spot_id", reportSpotId);
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
        `Report submitted. Your wave photo and conditions are saved under ${reportSpotName}.`
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
  function toggleTag(tag: ConditionTag) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }

  const canSubmit =
    Boolean(file) &&
    captionPreview.ok &&
    waveQuality != null &&
    waveSize != null &&
    surface != null &&
    crowd != null &&
    locationOk &&
    !submitting &&
    !locationChecking;

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFileChange}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileChange}
      />
      <button
        type="button"
        className="submit-photo-btn"
        onClick={() => cameraRef.current?.click()}
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
            <h3>Submit a wave report</h3>
            <p className="muted photo-hint">
              Photo must show the waves at the break — no selfies, parking lots,
              or people close-up. We verify you are within{" "}
              {REPORT_CONFIG.distanceThresholdMiles} miles of the spot.
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
                <label className="photo-spot-picker">
                  Spot
                  <select
                    value={reportSpotId}
                    onChange={(e) => setReportSpotId(e.target.value)}
                  >
                    {SOCAL_SPOTS.map((spot) => (
                      <option key={spot.id} value={spot.id}>
                        {spot.name}
                      </option>
                    ))}
                  </select>
                </label>

                <p className={`photo-location-status ${locationOk ? "ok" : ""}`}>
                  {locationChecking
                    ? "Checking GPS…"
                    : locationStatus ??
                      "Location is required to verify you are at this break."}
                  {distanceMiles != null
                    ? ` · ${distanceMiles.toFixed(1)} mi from ${reportSpotName}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="photo-retry-location"
                  onClick={() => void refreshLocation(reportSpotId)}
                  disabled={locationChecking || submitting}
                >
                  {locationChecking ? "Checking location…" : "Retry location"}
                </button>

                <div className="report-details">
                  <fieldset className="report-field">
                    <legend>Wave quality</legend>
                    <div className="report-quality" role="radiogroup" aria-label="Wave quality">
                      {WAVE_QUALITY.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`report-star${waveQuality != null && waveQuality >= item.value ? " selected" : ""}`}
                          aria-pressed={waveQuality === item.value}
                          title={`${item.value} — ${item.label}`}
                          onClick={() => setWaveQuality(item.value)}
                        >
                          <span aria-hidden>★</span>
                          <span className="report-star-n">{item.value}</span>
                        </button>
                      ))}
                    </div>
                    <p className="muted report-field-hint">
                      {waveQuality
                        ? `${waveQuality} — ${WAVE_QUALITY.find((item) => item.value === waveQuality)?.label}`
                        : "Tap a rating"}
                    </p>
                  </fieldset>

                  <fieldset className="report-field">
                    <legend>Wave size</legend>
                    <div className="report-choices">
                      {WAVE_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`report-chip${waveSize === size ? " selected" : ""}`}
                          aria-pressed={waveSize === size}
                          onClick={() => setWaveSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="report-field">
                    <legend>Wind / surface</legend>
                    <div className="report-choices">
                      {SURFACE_CONDITIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`report-chip${surface === option ? " selected" : ""}`}
                          aria-pressed={surface === option}
                          onClick={() => setSurface(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="report-field">
                    <legend>Crowd</legend>
                    <div className="report-choices">
                      {CROWD_LEVELS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`report-chip${crowd === option ? " selected" : ""}`}
                          aria-pressed={crowd === option}
                          onClick={() => setCrowd(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="report-field">
                    <legend>Quick tags (optional)</legend>
                    <div className="report-choices report-tags">
                      {CONDITION_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`report-pill${tags.includes(tag) ? " selected" : ""}`}
                          aria-pressed={tags.includes(tag)}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="photo-caption-label">
                    Optional note
                    <textarea
                      value={caption}
                      maxLength={REPORT_CONFIG.captionMaxLength}
                      rows={2}
                      placeholder="Clean sets every 10 minutes. Bigger than it looks from the beach."
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </label>
                  <p className="muted photo-caption-meta">
                    {caption.length}/{REPORT_CONFIG.captionMaxLength} · optional
                  </p>
                </div>

                {clientError && <p className="photo-error">{clientError}</p>}

                <div className="photo-modal-actions">
                  <button
                    type="button"
                    onClick={() => libraryRef.current?.click()}
                    disabled={submitting}
                  >
                    Choose photo
                  </button>
                  <button type="button" onClick={reset} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit-photo-btn"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                  >
                    {submitting ? "Submitting..." : "Submit report"}
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
