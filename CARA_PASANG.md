# Prototipe Audit Excel v0.1 — Cara Pasang & Cara Pakai

## Isi paket ini

```
excel-audit-prototype/
├── Prototipe_Audit_Excel_v01.xlsm   # Template tugas (Jurnal + Neraca Saldo + Dashboard + Log)
├── vba/
│   ├── modAudit.bas                 # Timer aktif, log, dashboard, tombol Ribbon
│   ├── modIdentitas.bas             # Form identitas (sheet) + kunci
│   ├── ThisWorkbook.txt             # Kode yang ditempel ke ThisWorkbook
│   └── customUI.xml                 # Ribbon "Tugas Akuntansi" (opsional, tahap lanjut)
├── checker/
│   └── cek_tugas.py                 # Alat dosen: baca log tanpa buka Excel
├── build_xlsm.py                    # Script pembuat file .xlsm (untuk regenerasi)
└── CARA_PASANG.md                   # File ini
```

## Kenapa file .xlsm-nya belum berisi VBA?

VM ini Linux dan tidak punya Excel Windows, jadi `vbaProject.bin` yang valid
tidak bisa dibuat di sini tanpa merusak file. File `.xlsm` di paket ini adalah
**template lengkap yang sudah benar strukturnya** (sheet, rumus, log tersembunyi).
VBA-nya dipasang dalam 2 menit di Excel Windows dengan langkah di bawah —
cara standar distribusi prototipe VBA.

Setelah VBA diimpor dan file di-Save, file itu menjadi `.xlsm` penuh dengan macro.

## Pasang VBA (sekali saja, ±2 menit, di Excel Windows)

1. Buka `Prototipe_Audit_Excel_v01.xlsm` di **Excel Desktop Windows**
   (tidak bisa di Excel Online / Mac / HP).
2. Kalau muncul bar kuning di atas, klik **Enable Content**.
3. Tekan **Alt+F11** untuk buka VBA Editor.
4. Menu **File > Import File...**, pilih `vba/modAudit.bas`, lalu ulangi
   untuk `vba/modIdentitas.bas`.
5. Di panel kiri (Project Explorer), klik dua kali **ThisWorkbook**.
   Hapus isinya, lalu tempel seluruh isi `vba/ThisWorkbook.txt`.
6. Tutup VBA Editor (Alt+Q), lalu **Ctrl+S** untuk Save.
   Kalau Excel bertanya format, pilih **Excel Macro-Enabled Workbook (.xlsm)**.
7. **Tutup file, lalu buka lagi.** Akan muncul pesan selamat datang
   dan sheet Identitas terbuka.

> Ribbon "Tugas Akuntansi" (customUI.xml) bersifat OPSIONAL di prototipe ini.
> Tanpa Ribbon, semua fungsi tetap bisa dijalankan lewat **Alt+F8**:
> `StartTracking`, `PauseTracking`, `ResumeTracking`, `FinishAndLock`.
> Pasang Ribbon belakangan dengan Custom UI Editor for Microsoft Office
> kalau mau tampilan tombol yang rapi.

## Cara pakai — mahasiswa

1. Isi sheet **Identitas**: Nama, NIM, Kelas, Mata Kuliah, Judul Tugas.
2. Tekan **Alt+F8 > StartTracking** (tombol Mulai).
3. Kerjakan di sheet **Jurnal Umum** dan **Neraca Saldo** seperti biasa.
   - Timer hanya jalan saat mouse/keyboard bergerak DAN Excel sedang aktif.
   - Diam lebih dari **5 detik** = timer jeda otomatis, status di Dashboard
     berubah jadi `IDLE — timer jeda`.
   - Pindah ke aplikasi lain (browser, Word) juga dihitung diam.
4. Lihat progres di sheet **Dashboard Audit**:
   Waktu Aktif, Waktu Diam, Jumlah Edit, Jumlah Paste, Jumlah Save.
5. Selesai: **Alt+F8 > FinishAndLock**.
   File tersimpan, Identitas & Jurnal terkunci, siap dikumpulkan.
6. Uji cepat timer:
   - Mulai, gerakkan mouse / ketik 30 detik → Waktu Aktif naik ~30 detik.
   - Lalu diam total 20 detik tanpa sentuh mouse/keyboard → Waktu Aktif
     TIDAK bertambah (hanya Waktu Diam yang naik).

## Cara pakai — dosen (checker)

Tidak perlu buka Excel. Di komputer yang ada Python:

```bash
pip install openpyxl
python3 checker/cek_tugas.py Prototipe_Audit_Excel_v01.xlsm
```

Untuk satu kelas sekaligus:

```bash
python3 checker/cek_tugas.py tugas-*.xlsm
```

Checker menampilkan: Author Excel, Identitas, Waktu Aktif/Diam,
Edit/Paste/Save, isi log terakhir, hash isi Jurnal (untuk deteksi salinan),
dan flag seperti:

- `LOG KOSONG` — file tidak pernah dilacak
- `CURIGA: aktif <10 mnt tapi edit banyak`
- `TIDAK ADA Audit_*` — plugin tidak jalan / file dibuat manual

## Yang dicatat plugin

| Data | Arti |
|---|---|
| ActiveSeconds | Detik benar-benar aktif (input < 5 detik terakhir) |
| IdleSeconds | Detik diam (> 5 detik tanpa input, atau Excel tidak aktif) |
| EditCount | Jumlah perubahan sel di Jurnal/Neraca (bukan di Dashboard/Log) |
| PasteCount | Perubahan >1 sel sekaligus / saat CutCopyMode aktif |
| SaveCount | Berapa kali Save |
| FormulaCount / ValueCount | Sel rumus vs sel angka/teks yang diketik |
| Log `_AUDIT_LOG` | Baris waktu + event (MULAI, JEDA, PASTE, SIMPAN, SELESAI, TUTUP) + hash rantai |
| CustomDocumentProperties | `Audit_NIM`, `Audit_Nama`, `Audit_ActiveSeconds`, `Audit_LastHash`, dll. |

## Batasan prototipe (jujur)

- Hanya Windows + Excel Desktop. Tidak jalan di Excel Online/Mac/Android.
- Hash log di sini sederhana (FNV-1a), bukan tanda tangan digital.
  Mahasiswa yang paham VBA masih bisa mengedit log — tapi hash-nya
  akan tidak cocok dan checker akan menandainya.
- Deteksi paste di `Workbook_SheetChange` itu perkiraan, bukan deteksi
  paste yang sempurna. Versi VSTO nanti akan pakai event yang lebih akurat.
- Timer memakai `Application.OnTime` tiap 1 detik. Kalau Excel crash
  atau macro dimatikan, pelacakan berhenti sampai file dibuka lagi
  (angka lama tetap tersimpan di `_AUDIT_LOG`).
- Ini alat bukti, bukan vonis. Dosen tetap verifikasi isi jurnal.

## Langkah lanjut (setelah prototipe ini diuji)

1. VSTO Add-in (C#) + installer `.msi` — timer dan log tidak lagi
   bergantung pada macro di dalam file tugas.
2. Simpan log di Custom XML Part + hash SHA-256 berantai.
3. Web checker dosen — upload file, tampilkan dashboard kelas
   dan perbandingan kemiripan antar mahasiswa.
