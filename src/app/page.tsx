import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TemplateCard, type TemplateManifest } from "@/components/TemplateCard";
import template from "../../public/downloads/template.json";

const manifest = template as TemplateManifest;

const dosenSteps = [
  {
    title: "Buka checker",
    body: "Masuk ke halaman pemeriksaan. Tidak perlu memasang aplikasi atau membuat akun.",
  },
  {
    title: "Tarik file tugas",
    body: "Letakkan satu atau banyak file .xlsm sekaligus. File dibaca di browser, tidak diunggah.",
  },
  {
    title: "Baca bukti",
    body: "Lihat waktu aktif, edit, paste, sheet/tabel, status log, dan flag yang perlu ditinjau.",
  },
];

const mahasiswaSteps = [
  {
    title: "Unduh satu file",
    body: "Gunakan tracker resmi dari halaman ini. Jangan memakai file Excel pribadi.",
  },
  {
    title: "Isi identitas",
    body: "Buka di Excel Desktop Windows, klik Enable Content, lalu isi nama, NIM, kelas, dan tugas.",
  },
  {
    title: "TRACK START, lalu kerjakan",
    body: "Tambahkan sheet dan tabel sendiri. Setelah selesai, tekan tombol merah SELESAI & KUNCI.",
  },
];

const useCases = [
  {
    title: "Memeriksa kelas besar",
    body: "Tarik banyak file sekaligus, lihat ringkasan kelas, lalu buka detail hanya pada file yang perlu ditinjau.",
  },
  {
    title: "Menemukan indikasi salinan",
    body: "Isi pekerjaan yang identik dan author yang sama ditandai otomatis, tanpa membandingkan file satu per satu.",
  },
  {
    title: "Memastikan tracker dipakai",
    body: "File tanpa _AUDIT_LOG atau properti Audit_* langsung ditandai TANPA LOG.",
  },
  {
    title: "Menyimpan riwayat pemeriksaan",
    body: "Jika masuk dengan Google, ringkasan tersimpan dan bisa dibuka lagi dari perangkat lain.",
  },
];

const faqs = [
  {
    q: "Apakah file mahasiswa diunggah ke server?",
    a: "Tidak. File .xlsm dibaca dan dianalisis sepenuhnya di browser. Server tidak menerima byte file.",
  },
  {
    q: "Apakah saya harus login untuk memakai checker?",
    a: "Tidak. Checker bisa dipakai tanpa akun. Login Google hanya diperlukan bila ingin menyimpan riwayat ringkasan lintas perangkat.",
  },
  {
    q: "Apa yang disimpan jika saya login?",
    a: "Hanya ringkasan: nama file, hash, identitas mahasiswa, hitungan waktu/edit/paste, status log, dan flag. Isi sel dan file tidak disimpan.",
  },
  {
    q: "Apakah checker memberi nilai otomatis?",
    a: "Tidak. Checker menampilkan flag NORMAL, CURIGA, TANPA LOG, atau GAGAL untuk ditinjau dosen. Keputusan tetap ada pada dosen.",
  },
  {
    q: "Kenapa tombol SELESAI berwarna merah?",
    a: "Sebagai peringatan bahwa setelah ditekan semua sheet dikunci dan file tidak bisa diedit lagi.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="border-b border-line bg-surface">
          <div className="wrap grid gap-12 py-16 lg:grid-cols-[1.35fr_0.65fr] lg:py-24">
            <div>
              <p className="eyebrow">Sikarsa · Alat bantu dosen</p>
              <h1 className="display mt-4 max-w-3xl text-[clamp(2.4rem,5vw,3.6rem)]">
                Periksa tugas Excel dengan bukti, bukan tebakan.
              </h1>
              <p className="lede mt-5 max-w-2xl text-lg">
                Baca waktu aktif, waktu diam, edit, paste, sheet/tabel, dan keutuhan log dari
                file <strong className="text-ink">.xlsm</strong> mahasiswa. Semua diproses di
                browser — file tidak diunggah.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href="/mulai">
                  Mulai periksa
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                    <path
                      d="M4 10h11m0 0-4-4m4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <a className="btn btn-secondary" href={manifest.downloadPath} download>
                  Unduh template mahasiswa
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-sm text-muted">
                <span>Timer 1 detik</span>
                <span aria-hidden="true">·</span>
                <span>Semua sheet dan tabel</span>
                <span aria-hidden="true">·</span>
                <span>Log dengan rantai hash</span>
              </div>
            </div>

            <aside className="card self-start p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Privasi
              </p>
              <h2 className="mt-2 font-serif text-2xl leading-tight">
                File tetap di perangkat Anda.
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  Analisis file berjalan di browser, tanpa endpoint unggah.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  Login Google opsional, hanya untuk menyimpan ringkasan riwayat.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  Isi sel, sheet, dan log mentah tidak pernah disimpan di server.
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section id="template" className="scroll-mt-8 py-16 lg:py-20">
          <div className="wrap">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Untuk mahasiswa</p>
                <h2 className="display mt-2 text-3xl sm:text-4xl">Template tracker resmi</h2>
              </div>
              <p className="max-w-md text-sm text-muted">
                Satu file, tanpa langkah pemasangan. Bagikan tautan halaman ini, bukan file
                yang sudah terisi.
              </p>
            </div>
            <TemplateCard template={manifest} />
          </div>
        </section>

        <section id="cara-pakai" className="scroll-mt-8 border-y border-line bg-surface-2 py-16 lg:py-20">
          <div className="wrap grid gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Untuk dosen</p>
              <h2 className="display mt-2 text-3xl">Tiga langkah memeriksa</h2>
              <ol className="mt-7 space-y-5">
                {dosenSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface font-mono text-xs text-accent">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link className="btn btn-primary mt-8" href="/mulai">
                Buka checker
              </Link>
            </div>

            <div>
              <p className="eyebrow">Untuk mahasiswa</p>
              <h2 className="display mt-2 text-3xl">Tiga langkah mengerjakan</h2>
              <ol className="mt-7 space-y-5">
                {mahasiswaSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface font-mono text-xs text-accent">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <a className="btn btn-secondary mt-8" href={manifest.downloadPath} download>
                Unduh template
              </a>
            </div>
          </div>
        </section>

        <section id="tentang" className="scroll-mt-8 border-b border-line py-16 lg:py-20">
          <div className="wrap grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow">Tentang</p>
              <h2 className="display mt-2 text-3xl sm:text-4xl">
                Kenapa checker ini dibuat?
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
                <p>
                  Tugas Excel biasanya dinilai dari hasil akhir. Padahal cara pekerjaan itu
                  dibuat ikut penting: berapa lama dikerjakan, apakah isinya diedit atau
                  ditempel, apakah file pernah kehilangan log, dan apakah ada beberapa file
                  dengan isi yang sama persis.
                </p>
                <p>
                  Checker ini dibuat untuk memberi dosen ringkasan bukti proses yang cepat
                  dibaca, tanpa membuka file satu per satu. Mahasiswa memakai template tracker
                  untuk merekam proses; dosen mengunggah file dan melihat mana yang perlu
                  ditinjau.
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-amber/25 bg-amber-soft/60 p-4 text-sm">
                <p className="font-semibold text-ink">Bukan penentu nilai.</p>
                <p className="mt-1 text-muted">
                  Flag NORMAL, CURIGA, TANPA LOG, atau GAGAL adalah penanda untuk diperiksa
                  manusia, bukan kesimpulan otomatis. Keputusan tetap ada pada dosen.
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                Dipakai untuk
              </p>
              <ul className="mt-4 space-y-3">
                {useCases.map((item, index) => (
                  <li key={item.title} className="card flex gap-4 p-4 sm:p-5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 font-mono text-xs text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="privasi" className="scroll-mt-8 py-16 lg:py-20">
          <div className="wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Privasi dan data</p>
              <h2 className="display mt-2 text-3xl">Yang disimpan, dan yang tidak.</h2>
              <p className="lede mt-4 text-sm">
                Checker ini sengaja dibuat tanpa unggahan file. Login hanya menambahkan
                riwayat ringkasan, bukan salinan pekerjaan mahasiswa.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="card p-6">
                <h3 className="font-serif text-xl">Disimpan saat login</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>Nama file, ukuran, dan hash SHA-256</li>
                  <li>Nama, NIM, kelas, mata kuliah, judul tugas</li>
                  <li>Hitungan waktu aktif/diam, edit, paste, save</li>
                  <li>Jumlah sheet/tabel/sel, status log, dan flag</li>
                </ul>
              </article>
              <article className="card p-6">
                <h3 className="font-serif text-xl">Tidak disimpan</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>Byte file .xlsm</li>
                  <li>Isi sel, rumus, dan isi sheet</li>
                  <li>Log mentah dan pratinjau baris log</li>
                  <li>File template yang sudah diisi mahasiswa</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-14">
          <div className="wrap flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Riwayat lintas perangkat</p>
              <h2 className="display mt-2 text-2xl sm:text-3xl">
                Masuk dengan Google, riwayat tetap ada.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Tanpa login checker tetap bisa dipakai. Riwayat ringkasan hanya tersimpan
                setelah Anda masuk.
              </p>
            </div>
            <Link className="btn btn-secondary shrink-0" href="/masuk">
              Masuk dengan Google
            </Link>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="wrap grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="eyebrow">Pertanyaan umum</p>
              <h2 className="display mt-2 text-3xl">Hal yang sering ditanyakan</h2>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {faqs.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {item.q}
                    <span className="text-accent transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl text-sm text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
