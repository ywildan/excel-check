# Excel Check — Audit Pengerjaan Tugas Pengantar Akuntansi

Bukti pengerjaan Excel yang bisa diperiksa dosen, untuk tugas Jurnal Umum
sampai Neraca Saldo / Laporan Keuangan.

Dosen melarang Excel karena takut mahasiswa menyalin kerja teman atau memakai
AI. Sistem ini mencatat **bukti pengerjaan**, bukan cuma isi jawabannya.

## Cara pakai mahasiswa (3 langkah)

1. Download `Prototipe_Audit_Excel_v01.xlsm`, buka di Excel Desktop Windows,
   klik **Enable Content** kalau muncul.
2. Isi sheet **Identitas** (Nama, NIM, Kelas, Mata Kuliah, Judul Tugas),
   lalu tekan **MULAI**.
3. Kerjakan di **Jurnal Umum** dan **Neraca Saldo**, lalu tekan
   **SELESAI & KUNCI** saat selesai.

Timer hanya jalan saat mouse/keyboard bergerak. Diam lebih dari **5 detik**
= timer jeda otomatis. Pindah ke aplikasi lain juga dihitung diam.

> Catatan: file `.xlsm` di repo ini adalah template starter. VBA-nya
> (`vba/modAudit.bas`, `vba/modIdentitas.bas`, `vba/ThisWorkbook.txt`)
> diimpor sekali lewat Alt+F11 — lihat `CARA_PASANG.md`. Versi final
> yang setup-nya tidak ribet (VBA sudah ter-embed / installer `.msi`)
> sedang disiapkan lewat prompt di `prompt-untuk-agent-lain.txt`.

## Cara pakai dosen

```bash
pip install openpyxl
python3 checker/cek_tugas.py tugas-mahasiswa.xlsm
```

Checker membaca log audit, waktu aktif/diam, edit/paste/save, dan memberi
flag (NORMAL / CURIGA / LOG HILANG), plus hash isi Jurnal untuk mendeteksi
salinan antar mahasiswa. Bisa dipakai untuk banyak file sekaligus:
`python3 checker/cek_tugas.py tugas-*.xlsm`

## Isi repo

- `Prototipe_Audit_Excel_v01.xlsm` — template tugas (biner, 11 KB)
- `vba/modAudit.bas` — timer aktif, log audit, dashboard
- `vba/modIdentitas.bas` — form identitas + kunci
- `vba/ThisWorkbook.txt` — kode ThisWorkbook
- `vba/customUI.xml` — Ribbon "Tugas Akuntansi" (opsional)
- `checker/cek_tugas.py` — alat checker dosen (Python)
- `build_xlsm.py` — script pembuat file `.xlsm`
- `CARA_PASANG.md` — panduan lengkap pasang & pakai
- `prompt-untuk-agent-lain.txt` — prompt untuk membangun versi final
  yang setup-nya tidak ribet

## Batasan (jujur)

- Hanya Excel Desktop Windows. Tidak jalan di Excel Online / Mac / HP.
- Hash log di prototipe ini sederhana (FNV-1a), bukan tanda tangan digital.
- Ini alat bukti, bukan vonis. Dosen tetap memverifikasi isi jurnal.
