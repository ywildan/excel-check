# Checker Sikarsa

Checker Audit Excel untuk `checker.sikarsa.id`. Project ini **terpisah** dari
`C:\Users\ywldan\Projects\karsa` dan tidak mengimpor kode dari sana.

## Isi

- Landing page publik
- Tool checker di `/mulai` (aset statis checker lama, analisis di browser)
- Unduhan template di `/downloads/Tracker_Audit_Tugas.xlsm`
- Endpoint `/api/template/baru`: mengirim template dengan ID unik (properti
  `Audit_IssuedId` dan `Audit_IssuedAt` di `docProps/custom.xml`) dan mencatat
  unduhan ke tabel `TemplateDownload` (best-effort; tanpa DB unduhan tetap berjalan)
- Tracker Generator di `/downloads/Tracker_Generator.bat`: diunduh mahasiswa
  sekali, lalu setiap dijalankan menghasilkan file template baru yang siap pakai.
  Folder `%USERPROFILE%\Tracker` didaftarkan sebagai Trusted Location (HKCU,
  tanpa admin) dan template diunduh via `curl.exe` sehingga tidak membawa Mark
  of the Web (tidak perlu Unblock di Properties)
- Login Google opsional untuk riwayat ringkasan
- Halaman riwayat di `/riwayat`

File `.xlsm` **tidak pernah diunggah**. Tidak ada endpoint upload. Database hanya
menyimpan ringkasan: nama file, hash, identitas, hitungan waktu/edit/paste, status
log, dan flag. Isi sel, sheet, dan log mentah tidak disimpan.

## Jalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

Tanpa environment auth, tool dan landing tetap berjalan. Halaman `/masuk` dan
`/riwayat` menampilkan status “belum dikonfigurasi”.

## Environment

Salin `.env.example` menjadi `.env.local`:

```bash
AUTH_SECRET="string-acak-panjang"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
DATABASE_URL="postgresql://..."
```

`AUTH_SECRET` dapat dibuat dengan:

```bash
npx auth secret
```

atau string acak 32+ byte.

## Google OAuth

Di Google Cloud Console, buat OAuth Client (Web application):

- Authorized JavaScript origin: `https://checker.sikarsa.id`
- Authorized redirect URI:
  `https://checker.sikarsa.id/api/auth/callback/google`

Untuk lokal, tambahkan juga:

- `http://localhost:3000`
- `http://localhost:3000/api/auth/callback/google`

## Database

Project memakai Prisma + Postgres (Neon / Vercel Postgres).

```bash
npm run db:migrate
```

Migrasi awal ada di `prisma/migrations/0001_init`; migrasi tabel
`TemplateDownload` ada di `prisma/migrations/0002_template_download`. Untuk
pengembangan:

```bash
npx prisma migrate dev
```

## Build

```bash
npm run typecheck
npm run build
npm start
```

## Deploy Vercel

1. Buat project Vercel baru dari folder/repo ini (bukan project Karsa).
2. Tambahkan environment di atas. Untuk production:
   `AUTH_URL=https://checker.sikarsa.id`.
3. Tambahkan domain `checker.sikarsa.id` di Vercel.
   - Jika DNS `sikarsa.id` dikelola Vercel, tambahkan subdomain langsung.
   - Jika tidak, buat CNAME `checker` → `cname.vercel-dns.com`.
4. Jalankan migrasi database (`npm run db:migrate`) dari mesin lokal atau job
   deploy sebelum aplikasi dipakai.

## Struktur

```text
src/app/                 Halaman Next.js dan API
src/components/          Header, footer, kartu template
src/lib/                 Prisma, auth guard, schema riwayat
public/tool/             Checker statis + history-bridge.js
public/downloads/        Template + manifest versi/hash
prisma/                  Schema dan migrasi
```

## Template

Template di `public/downloads/Tracker_Audit_Tugas.xlsm` memiliki tombol
**SELESAI & KUNCI** berwarna merah. Metadata versi dan SHA-256 ada di
`public/downloads/template.json` dan ditampilkan di landing page.

Manifest yang sama juga melacak `Tracker_Generator.bat` di kunci `generator`
(versi, ukuran, SHA-256); versi dan hash-nya ditampilkan di kartu generator.

Jika template atau generator diubah, perbarui versi, ukuran, hash, dan tanggal
di manifest.

## Batas

- Analisis file bergantung pada browser modern (ZIP + `DecompressionStream`).
- File dibatasi 30 MB dan total isi ZIP 120 MB.
- Checker menandai sel yang sudah terisi sebelum TRACK START, perbedaan angka properti vs log SELESAI, dan pekerjaan kosong.
- Login dan riwayat belum diuji dengan kredensial Google/Postgres asli.
- Checker memberi flag untuk ditinjau, bukan nilai otomatis.
