import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const groups = [
  {
    title: "Produk",
    links: [
      { name: "Fitur", href: "/features" },
      { name: "Harga", href: "/harga" },
      { name: "Changelog", href: "/change-log" },
      { name: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { name: "Panduan", href: "/guide" },
      { name: "Dokumentasi", href: "/documentation" },
      { name: "FAQ", href: "/faq/general" },
      { name: "Status", href: "/status" },
    ],
  },
  {
    title: "Tentang",
    links: [
      { name: "Tentang Kami", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Karir", href: "/karir" },
      { name: "Kontak", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Keamanan", href: "/keamanan" },
      { name: "Kebijakan Cookie", href: "/kebijakan-cookie" },
      { name: "API", href: "/api-docs" },
      { name: "Unduh App", href: "/app" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-white text-black">
      <div className="mx-auto max-w-[1120px] px-6 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <Logo size={30} />
            <p className="mt-4 font-display text-[11px] font-medium uppercase tracking-wider">
              Tetap teratur. Tetap fokus.
            </p>
          </div>

          <div className="lg:col-span-8">
            <p className="font-display text-[11px] font-medium uppercase tracking-wider mb-2">
              Kami percaya
            </p>
            <p className="font-serif italic text-black/80 mb-12">
              &ldquo;Deadline tidak perlu ditakuti kalau selalu terlihat.&rdquo;
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {groups.map((group) => (
                <div key={group.title}>
                  <h3 className="font-display text-[11px] font-medium uppercase tracking-wider mb-4">
                    {group.title}
                  </h3>
                  <ul className="space-y-2">
                    {group.links.map((link) => (
                      <li key={link.name}>
                        <Link
                          to={link.href}
                          className="font-serif text-sm text-black/50 hover:text-[#0059D0] transition-colors"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-6 font-display text-[11px] font-medium uppercase tracking-wider">
          <p className="lg:col-span-4">&copy; 2026 Ressist &middot; Hak cipta dilindungi</p>
          <div className="lg:col-span-8 flex gap-12">
            <Link to="/terms" className="hover:text-[#0059D0] transition-colors">Ketentuan</Link>
            <Link to="/privacy" className="hover:text-[#0059D0] transition-colors">Privasi</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
