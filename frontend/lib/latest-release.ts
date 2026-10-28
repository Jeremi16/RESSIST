import { useEffect, useState } from "react";

// Satu sumber data rilis Android untuk /app dan /faq/android (sama dengan
// update-checker HP). Hasil di-cache di sessionStorage + dibagi antar halaman
// agar tidak tiap page view memakan rate limit GitHub (60 req/jam tanpa token).

// Fallback saat GitHub API tak terjangkau / rate-limit. WAJIB sinkron dengan
// mobile-kmp/androidApp/build.gradle.kts (versionCode/versionName) dan nama
// file rilis RESSIST-MOBILE: ressist-X.Y.Z-codeN-release.apk.
export const FALLBACK_VERSION = "v0.4.1";
export const FALLBACK_NAME = "ressist-0.4.1-code17-release.apk";
export const FALLBACK_SIZE_BYTES = 3_282_042;
export const FALLBACK_RELEASED_ISO = "2026-10-04";
// SHA asli FALLBACK_NAME dari SHA256SUMS.txt rilisnya. Hanya ditampilkan bila
// file yang ditawarkan memang FALLBACK_NAME.
export const FALLBACK_SHA256 =
  "84cbf968eb9023ed2f026738f6e32485d3ac1f17a3d81e1ddbbf87aa4046a9e0";

export const RELEASES_REPO = "Jeremi16/RESSIST-MOBILE";
const LATEST_API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;
const CACHE_KEY = "ressist:latest-release";
const CACHE_TTL_MS = 60 * 60 * 1000;

export type LatestRelease = {
  version: string;
  name: string;
  url: string;
  sizeBytes: number;
  releasedIso: string;
  htmlUrl: string;
  /** SHA-256 yang diketahui untuk file ini, atau null (cek SHA256SUMS.txt). */
  sha256: string | null;
  live: boolean;
};

export const FALLBACK_RELEASE: LatestRelease = {
  version: FALLBACK_VERSION,
  name: FALLBACK_NAME,
  url: `https://github.com/${RELEASES_REPO}/releases/download/${FALLBACK_VERSION}/${FALLBACK_NAME}`,
  sizeBytes: FALLBACK_SIZE_BYTES,
  releasedIso: FALLBACK_RELEASED_ISO,
  htmlUrl: `https://github.com/${RELEASES_REPO}/releases/latest`,
  sha256: FALLBACK_SHA256,
  live: false,
};

type GithubAsset = {
  name?: string;
  browser_download_url?: string;
  size?: number;
};

function readCache(): LatestRelease | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: LatestRelease };
    return Date.now() - at < CACHE_TTL_MS ? data : null;
  } catch {
    return null;
  }
}

function writeCache(data: LatestRelease) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage penuh / diblokir — abaikan
  }
}

let inflight: Promise<LatestRelease | null> | null = null;

async function fetchLatest(): Promise<LatestRelease | null> {
  const res = await fetch(LATEST_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const assets: GithubAsset[] = json.assets ?? [];
  const codeOf = (n: string) => Number(/-code(\d+)/i.exec(n)?.[1] ?? -1);
  const apk = assets
    .filter((a) => a.name?.toLowerCase().endsWith(".apk"))
    .sort((a, b) => codeOf(b.name ?? "") - codeOf(a.name ?? ""))[0];
  if (!apk?.browser_download_url || !apk?.name) return null;
  const data: LatestRelease = {
    version: json.tag_name || FALLBACK_VERSION,
    name: apk.name,
    url: apk.browser_download_url,
    sizeBytes: apk.size ?? 0,
    releasedIso: json.published_at ?? "",
    htmlUrl: json.html_url ?? FALLBACK_RELEASE.htmlUrl,
    sha256: apk.name === FALLBACK_NAME ? FALLBACK_SHA256 : null,
    live: true,
  };
  writeCache(data);
  return data;
}

/** Rilis terbaru (cache → GitHub), fallback ke konstanta saat gagal. */
export function useLatestRelease(): LatestRelease {
  const [release, setRelease] = useState<LatestRelease>(
    () => readCache() ?? FALLBACK_RELEASE,
  );

  useEffect(() => {
    if (release.live) return;
    let cancelled = false;
    inflight ??= fetchLatest()
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
    inflight.then((data) => {
      if (data && !cancelled) setRelease(data);
    });
    return () => {
      cancelled = true;
    };
  }, [release.live]);

  return release;
}

export function formatSize(bytes: number): string {
  const b = Number.isFinite(bytes) && bytes > 0 ? bytes : FALLBACK_SIZE_BYTES;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso || FALLBACK_RELEASED_ISO);
  return (
    Number.isNaN(d.getTime()) ? new Date(FALLBACK_RELEASED_ISO) : d
  ).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
