import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-t-4 border-accent bg-surface">
      <div className="wrap flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg
            viewBox="0 0 512 512"
            width="36"
            height="36"
            className="shrink-0 rounded-[10px]"
            aria-hidden="true"
          >
            <rect width="512" height="512" rx="112" fill="#1e5947" />
            <g
              fill="none"
              stroke="#FDFBF7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M196 128V384" strokeWidth="60" />
              <path d="M196 256 344 128" strokeWidth="56" />
              <path d="M196 256 344 384" strokeWidth="56" />
            </g>
            <circle cx="360" cy="392" r="20" fill="#FDFBF7" />
          </svg>
          <span>
            <span className="block font-serif text-lg leading-tight">Checker Sikarsa</span>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-muted">
              Audit Tugas Excel
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-1">
          <Link className="nav-link" href="/#tentang">
            Tentang
          </Link>
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
