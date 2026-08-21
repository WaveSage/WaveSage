import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WaveSage native shell (Capacitor).
 *
 * This Next.js app uses API routes (chat, conditions, auth), so the mobile
 * WebView loads your *hosted* WaveSage URL — it is not a static export.
 *
 * Set CAPACITOR_SERVER_URL to your deploy (e.g. https://wavesage.example.com)
 * or your LAN IP for local testing (e.g. http://192.168.1.67:3000).
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || "http://192.168.1.67:3000";

const config: CapacitorConfig = {
  appId: "com.wavesage.app",
  appName: "WaveSage",
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b1c2c",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b1c2c",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
