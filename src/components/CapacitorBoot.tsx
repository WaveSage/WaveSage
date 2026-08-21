"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Native shell polish when running inside Capacitor (iOS / Android).
 * No-ops in the browser.
 */
export function CapacitorBoot() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function boot() {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (!cancelled) {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#0b1c2c" });
        }
      } catch {
        // plugin may be unavailable outside a native build
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        if (!cancelled) await SplashScreen.hide();
      } catch {
        // ignore
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
