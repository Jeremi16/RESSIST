import type { DocsSidebarGroup } from "@/components/DocsLayout";

/**
 * Sidebar bersama untuk halaman docs (/app, /change-log, /guide, /help,
 * /faq/*, /api-docs). Grup navigasi selalu sama; grup "Di halaman ini"
 * diisi anchor milik masing-masing halaman agar tidak ada link mati.
 */
export function docsSidebar(
  pageAnchors: { label: string; to: string }[],
): DocsSidebarGroup[] {
  return [
    {
      links: [
        { label: "Download", to: "/app" },
        { label: "Changelog", to: "/change-log" },
        { label: "Panduan Memulai", to: "/guide" },
        { label: "Bantuan", to: "/help" },
      ],
    },
    {
      title: "Frequently Asked Questions",
      links: [
        { label: "Umum", to: "/faq/general" },
        { label: "Aplikasi Android", to: "/faq/android" },
        { label: "Sinkronisasi", to: "/faq/sync" },
        { label: "Notifikasi", to: "/faq/notifications" },
      ],
    },
    {
      title: "Di halaman ini",
      links: pageAnchors.map((a) => ({ ...a, anchor: true })),
    },
    {
      title: "Developer",
      links: [
        { label: "Dokumentasi API", to: "/api-docs" },
        { label: "Status Layanan", to: "/status" },
      ],
    },
  ];
}
