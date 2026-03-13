export function Footer() {
  return (
    <footer className="bg-slate-950 text-white py-24 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-8">
              <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black rotate-3">R</div>
              <span className="text-2xl font-black tracking-tighter">Resisst</span>
            </div>
            <p className="text-slate-400 max-w-xs leading-relaxed mb-8">
              Membangun masa depan produktivitas akademik. Tetap teratur, tetap fokus, tetap unggul.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'GitHub', 'LinkedIn'].map(social => (
                <div key={social} className="size-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer text-slate-500 hover:text-white text-xs font-bold">
                  {social[0]}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { title: 'Produk', links: [
                  { name: 'Fitur', href: '/fitur' },
                  { name: 'Harga', href: '/harga' },
                  { name: 'Keamanan', href: '/keamanan' },
                  { name: 'Roadmap', href: '/roadmap' }
                ]},
                { title: 'Sumber Daya', links: [
                  { name: 'Dokumentasi', href: '/dokumentasi' },
                  { name: 'Panduan', href: '/panduan' },
                  { name: 'Bantuan', href: '/bantuan' },
                  { name: 'Status', href: '/status' }
                ]},
                { title: 'Perusahaan', links: [
                  { name: 'Tentang', href: '/tentang' },
                  { name: 'Karir', href: '/karir' },
                  { name: 'Kontak', href: '/kontak' },
                  { name: 'Blog', href: '/blog' }
                ]},
                { title: 'Legal', links: [
                  { name: 'Privasi', href: '/privasi' },
                  { name: 'Ketentuan', href: '/ketentuan' },
                  { name: 'Kebijakan Cookie', href: '/kebijakan-cookie' }
                ]},
              ].map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">{group.title}</h3>
                  <ul className="space-y-4">
                    {group.links.map(link => (
                      <li key={link.name}>
                        <a href={link.href} className="text-slate-500 hover:text-white transition-colors text-sm font-medium">
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
        
        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Resisst. Hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="size-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semua Sistem Berjalan Normal</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
