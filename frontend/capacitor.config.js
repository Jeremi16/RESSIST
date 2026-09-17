// Capacitor shell for the Ressist Android app (Phase 3).
// Web build output (dist/) is reused as-is; native API auth goes through
// src/lib/api-client.ts (Bearer) instead of the BFF cookie proxy.
// Plain JS config (not TS) so the Capacitor CLI never needs a TS loader.

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "id.ac.itera.ressist",
  appName: "Ressist",
  webDir: "dist",
  server: {
    // https scheme avoids mixed-content blocks for Moodle ICS assets.
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: [
        "profile",
        "email",
        "openid",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
        "https://www.googleapis.com/auth/classroom.course-work.readonly",
      ],
      // Web OAuth client ID (same as backend GOOGLE_CLIENT_ID).
      // Set VITE_GOOGLE_WEB_CLIENT_ID at sync time, or replace the placeholder.
      // The ID itself is public; the secret stays server-side.
      serverClientId:
        process.env.VITE_GOOGLE_WEB_CLIENT_ID || "REPLACE_WITH_WEB_CLIENT_ID",
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#F5F0EB",
    },
    StatusBar: {
      // Light = dark content on light background (matches #F5F0EB).
      style: "light",
      backgroundColor: "#F5F0EB",
    },
  },
};

module.exports = config;
