#!/usr/bin/env python3
"""Build Prototipe_Audit_Excel_v01.xlsm (starter, tanpa VBA ter-embed).
VBA diimpor terpisah via Alt+F11 — lihat CARA_PASANG.md.
Alasan: VM Linux tidak punya Excel Windows, jadi vbaProject.bin
tidak bisa dibuat dengan valid di sini. File ini adalah template
lengkap (sheet + rumus + log + properti) yang menjadi .xlsm penuh
setelah VBA diimpor dan di-Save As .xlsm di Excel Windows.
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from pathlib import Path

OUT = Path(__file__).parent / "Prototipe_Audit_Excel_v01.xlsm"

wb = openpyxl.Workbook()

NAVY = "1F3864"
BLUE = "D9E2F3"
LIGHT = "F2F2F2"
GREEN = "C6EFCE"
YELLOW = "FFEB9C"
thin = Side(style="thin", color="B0B0B0")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
title_font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
hdr_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
hdr_fill = PatternFill("solid", fgColor=NAVY)
sub_fill = PatternFill("solid", fgColor=BLUE)
body_font = Font(name="Calibri", size=11)
bold = Font(name="Calibri", size=11, bold=True)

def style_header(ws, row, cols):
    for c in range(1, cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border

def style_range(ws, min_row, max_row, cols):
    for r in range(min_row, max_row + 1):
        for c in range(1, cols + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = body_font
            cell.border = border
            cell.alignment = Alignment(vertical="center", wrap_text=True)

# ---------- 1. Petunjuk ----------
ws = wb.active
ws.title = "Petunjuk"
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws["A1"] = "PROTOTIPE AUDIT EXCEL v0.1 — Jurnal Umum sampai Neraca"
ws["A1"].font = title_font
ws["A1"].fill = PatternFill("solid", fgColor=NAVY)
ws.merge_cells("A1:F1")
ws["A2"] = "Timer AKTIF yang akurat: hanya jalan saat mouse/keyboard bergerak. Diam > 5 detik = timer jeda otomatis."
ws["A2"].font = Font(name="Calibri", size=11, italic=True)
ws.merge_cells("A2:F2")
steps = [
    ("1. AKTIFKAN MACRO", "Buka file ini di Excel Desktop Windows. Saat muncul peringatan keamanan kuning, klik Enable Content. Lalu tekan Alt+F11, import modAudit.bas + modIdentitas.bas, tempel kode ThisWorkbook.txt ke ThisWorkbook, Save As .xlsm."),
    ("2. ISI IDENTITAS", "Buka sheet Identitas, isi Nama, NIM, Kelas, Mata Kuliah, Judul Tugas. Jangan dikosongkan."),
    ("3. TEKAN MULAI", "Alt+F8 > StartTracking (atau tombol di Ribbon kalau customUI sudah dipasang). Status di Dashboard berubah jadi AKTIF."),
    ("4. KERJAKAN", "Kerjakan di sheet Jurnal Umum (dan Neraca Saldo). Timer jalan hanya saat kamu aktif. Coba diam 10 detik — lihat Dashboard: status jadi IDLE dan Waktu Aktif tidak bertambah."),
    ("5. SELESAI & KUNCI", "Alt+F8 > FinishAndLock. File tersimpan, sheet Identitas & Jurnal terkunci, siap dikumpulkan."),
    ("6. UNTUK DOSEN", "Jalankan:  python3 checker/cek_tugas.py Prototipe_Audit_Excel_v01.xlsm  — untuk membaca log, waktu aktif, dan flag curiga tanpa membuka Excel."),
    ("CATATAN", "Ini PROTOTIPE. Log disimpan di sheet _AUDIT_LOG (veryHidden) + CustomDocumentProperties. Hash di sini sederhana (FNV-1a), bukan tanda tangan digital. Jangan jadikan satu-satunya bukti — dosen tetap verifikasi isi jurnal."),
]
r = 4
for title, desc in steps:
    ws.cell(row=r, column=1, value=title).font = bold
    ws.cell(row=r, column=2, value=desc).font = body_font
    ws.cell(row=r, column=2).alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
    ws.row_dimensions[r].height = 36
    r += 1
ws.column_dimensions["A"].width = 22
for col in "BCDEF":
    ws.column_dimensions[col].width = 18
ws.sheet_properties.pageSetUpPr.fitToPage = True

# ---------- 2. Identitas ----------
ws = wb.create_sheet("Identitas")
ws["A1"] = "IDENTITAS MAHASISWA"
ws["A1"].font = title_font
ws["A1"].fill = PatternFill("solid", fgColor=NAVY)
ws.merge_cells("A1:B1")
labels = [
    (3, "Nama", "Yusuf Wildan Affandi"),
    (4, "NIM", ""),
    (5, "Kelas", "K1"),
    (6, "Mata Kuliah", "Pengantar Akuntansi"),
    (7, "Judul Tugas", "Jurnal Umum s.d. Neraca Saldo"),
    (8, "Tanggal Mulai", ""),
]
for row, label, example in labels:
    ws.cell(row=row, column=1, value=label).font = bold
    ws.cell(row=row, column=1).fill = sub_fill
    ws.cell(row=row, column=1).border = border
    c = ws.cell(row=row, column=2, value=example if row != 8 else None)
    c.font = body_font
    c.border = border
    c.fill = PatternFill("solid", fgColor="FFF2CC" if row != 8 else "FFFFFF")
ws["A10"] = "Isi kolom kuning, lalu tekan MULAI. Setelah Selesai & Kunci, kolom ini terkunci."
ws["A10"].font = Font(name="Calibri", size=10, italic=True)
ws.merge_cells("A10:B10")
ws.column_dimensions["A"].width = 18
ws.column_dimensions["B"].width = 50

# ---------- 3. Jurnal Umum ----------
ws = wb.create_sheet("Jurnal Umum")
ws["A1"] = "JURNAL UMUM"
ws["A1"].font = title_font
ws["A1"].fill = PatternFill("solid", fgColor=NAVY)
ws.merge_cells("A1:F1")
ws["A2"] = "Isi tanggal, keterangan, dan akun. Debit = Kredit harus seimbang (cek baris Total di bawah)."
ws["A2"].font = Font(name="Calibri", size=10, italic=True)
ws.merge_cells("A2:F2")
headers = ["No", "Tanggal", "Keterangan / Akun", "Ref", "Debit (Rp)", "Kredit (Rp)"]
for i, h in enumerate(headers, start=1):
    ws.cell(row=5, column=i, value=h)
style_header(ws, 5, 6)
ws.row_dimensions[5].height = 22
# 35 baris entri
for row in range(6, 41):
    ws.cell(row=row, column=1, value=row - 5)
    ws.cell(row=row, column=1).alignment = Alignment(horizontal="center")
    ws.cell(row=row, column=5).number_format = '#,##0'
    ws.cell(row=row, column=6).number_format = '#,##0'
style_range(ws, 6, 40, 6)
# Total
ws.cell(row=41, column=3, value="TOTAL").font = bold
ws.cell(row=41, column=3).alignment = Alignment(horizontal="right")
ws.cell(row=41, column=5, value="=SUM(E6:E40)").font = bold
ws.cell(row=41, column=5).number_format = '#,##0'
ws.cell(row=41, column=6, value="=SUM(F6:F40)").font = bold
ws.cell(row=41, column=6).number_format = '#,##0'
for c in range(1, 7):
    ws.cell(row=41, column=c).fill = sub_fill
    ws.cell(row=41, column=c).border = border
ws.cell(row=42, column=3, value="SELISIH (harus 0)").font = bold
ws.cell(row=42, column=5, value="=E41-F41").font = bold
ws.cell(row=42, column=5).number_format = '#,##0'
ws.column_dimensions["A"].width = 6
ws.column_dimensions["B"].width = 14
ws.column_dimensions["C"].width = 48
ws.column_dimensions["D"].width = 8
ws.column_dimensions["E"].width = 18
ws.column_dimensions["F"].width = 18

# ---------- 4. Neraca Saldo ----------
ws = wb.create_sheet("Neraca Saldo")
ws["A1"] = "NERACA SALDO"
ws["A1"].font = title_font
ws["A1"].fill = PatternFill("solid", fgColor=NAVY)
ws.merge_cells("A1:D1")
for i, h in enumerate(["No", "Nama Akun", "Debit (Rp)", "Kredit (Rp)"], start=1):
    ws.cell(row=3, column=i, value=h)
style_header(ws, 3, 4)
for row in range(4, 24):
    ws.cell(row=row, column=1, value=row - 3)
    ws.cell(row=row, column=3).number_format = '#,##0'
    ws.cell(row=row, column=4).number_format = '#,##0'
style_range(ws, 4, 23, 4)
ws.cell(row=24, column=2, value="TOTAL").font = bold
ws.cell(row=24, column=3, value="=SUM(C4:C23)").font = bold
ws.cell(row=24, column=3).number_format = '#,##0'
ws.cell(row=24, column=4, value="=SUM(D4:D23)").font = bold
ws.cell(row=24, column=4).number_format = '#,##0'
for c in range(1, 5):
    ws.cell(row=24, column=c).fill = sub_fill
    ws.cell(row=24, column=c).border = border
ws.column_dimensions["A"].width = 6
ws.column_dimensions["B"].width = 40
ws.column_dimensions["C"].width = 18
ws.column_dimensions["D"].width = 18

# ---------- 5. Dashboard Audit ----------
ws = wb.create_sheet("Dashboard Audit")
ws["A1"] = "DASHBOARD AUDIT — WAKTU PENGERJAAN"
ws["A1"].font = title_font
ws["A1"].fill = PatternFill("solid", fgColor=NAVY)
ws.merge_cells("A1:B1")
rows = [
    ("Status", "BELUM DIMULAI"),
    ("Waktu Aktif (jam/mnt/dtk)", "0 jam 0 mnt 0 dtk"),
    ("Waktu Aktif (detik)", 0),
    ("Waktu Diam / Idle (jam/mnt/dtk)", "0 jam 0 mnt 0 dtk"),
    ("Waktu Diam (detik)", 0),
    ("Jumlah Edit Sel", 0),
    ("Jumlah Paste", 0),
    ("Jumlah Save", 0),
    ("Sel Rumus (Formula)", 0),
    ("Sel Nilai (diketik)", 0),
    ("Sesi Mulai", ""),
    ("Terakhir Diperbarui", ""),
    ("Hash Log Terakhir", ""),
]
for i, (label, val) in enumerate(rows, start=3):
    ws.cell(row=i, column=1, value=label).font = bold
    ws.cell(row=i, column=1).fill = sub_fill
    ws.cell(row=i, column=1).border = border
    c = ws.cell(row=i, column=2, value=val)
    c.font = body_font
    c.border = border
    if i == 3:
        c.fill = PatternFill("solid", fgColor=YELLOW)
        c.font = Font(name="Calibri", size=12, bold=True)
ws["A18"] = "Cara baca: Waktu Aktif hanya bertambah saat mouse/keyboard bergerak dan Excel aktif. Diam > 5 detik tidak dihitung."
ws["A18"].font = Font(name="Calibri", size=10, italic=True)
ws.merge_cells("A18:B18")
ws["A19"] = "Dosen: jalankan checker/cek_tugas.py untuk membaca angka ini tanpa membuka Excel."
ws["A19"].font = Font(name="Calibri", size=10, italic=True)
ws.merge_cells("A19:B19")
ws.column_dimensions["A"].width = 34
ws.column_dimensions["B"].width = 42

# ---------- 6. _AUDIT_LOG (veryHidden) ----------
ws = wb.create_sheet("_AUDIT_LOG")
for i, h in enumerate(["Waktu", "Event", "Detail", "ActiveSeconds", "IdleSeconds", "Hash"], start=1):
    ws.cell(row=1, column=i, value=h)
style_header(ws, 1, 6)
ws["H1"] = "STATE"
ws["H2"] = 0
ws["I2"] = 0
ws["J2"] = 0
ws["K2"] = 0
ws["L2"] = 0
ws["M2"] = 0
ws["N2"] = 0
ws["O2"] = ""
ws["P2"] = ""
ws["Q2"] = False
ws.column_dimensions["A"].width = 20
ws.column_dimensions["B"].width = 12
ws.column_dimensions["C"].width = 70
ws.column_dimensions["D"].width = 14
ws.column_dimensions["E"].width = 14
ws.column_dimensions["F"].width = 12
ws.sheet_state = "veryHidden"

# Properti dokumen
wb.properties.creator = "Prototipe Audit Excel v0.1"
wb.properties.lastModifiedBy = "Prototipe Audit Excel v0.1"
wb.properties.title = "Prototipe Audit Excel — Jurnal Umum s.d. Neraca Saldo"
wb.properties.description = "Prototipe VBA: timer aktif akurat (idle 5 detik = jeda), form identitas NIM, log audit untuk dosen."
wb.properties.company = "Prototipe Audit Excel"

wb.active = wb["Petunjuk"]
wb.save(OUT)
print(f"OK: {OUT} ({OUT.stat().st_size} bytes)")
print("Sheets:", wb.sheetnames)
