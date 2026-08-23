"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { SurfConditions, SurfSpot } from "@/lib/types";
import "leaflet/dist/leaflet.css";

function qualityColor(quality: SurfConditions["quality"]): string {
  switch (quality) {
    case "epic":
      return "#16a34a";
    case "good":
      return "#22c55e";
    case "fair":
      return "#ca8a04";
    default:
      return "#dc2626";
  }
}

function createSpotIcon(color: string, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "spots-map-marker",
    html: `<span class="spots-map-dot${selected ? " is-selected" : ""}" style="--spot-color:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

interface SpotsMapProps {
  spots: SurfSpot[];
  conditions: SurfConditions[];
  selectedSpotId: string;
  onSelectSpot: (spotId: string) => void;
}

export function SpotsMap({
  spots,
  conditions,
  selectedSpotId,
  onSelectSpot,
}: SpotsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onSelectRef = useRef(onSelectSpot);

  onSelectRef.current = onSelectSpot;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([33.45, -117.75], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    const bounds: L.LatLngTuple[] = [];

    const liveById = new Map(conditions.map((item) => [item.spot.id, item]));

    for (const spot of spots) {
      const lat = spot.latitude;
      const lng = spot.longitude;
      if (lat == null || lng == null) continue;

      const item = liveById.get(spot.id);
      const latlng: L.LatLngTuple = [lat, lng];
      bounds.push(latlng);

      const selected = spot.id === selectedSpotId;
      const marker = L.marker(latlng, {
        icon: createSpotIcon(
          item ? qualityColor(item.quality) : "#64748b",
          selected
        ),
        title: spot.name,
        keyboard: true,
      });

      const windLabel = item
        ? item.windType !== "unknown"
          ? `${item.windType} ${item.windDirectionLabel}`
          : item.windDirectionLabel
        : "live data loading";

      marker.bindPopup(
        item
          ? `<div class="spots-map-popup">
          <strong>${spot.name}</strong>
          <span class="spots-map-popup-quality ${item.quality}">${item.quality}</span>
          <p>${item.waveHeightFt} ft @ ${item.wavePeriodSec}s</p>
          <p>${windLabel} ${item.windSpeedMph} mph</p>
        </div>`
          : `<div class="spots-map-popup">
          <strong>${spot.name}</strong>
          <p>Live conditions loading…</p>
        </div>`
      );

      marker.on("click", () => {
        onSelectRef.current(spot.id);
        map.panTo(latlng, { animate: true });
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 });
    }
  }, [spots, conditions, selectedSpotId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSpotId) return;

    const selected = conditions.find((c) => c.spot.id === selectedSpotId);
    if (!selected?.spot.latitude || !selected.spot.longitude) return;

    map.panTo([selected.spot.latitude, selected.spot.longitude], {
      animate: true,
    });
  }, [selectedSpotId, conditions]);

  return (
    <div className="spots-map-shell">
      <div
        ref={containerRef}
        className="spots-map"
        role="application"
        aria-label="Interactive map of Southern California surf spots"
      />
      <ul className="spots-map-legend" aria-label="Surf quality legend">
        <li>
          <span className="legend-dot epic" /> Epic
        </li>
        <li>
          <span className="legend-dot good" /> Good
        </li>
        <li>
          <span className="legend-dot fair" /> Fair
        </li>
        <li>
          <span className="legend-dot poor" /> Poor
        </li>
      </ul>
    </div>
  );
}
