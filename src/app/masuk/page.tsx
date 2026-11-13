import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authConfigured, getSession } from "@/lib/auth-mode";
import { loginWithGoogle } from "./actions";

export const metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function MasukPage() {
  const session = await getSession();
  if (session) redirect("/riwayat");

  return (
    <>
      <SiteHeader />
      <main className="wrap py-16">
        <div className="card mx-auto max-w-xl p-8">
          <p className="eyebrow">Riwayat lintas perangkat</p>
          <h1 className="display mt-2 text-3xl">Masuk dengan Google</h1>
          <p className="lede mt-3 text-sm">
            Login dipakai hanya untuk menyimpan ringkasan hasil pemeriksaan. File dan isi
            pekerjaan mahasiswa tetap tidak diunggah.
          </p>

          {authConfigured ? (
            <>
              <form action={loginWithGoogle} className="mt-6">
                <button className="btn btn-primary w-full" type="submit">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="currentColor"
                      d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14Z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9Z"
                    />
                  </svg>
                  Lanjut dengan Google
                </button>
              </form>
              <p className="mt-4 text-xs text-muted">
                Dengan masuk, Anda setuju ringkasan hasil pemeriksaan disimpan untuk akun ini.
                Anda dapat menghapusnya kapan saja dari halaman Riwayat.
              </p>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
              <p className="font-semibold text-ink">Login Google belum dikonfigurasi.</p>
              <p className="mt-1">
                Isi <code className="font-mono">AUTH_SECRET</code>,{" "}
                <code className="font-mono">AUTH_GOOGLE_ID</code>,{" "}
                <code className="font-mono">AUTH_GOOGLE_SECRET</code>, dan{" "}
                <code className="font-mono">DATABASE_URL</code> di environment Vercel. Checker
                tetap bisa dipakai tanpa akun.
              </p>
            </div>
          )}

          <p className="mt-6 text-sm">
            <a className="text-accent hover:underline" href="/mulai">
              Lanjut tanpa login
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
