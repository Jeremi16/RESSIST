// Native Google sign-in (Capacitor Android) — Phase 4 scaffolding.
//
// Flow: OS account picker -> serverAuthCode -> POST /v1/auth/google/native
// (backend exchanges it, same as web OAuth). Google tokens stay server-side.
//
// This module never breaks the web build: the plugin is loaded via dynamic
// import, and without VITE_GOOGLE_WEB_CLIENT_ID (+ Android OAuth client +
// SHA-1 in Google Cloud) it throws NATIVE_AUTH_NOT_CONFIGURED with a clear
// message instead of failing silently.

import { isNative } from "@/src/lib/platform";

export const NATIVE_AUTH_NOT_CONFIGURED = "native_auth_not_configured";

const BASIC_SCOPES = ["profile", "email", "openid"];

function webClientId(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return (env?.VITE_GOOGLE_WEB_CLIENT_ID ?? "").trim();
}

/** Returns a single-use serverAuthCode for the backend native endpoint. */
export async function signInWithGoogleNative(): Promise<string> {
  if (!isNative()) throw new Error("signInWithGoogleNative is native-only");
  const clientId = webClientId();
  if (!clientId) throw new Error(NATIVE_AUTH_NOT_CONFIGURED);

  const mod = await import("@codetrix-studio/capacitor-google-auth");
  const { GoogleAuth } = mod as unknown as {
    GoogleAuth: {
      initialize: (opts: { clientId: string; scopes: string[]; grantOfflineAccess: boolean }) => void;
      signIn: () => Promise<{ serverAuthCode?: string }>;
      signOut: () => Promise<unknown>;
    };
  };

  GoogleAuth.initialize({ clientId, scopes: BASIC_SCOPES, grantOfflineAccess: true });
  const user = await GoogleAuth.signIn();
  const code = (user?.serverAuthCode ?? "").trim();
  if (!code) {
    throw new Error(
      "missing serverAuthCode — check plugins.GoogleAuth.serverClientId in capacitor.config.js " +
        "and the Android OAuth client (package + SHA-1) in Google Cloud Console",
    );
  }
  return code;
}

/** Best-effort native Google sign-out (Ressist session revoke is separate). */
export async function signOutNative(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import("@codetrix-studio/capacitor-google-auth");
    await mod.GoogleAuth.signOut();
  } catch {
    // best effort — local session clear still happens in api-client
  }
}
