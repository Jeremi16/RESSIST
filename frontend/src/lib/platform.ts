// Platform detection: web vs Capacitor native (Android).
// No hard import of @capacitor/* so web build never breaks when
// Capacitor deps are not installed yet (Phase 3).

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

/** True inside the Capacitor Android shell (WebView), false in browser. */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.Capacitor?.isNativePlatform) return window.Capacitor.isNativePlatform();
    const p = window.Capacitor?.getPlatform?.();
    if (p === "android" || p === "ios") return true;
  } catch {
    // ignore — fail closed to web behaviour
  }
  return false;
}

/** Backend base URL for native. Web uses relative /api (BFF proxy). */
export function getNativeApiBase(): string {
  const raw =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_API_URL ?? "";
  return raw.replace(/\/+$/, "");
}
