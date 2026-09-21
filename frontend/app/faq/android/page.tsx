"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";
import { FaqList, type FaqItem } from "@/components/FaqList";

type LiveRelease = {
  version: string;
  size: string;
};

const RELEASES_REPO = "Jeremi16/RESSIST-MOBILE";
const LATEST_API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;

const FALLBACK_VERSION = "v0.3.2";
const FALLBACK_SIZE = "3.5 MB";

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return FALLBACK_SIZE;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function FaqAndroid() {
  // Data live dari GitHub Release (sumber yang sama dengan update-checker HP).
  const [live, setLive] = useState<LiveRelease | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LATEST_API, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return;
        const json = await res.json();
        const assets: Array<{ name?: string; browser_download_url?: string; size?: number }> =
          json.assets ?? [];
        const apk = assets.find((a) => a.name?.toLowerCase().endsWith(".apk"));
        if (!apk?.browser_download_url || !apk?.name) return;
        if (!cancelled) {
          setLive({
            version: json.tag_name ?? FALLBACK_VERSION,
            size: formatSize(apk.size ?? 0),
          });
        }
      } catch {
        // offline / diblokir — biarkan fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const version = live?.version ?? FALLBACK_VERSION;
  const apkSize = live?.size ?? FALLBACK_SIZE;

  const ITEMS: FaqItem[] = [
    {
      id: "download",
      nav: "Di mana download?",
      q: "Di mana download aplikasinya?",
      a: (
        <>
          Di{" "}
          <Link to="/app" className="text-[#0059D0] font-medium hover:underline">
            halaman download
          </Link>
          . Versi terbaru saat ini {version} (sekitar {apkSize}, Android 8.0
          ke atas).
        </>
      ),
    },
    {
      id: "aman",
      nav: "Aman dari luar Play Store?",
      q: "Apakah aman install APK dari luar Play Store?",
      a: "File ini dirilis resmi oleh tim Ressist. Untuk memastikan keasliannya, cocokkan SHA-256 file yang kamu download dengan nilai di bagian Detail File halaman download (atau file SHA256SUMS.txt di halaman rilis) sebelum install. Saat install pertama, Android menampilkan peringatan kuning “Unknown app” — ketuk “More details / Selengkapnya” lalu “Install anyway / Tetap install”. Update berikutnya biasanya mulus tanpa dialog lagi karena sistem mengenali sertifikat yang sama sebagai update resmi. Jangan matikan Play Protect; cukup izinkan sekali untuk aplikasi ini. Kalau yang muncul peringatan merah “Harmful app”, hentikan install dan pastikan file cocok dengan SHA-256.",
    },
    {
      id: "perangkat",
      nav: "HP yang didukung",
      q: "HP apa saja yang didukung?",
      a: "Aplikasi membutuhkan Android 8.0 atau lebih tinggi.",
    },
    {
      id: "update",
      nav: "Cara update",
      q: "Bagaimana cara update ke versi baru?",
      a: "Download file APK versi terbaru dari halaman download lalu install seperti biasa — cukup timpa versi lama, tidak perlu uninstall. Sejak v0.3.2, update memakai PackageInstaller session API: sistem mengenali sertifikat yang sama sebagai update resmi sehingga dialog instal biasanya hanya muncul sekali di awal. Jika Play Protect memblokir, cek SHA-256 file dengan nilai di halaman download sebelum melanjutkan.",
    },
    {
      id: "gagal",
      nav: "Gagal install",
      q: "Gagal install / muncul peringatan?",
      a: 'Pastikan "Install unknown apps" diizinkan untuk browsermu/HP, ruang penyimpanan cukup, dan file terdownload penuh (cek ukurannya ~3.5 MB). Jika masih gagal, coba install lewat file manager (Files) langsung ke file APK, atau gunakan "Install anyway" setelah "More details". Lihat juga jawaban "Aman dari luar Play Store?" di atas.',
    },
  ];

  const SIDEBAR = docsSidebar(
    ITEMS.map((i) => ({ label: i.nav, to: `#${i.id}` })),
  );

  return (
    <DocsLayout
      versionLabel={version}
      downloadHref="/app#stabil"
      sidebar={SIDEBAR}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            FAQ Aplikasi Android
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Seputar download, install, dan update aplikasi Android Ressist.
          </p>
        </div>
        <FaqList items={ITEMS} />
      </div>
    </DocsLayout>
  );
}