export function Footer() {
  return (
    <footer className="bg-blue-600 text-white py-16 lg:py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-10 bg-white rounded-xl flex items-center justify-center text-blue-600 text-xl font-black rotate-3">
                R
              </div>
              <span className="text-2xl font-black tracking-tighter">
                Resisst
              </span>
            </div>
            <p className="text-blue-100 max-w-xs leading-relaxed text-sm">
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
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-100 mb-4">
                    {group.title}
                  </h3>
                  <ul className="space-y-3">
                    {group.links.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="text-white/80 hover:text-white transition-colors text-sm font-medium"
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

        <div className="mt-12 pt-6 border-t border-white/20 text-center">
          <p className="text-blue-100 text-sm">
            &copy; 2026 Resisst. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
