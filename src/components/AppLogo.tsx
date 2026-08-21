"use client";

import { useState } from "react";

interface AppLogoProps {
  /** File in /public — e.g. "/logo.jpg" */
  src?: string;
  alt?: string;
  height?: number;
  /** When the image is missing, render the app name as a heading */
  asHeading?: boolean;
}

export function AppLogo({
  src = "/logo.png",
  alt = "WaveSage",
  height = 140,
  asHeading = false,
}: AppLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    if (!asHeading) return null;
    return <h1 className="app-logo-wordmark">{alt}</h1>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="app-logo"
      style={{ height: `${height}px`, width: "auto" }}
      onError={() => setFailed(true)}
    />
  );
}
