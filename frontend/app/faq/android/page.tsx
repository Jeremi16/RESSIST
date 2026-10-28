"use client";

import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";
import { FaqList, type FaqItem } from "@/components/FaqList";
import { formatSize, useLatestRelease } from "@/lib/latest-release";

export default function FaqAndroid() {
  // Data live dari GitHub Release (sumber yang sama dengan update-checker HP).
  const release = useLatestRelease();
  const version = release.version;
  const apkSize = formatSize(release.sizeBytes);

  const ITEMS: FaqItem[] = [
    {
      id: "download",
      nav: "Di mana download?",
      q: "Di mana download aplikasinya?",
      a: (
        <>
          Di{" "}
          <Link to="/app" className="text-black font-medium hover:underline">
            halaman download
          </Link>
          . Versi terbaru saat ini {version} (sekitar {apkSize}, Android 8.0 ke
          atas).
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
      a: `Pastikan "Install unknown apps" diizinkan untuk browsermu/HP, ruang penyimpanan cukup, dan file terdownload penuh (cek ukurannya ${apkSize}). Jika masih gagal, coba install lewat file manager (Files) langsung ke file APK, atau gunakan "Install anyway" setelah "More details". Lihat juga jawaban "Aman dari luar Play Store?" di atas.`,
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
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-black mb-3">
            FAQ Aplikasi Android
          </h1>
          <p className="font-serif text-sm sm:text-base text-black/60 leading-relaxed">
            Seputar download, install, dan update aplikasi Android Ressist.
          </p>
        </div>
        <FaqList items={ITEMS} />
      </div>
    </DocsLayout>
  );
}
