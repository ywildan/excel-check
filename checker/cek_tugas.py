#!/usr/bin/env python3
"""
Checker dosen — Prototipe Audit Excel v0.1
Membaca file .xlsm tugas mahasiswa TANPA perlu Excel / VBA:
  - sheet _AUDIT_LOG (log + state tersembunyi)
  - CustomDocumentProperties (Audit_*)
  - metadata standar (Author / Created / Last Modified By)
  - isi Jurnal Umum (jumlah baris terisi, total Debit/Kredit)

Pakai:
  python3 cek_tugas.py Prototipe_Audit_Excel_v01.xlsm
  python3 cek_tugas.py file1.xlsm file2.xlsm   # bandingkan satu kelas

Butuh: pip install openpyxl
"""
import sys, hashlib
from pathlib import Path
from datetime import datetime

try:
    import openpyxl
except ImportError:
    print("Butuh openpyxl: pip install openpyxl")
    sys.exit(1)


def fmt_seconds(n):
    try:
        n = int(n or 0)
    except Exception:
        return "-"
    return f"{n//3600} jam {(n % 3600)//60} mnt {n % 60} dtk"


def check_one(path: Path):
    print(f"\n{'='*62}")
    print(f"FILE: {path.name}")
    print(f"{'='*62}")
    try:
        wb = openpyxl.load_workbook(path, data_only=False)
    except Exception as e:
        print(f"  GAGAL BUKA: {e}")
        return None

    props = wb.properties
    print(f"  Author (Excel)      : {props.creator or '-'}")
    print(f"  Last Modified By    : {props.lastModifiedBy or '-'}")
    print(f"  Created             : {props.created or '-'}")
    print(f"  Modified            : {props.modified or '-'}")

    # CustomDocumentProperties tidak dibaca openpyxl secara langsung;
    # dibaca dari docProps/custom.xml di dalam zip .xlsm
    import zipfile, xml.etree.ElementTree as ET
    custom = {}
    try:
        with zipfile.ZipFile(path) as z:
            if "docProps/custom.xml" in z.namelist():
                root = ET.fromstring(z.read("docProps/custom.xml"))
                ns = {"p": "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
                      "vt": "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"}
                for prop in root.findall("p:property", ns):
                    name = prop.get("name")
                    val = ""
                    for child in prop:
                        val = child.text or ""
                    custom[name] = val
    except Exception as e:
        print(f"  (custom.xml tidak terbaca: {e})")

    if custom:
        print("  --- Audit_* (dari plugin) ---")
        for k in sorted(custom):
            print(f"  {k:22}: {custom[k]}")
    else:
        print("  FLAG: CustomDocumentProperties Audit_* TIDAK ADA — file mungkin tidak dikerjakan pakai plugin.")

    # Sheet identitas
    if "Identitas" in wb.sheetnames:
        ws = wb["Identitas"]
        print("  --- Identitas (sheet) ---")
        print(f"  Nama      : {ws['B3'].value or '-'}")
        print(f"  NIM       : {ws['B4'].value or '-'}")
        print(f"  Kelas     : {ws['B5'].value or '-'}")
        print(f"  Mata Kuliah: {ws['B6'].value or '-'}")
        print(f"  Judul     : {ws['B7'].value or '-'}")

    # Log
    result = {"path": str(path), "custom": custom}
    if "_AUDIT_LOG" in wb.sheetnames:
        ws = wb["_AUDIT_LOG"]
        rows = list(ws.iter_rows(min_row=2, max_col=6, values_only=True))
        rows = [r for r in rows if r[0] is not None or r[1]]
        print(f"  --- Log ({len(rows)} baris) ---")
        for r in rows[-8:]:
            print(f"  {r[0]} | {r[1]:10} | {r[2]} | aktif={r[3]}s | hash={r[5]}")
        # State H2:Q2
        state = {
            "active": ws["H2"].value, "idle": ws["I2"].value,
            "edit": ws["J2"].value, "paste": ws["K2"].value,
            "save": ws["L2"].value, "finished": ws["Q2"].value,
            "hash": ws["O2"].value,
        }
        print(f"  STATE: aktif={fmt_seconds(state['active'])} | diam={fmt_seconds(state['idle'])} "
              f"| edit={state['edit']} | paste={state['paste']} | save={state['save']} | selesai={state['finished']}")
        result["state"] = state

        # Penilaian sederhana
        active = int(state["active"] or 0)
        paste = int(state["paste"] or 0)
        edit = int(state["edit"] or 0)
        flags = []
        if not rows:
            flags.append("LOG KOSONG")
        if active == 0 and edit > 0:
            flags.append("CURIGA: ada edit tapi waktu aktif 0")
        if active < 600 and edit > 50:
            flags.append("CURIGA: aktif <10 mnt tapi edit banyak — kemungkinan paste / file jadi")
        if paste and edit and paste * 20 > edit:
            flags.append("CURIGA: paste mendominasi edit")
        if not custom:
            flags.append("TIDAK ADA Audit_* — plugin tidak jalan / file dibuat manual")
        if flags:
            print("  PENILAIAN: " + "; ".join(flags))
        else:
            print("  PENILAIAN: NORMAL (berdasarkan prototipe — dosen tetap verifikasi isi)")
        result["flags"] = flags
    else:
        print("  FLAG: sheet _AUDIT_LOG TIDAK ADA — file bukan dari template prototipe.")

    # Jurnal
    if "Jurnal Umum" in wb.sheetnames:
        ws = wb["Jurnal Umum"]
        filled = 0
        for row in ws.iter_rows(min_row=6, max_row=40, min_col=2, max_col=6, values_only=True):
            if any(v not in (None, "") for v in row):
                filled += 1
        print(f"  Jurnal Umum: {filled} baris terisi (dari template 35 baris)")
        print(f"  Total Debit (rumus): {ws['E41'].value} | Total Kredit (rumus): {ws['F41'].value}")
        result["jurnal_rows"] = filled

    # Hash konten untuk deteksi salinan antar file
    h = hashlib.sha256()
    if "Jurnal Umum" in wb.sheetnames:
        ws = wb["Jurnal Umum"]
        for row in ws.iter_rows(min_row=6, max_row=40, values_only=True):
            h.update(str(row).encode())
    print(f"  Hash isi Jurnal: {h.hexdigest()[:16]} (bandingkan antar mahasiswa — sama persis = salinan)")
    result["content_hash"] = h.hexdigest()
    return result


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    results = []
    for arg in sys.argv[1:]:
        r = check_one(Path(arg))
        if r:
            results.append(r)
    if len(results) > 1:
        print(f"\n{'='*62}\nPERBANDINGAN ANTAR FILE")
        seen = {}
        for r in results:
            ch = r.get("content_hash")
            if ch in seen:
                print(f"  SALINAN? {r['path']} isi Jurnal SAMA dengan {seen[ch]}")
            else:
                seen[ch] = r["path"]
        print("  (tidak ada yang sama = tidak ada laporan di atas)")


if __name__ == "__main__":
    main()
