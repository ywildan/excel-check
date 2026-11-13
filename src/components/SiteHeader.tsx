import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-t-4 border-accent bg-surface">
      <div className="wrap flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none" aria-hidden="true">
              <path
                d="M9 16.5l4.5 4.5L23 11"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <span className="block font-serif text-lg leading-tight">Checker Sikarsa</span>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-muted">
              Audit Tugas Excel
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-1">
          <Link className="nav-link" href="/#cara-pakai">
            Cara pakai
          </Link>
          <Link className="nav-link" href="/#template">
            Template
          </Link>
          <Link className="nav-link" href="/riwayat">
            Riwayat
          </Link>
          <Link className="btn btn-primary ml-1 px-4 py-2" href="/mulai">
            Mulai cek
          </Link>
        </nav>
      </div>
    </header>
  );
}
