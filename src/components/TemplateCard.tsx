export type TemplateManifest = {
  name: string;
  version: string;
  size: number;
  sha256: string;
  updatedAt: string;
  downloadPath: string;
};

function formatSize(bytes: number) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function TemplateCard({ template }: { template: TemplateManifest }) {
  return (
    <article className="card overflow-hidden">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
        <div className="flex gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-accent">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <path
                d="M7 3.75h6.5L18 8.25v12H7z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M13 3.75v5h5M9.5 13h5M9.5 16h5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <div>
            <h3 className="font-serif text-2xl leading-tight">{template.name}</h3>
            <p className="mt-1 text-sm text-muted">
              Versi {template.version} · {formatSize(template.size)} · Diperbarui{" "}
              {formatDate(template.updatedAt)}
            </p>
            <p className="mt-3 max-w-lg text-sm text-muted">
              Satu file untuk mahasiswa. Form identitas dan tombol <strong>TRACK START</strong>{" "}
              sudah tersedia di dalam file; mahasiswa tinggal menambah sheet dan tabel sendiri.
            </p>
          </div>
        </div>

        <a className="btn btn-primary shrink-0" href={template.downloadPath} download>
          Unduh template
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      <div className="border-t border-line bg-surface-2 px-6 py-4 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          SHA-256
        </p>
        <code className="mt-1 block break-all font-mono text-[11px] leading-relaxed text-muted">
          {template.sha256}
        </code>
      </div>
    </article>
  );
}
