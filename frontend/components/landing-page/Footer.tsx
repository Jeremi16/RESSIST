export function Footer() {
  return (
    <footer className="bg-[#111111] text-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-8 rounded-lg bg-white flex items-center justify-center text-black text-sm font-bold">
                R
              </div>
              <span className="text-[15px] font-semibold tracking-tight">
                Ressist
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Membangun masa depan produktivitas akademik. Tetap teratur, tetap
              fokus, tetap unggul.
            </p>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                {
                  title: "Produk",
                  links: [
                    { name: "Fitur", href: "/features" },
                    { name: "Versi", href: "/version" },
                  ],
                },
                {
                  title: "Bantuan",
                  links: [
                    { name: "Dokumentasi", href: "/documentation" },
                    { name: "FAQ", href: "/help" },
                  ],
                },
                {
                  title: "Tentang",
                  links: [
                    { name: "Tentang Kami", href: "/about" },
                    { name: "Kontak", href: "/contact" },
                  ],
                },
                {
                  title: "Legal",
                  links: [
                    { name: "Privasi", href: "/privacy" },
                    { name: "Ketentuan", href: "/terms" },
                  ],
                },
              ].map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-medium tracking-wide text-white/40 mb-4">
                    {group.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 hover:text-white transition-colors"
                        >
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-sm text-white/40">
            &copy; 2026 Ressist. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
