import type { CheckRun } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { authConfigured, getSession } from "@/lib/auth-mode";
import { prisma } from "@/lib/prisma";
import { deleteAll, deleteBatch, logout } from "./actions";

export const metadata = { title: "Riwayat" };
export const dynamic = "force-dynamic";

function duration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function chipClass(verdict: string) {
  if (verdict === "NORMAL") return "border-accent/30 bg-accent-soft text-accent";
  if (verdict === "CURIGA") return "border-amber/30 bg-amber-soft text-amber";
  if (verdict === "TANPA LOG") return "border-line-strong bg-surface-2 text-muted";
  return "border-danger/30 bg-danger-soft text-danger";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function RiwayatPage() {
  if (!authConfigured) {
    return (
      <>
        <SiteHeader />
        <main className="wrap py-16">
          <div className="card mx-auto max-w-xl p-8">
            <p className="eyebrow">Riwayat pemeriksaan</p>
            <h1 className="display mt-2 text-3xl">Riwayat belum aktif</h1>
            <p className="lede mt-3 text-sm">
              Login Google dan database belum dikonfigurasi. Checker tetap bisa dipakai tanpa
              akun; riwayat hanya tersedia setelah environment diisi.
            </p>
            <Link className="btn btn-primary mt-6" href="/mulai">
              Mulai periksa
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const session = await getSession();
  if (!session?.user?.id) redirect("/masuk");

  let runs: CheckRun[] = [];
  let loadError = false;
  try {
    runs = await prisma.checkRun.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  } catch {
    loadError = true;
  }

  const batches = new Map<string, CheckRun[]>();
  for (const run of runs) {
    const key = run.batchId || run.id;
    const list = batches.get(key) || [];
    list.push(run);
    batches.set(key, list);
  }

  const counts = {
    total: runs.length,
    normal: runs.filter((run) => run.verdict === "NORMAL").length,
    curiga: runs.filter((run) => run.verdict === "CURIGA").length,
    tanpa: runs.filter((run) => run.verdict === "TANPA LOG").length,
  };

  return (
    <>
      <SiteHeader />
      <main className="wrap py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Riwayat pemeriksaan</p>
            <h1 className="display mt-2 text-3xl sm:text-4xl">Ringkasan yang tersimpan</h1>
            <p className="lede mt-2 text-sm">
              {session.user.name || session.user.email} · hanya ringkasan, bukan file.
            </p>
          </div>
          <div className="flex gap-2">
            <Link className="btn btn-primary" href="/mulai">
              Periksa lagi
            </Link>
            <form action={logout}>
              <button className="btn btn-secondary" type="submit">
                Keluar
              </button>
            </form>
          </div>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            Gagal memuat riwayat dari database. Periksa koneksi <code>DATABASE_URL</code>.
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total file", counts.total],
            ["NORMAL", counts.normal],
            ["CURIGA", counts.curiga],
            ["TANPA LOG", counts.tanpa],
          ].map(([label, value]) => (
            <article key={label} className="card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                {label}
              </p>
              <p className="mt-1 font-serif text-3xl">{value}</p>
            </article>
          ))}
        </div>

        {batches.size === 0 ? (
          <div className="card mt-8 p-8">
            <h2 className="font-serif text-2xl">Belum ada riwayat</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Jalankan pemeriksaan saat sudah masuk. Ringkasan akan muncul di sini dan tetap
              tersedia saat Anda membuka akun yang sama di perangkat lain.
            </p>
            <Link className="btn btn-primary mt-5" href="/mulai">
              Mulai periksa
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {Array.from(batches.entries()).map(([batchId, files]) => (
              <article key={batchId} className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-serif text-xl">
                      {formatDate(files[0].createdAt)}
                    </h2>
                    <p className="text-xs text-muted">
                      {files.length} file · {files[0].kelas || "tanpa kelas"}
                    </p>
                  </div>
                  <form action={deleteBatch}>
                    <input type="hidden" name="batchId" value={batchId} />
                    <ConfirmSubmit
                      className="text-xs font-semibold text-danger hover:underline"
                      message="Hapus seluruh ringkasan pada pemeriksaan ini?"
                    >
                      Hapus pemeriksaan
                    </ConfirmSubmit>
                  </form>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-muted">
                      <tr>
                        <th className="px-5 py-3 font-semibold">File</th>
                        <th className="px-3 py-3 font-semibold">Mahasiswa</th>
                        <th className="px-3 py-3 font-semibold">Aktif</th>
                        <th className="px-3 py-3 font-semibold">Sheet / tabel</th>
                        <th className="px-3 py-3 font-semibold">Log</th>
                        <th className="px-5 py-3 font-semibold">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {files.map((file) => (
                        <tr key={file.id}>
                          <td className="px-5 py-3">
                            <p className="font-medium">{file.fileName}</p>
                            <p className="text-xs text-muted">
                              {Math.round(file.fileSize / 1024)} KB
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p>{file.nama || "—"}</p>
                            <p className="font-mono text-xs text-muted">{file.nim || ""}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {duration(file.activeSeconds)}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {file.sheetCount} / {file.tableCount}
                          </td>
                          <td className="px-3 py-3 text-xs">{file.logStatus}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${chipClass(file.verdict)}`}
                            >
                              {file.verdict}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}

        {runs.length > 0 ? (
          <form action={deleteAll} className="mt-6">
            <ConfirmSubmit
              className="text-sm font-semibold text-danger hover:underline"
              message="Hapus seluruh riwayat pemeriksaan Anda?"
            >
              Hapus semua riwayat
            </ConfirmSubmit>
          </form>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
