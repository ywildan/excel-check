import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="wrap flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-base text-ink">Checker Sikarsa</p>
          <p className="mt-1 max-w-md">
            Alat bantu pemeriksaan bukti pengerjaan tugas Excel. Hasil checker adalah flag
            untuk ditinjau, bukan vonis otomatis.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="hover:text-accent" href="/#template">
            Template
          </Link>
          <Link className="hover:text-accent" href="/#privasi">
            Privasi
          </Link>
          <Link className="hover:text-accent" href="/riwayat">
            Riwayat
          </Link>
          <a className="hover:text-accent" href="https://sikarsa.id">
            sikarsa.id
          </a>
        </div>
      </div>
    </footer>
  );
}
