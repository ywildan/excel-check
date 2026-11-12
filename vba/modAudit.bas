Attribute VB_Name = "modAudit"
' ============================================================
' Prototipe Audit Excel v0.1 — modAudit
' Fungsi: timer AKTIF yang akurat (idle 5 detik = jeda)
' Cara kerja:
'  - Setiap 1 detik, TickTimer() dipanggil via Application.OnTime
'  - GetLastInputInfo() = waktu terakhir mouse ATAU keyboard
'    dipakai di SELURUH Windows (bukan cuma di Excel)
'  - Jika idle > 5000 ms  -> IdleSeconds bertambah, Active TIDAK
'  - Jika Excel bukan window aktif -> dihitung IDLE juga
'  - Jika ada input -> ActiveSeconds bertambah
' Catatan: ini PROTOTIPE VBA. Kelemahan: log masih bisa diedit
' manual oleh yang paham VBA. Versi final (VSTO) akan pakai
' Custom XML Part + hash yang lebih kuat.
' Hanya jalan di Excel Desktop Windows. Tidak jalan di
' Excel Online / Mac / Android.
' ============================================================
Option Explicit

' ---------- Windows API ----------
#If VBA7 Then
    Private Declare PtrSafe Function GetLastInputInfo Lib "user32" (ByRef plii As LASTINPUTINFO) As Long
    Private Declare PtrSafe Function GetTickCount Lib "kernel32" () As Long
    Private Declare PtrSafe Function GetForegroundWindow Lib "user32" () As LongPtr
#Else
    Private Declare Function GetLastInputInfo Lib "user32" (ByRef plii As LASTINPUTINFO) As Long
    Private Declare Function GetTickCount Lib "kernel32" () As Long
    Private Declare Function GetForegroundWindow Lib "user32" () As Long
#End If

Private Type LASTINPUTINFO
    cbSize As Long
    dwTime As Long
End Type

' ---------- Konstanta ----------
Public Const IDLE_THRESHOLD_MS As Long = 5000  ' 5 detik, sesuai permintaan
Public Const TICK_INTERVAL_SEC As Double = 1   ' cek tiap 1 detik

' ---------- State global (hidup selama file dibuka) ----------
Public gActiveSeconds As Long
Public gIdleSeconds As Long
Public gEditCount As Long
Public gPasteCount As Long
Public gSaveCount As Long
Public gFormulaCount As Long
Public gValueCount As Long
Public gIsTracking As Boolean
Public gIsPaused As Boolean
Public gIsFinished As Boolean
Public gNextTick As Date
Public gSessionStart As Date
Public gLastHash As String

' ============================================================
' MULAI / JEDA / SELESAI
' ============================================================
Public Sub StartTracking()
    If gIsFinished Then
        MsgBox "Tugas ini sudah dikunci (Selesai & Kunci). " & _
               "Buat salinan baru untuk mengerjakan ulang.", vbExclamation, "Audit Excel"
        Exit Sub
    End If
    If gIsTracking Then Exit Sub

    LoadStateFromSheets
    gIsTracking = True
    gIsPaused = False
    If gSessionStart = 0 Then gSessionStart = Now
    LogEvent "MULAI", "Pelacakan dimulai. Idle > 5 detik tidak dihitung."
    ScheduleTick
    UpdateDashboard
End Sub

Public Sub StopTracking()
    On Error Resume Next
    If gNextTick <> 0 Then Application.OnTime gNextTick, "TickTimer", , False
    gNextTick = 0
    gIsTracking = False
    SaveStateToSheets
    SaveAuditToProperties
    On Error GoTo 0
End Sub

Public Sub PauseTracking()
    If Not gIsTracking Then Exit Sub
    gIsPaused = True
    LogEvent "JEDA", "Dijeda manual oleh mahasiswa."
    UpdateDashboard
End Sub

Public Sub ResumeTracking()
    If Not gIsTracking Then
        StartTracking
        Exit Sub
    End If
    gIsPaused = False
    LogEvent "LANJUT", "Dilanjutkan setelah jeda."
    UpdateDashboard
End Sub

Public Sub FinishAndLock()
    If gIsFinished Then Exit Sub
    If MsgBox("Kunci tugas ini sebagai SELESAI?" & vbCrLf & vbCrLf & _
              "Setelah dikunci:" & vbCrLf & _
              "- Timer berhenti" & vbCrLf & _
              "- Sheet Identitas & Jurnal dikunci" & vbCrLf & _
              "- File siap dikumpulkan ke dosen", _
              vbYesNo + vbQuestion, "Selesai & Kunci") <> vbYes Then Exit Sub

    StopTracking
    gIsFinished = True
    LogEvent "SELESAI", "Tugas dikunci. Aktif=" & FormatSeconds(gActiveSeconds) & _
               ", Idle=" & FormatSeconds(gIdleSeconds) & _
               ", Edit=" & gEditCount & ", Paste=" & gPasteCount
    SaveStateToSheets
    SaveAuditToProperties
    LockIdentity True
    ProtectJurnal True
    UpdateDashboard
    ThisWorkbook.Save
    MsgBox "Tugas dikunci dan tersimpan." & vbCrLf & _
           "Waktu aktif: " & FormatSeconds(gActiveSeconds) & vbCrLf & _
           "Waktu diam: " & FormatSeconds(gIdleSeconds), vbInformation, "Audit Excel"
End Sub

' ============================================================
' TIMER INTI — dipanggil tiap 1 detik
' ============================================================
Public Sub TickTimer()
    If Not gIsTracking Then Exit Sub
    If gIsFinished Then Exit Sub

    ' Jadwalkan tick berikutnya dulu, supaya tidak putus kalau ada error
    ScheduleTick

    If gIsPaused Then
        gIdleSeconds = gIdleSeconds + 1
        UpdateDashboard
        Exit Sub
    End If

    Dim idleMs As Long
    idleMs = GetIdleMs()

    If idleMs > IDLE_THRESHOLD_MS Then
        gIdleSeconds = gIdleSeconds + 1
    ElseIf Not IsExcelForeground() Then
        ' Excel dibuka tapi user lagi di aplikasi lain (misal browser/Word)
        gIdleSeconds = gIdleSeconds + 1
    Else
        gActiveSeconds = gActiveSeconds + 1
    End If

    ' Update dashboard tiap 5 detik saja, biar tidak berat
    If (gActiveSeconds + gIdleSeconds) Mod 5 = 0 Then UpdateDashboard
End Sub

Private Sub ScheduleTick()
    On Error Resume Next
    gNextTick = Now + TimeSerial(0, 0, 1)
    Application.OnTime gNextTick, "TickTimer", , True
    On Error GoTo 0
End Sub

' Millidetik sejak input terakhir (mouse ATAU keyboard, seluruh Windows)
Public Function GetIdleMs() As Long
    Dim lii As LASTINPUTINFO
    Dim nowTick As Long
    Dim diff As Double

    lii.cbSize = Len(lii)
    If GetLastInputInfo(lii) = 0 Then
        GetIdleMs = 0
        Exit Function
    End If

    nowTick = GetTickCount()
    ' GetTickCount melingkar tiap ~49 hari, tangani dengan Double
    diff = (CDbl(nowTick And &HFFFFFFFF) - CDbl(lii.dwTime And &HFFFFFFFF))
    If diff < 0 Then diff = diff + 4294967296#
    GetIdleMs = CLng(diff)
End Function

#If VBA7 Then
Private Function IsExcelForeground() As Boolean
    On Error Resume Next
    IsExcelForeground = (GetForegroundWindow() = Application.hWnd)
    On Error GoTo 0
End Function
#Else
Private Function IsExcelForeground() As Boolean
    On Error Resume Next
    IsExcelForeground = (GetForegroundWindow() = Application.hWnd)
    On Error GoTo 0
End Function
#End If

' ============================================================
' PENCATATAN EDIT / PASTE — dipanggil dari ThisWorkbook
' ============================================================
Public Sub RegisterChange(ByVal Target As Range, ByVal isPaste As Boolean)
    If Not gIsTracking Then Exit Sub
    If gIsFinished Then Exit Sub
    If Target Is Nothing Then Exit Sub

    ' Abaikan perubahan di sheet Dashboard / Log / Petunjuk
    Dim wsName As String
    wsName = Target.Worksheet.Name
    If wsName = "Dashboard Audit" Or wsName = "_AUDIT_LOG" Or wsName = "Petunjuk" Then Exit Sub

    gEditCount = gEditCount + 1

    Dim c As Range
    For Each c In Target.Cells
        If c.HasFormula Then
            gFormulaCount = gFormulaCount + 1
        ElseIf Trim(CStr(c.Value)) <> "" Then
            gValueCount = gValueCount + 1
        End If
    Next c

    ' Paste = sekali ubah banyak sel, atau CutCopyMode masih aktif
    If isPaste Or Target.Cells.Count > 1 Then
        gPasteCount = gPasteCount + 1
        LogEvent "PASTE", Target.Address & " (" & Target.Cells.Count & " sel) di " & wsName
    End If
End Sub

' ============================================================
' LOG & DASHBOARD
' ============================================================
Public Sub LogEvent(ByVal evType As String, ByVal detail As String)
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("_AUDIT_LOG")
    Dim r As Long
    r = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
    If r < 2 Then r = 2

    ' Hash rantai sederhana: hash(baris sebelumnya + isi baru)
    ' BUKAN pengganti tanda tangan digital — hanya untuk
    ' mendeteksi edit log yang ceroboh di prototipe ini.
    Dim payload As String
    payload = gLastHash & "|" & Format(Now, "yyyy-mm-dd hh:nn:ss") & "|" & evType & "|" & detail
    gLastHash = SimpleHash(payload)

    ws.Cells(r, 1).Value = Now
    ws.Cells(r, 2).Value = evType
    ws.Cells(r, 3).Value = detail
    ws.Cells(r, 4).Value = gActiveSeconds
    ws.Cells(r, 5).Value = gIdleSeconds
    ws.Cells(r, 6).Value = gLastHash
    On Error GoTo 0
End Sub

Public Sub UpdateDashboard()
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Dashboard Audit")
    If ws Is Nothing Then Exit Sub

    Dim statusText As String
    If gIsFinished Then
        statusText = "SELESAI & TERKUNCI"
    ElseIf Not gIsTracking Then
        statusText = "BELUM DIMULAI"
    ElseIf gIsPaused Then
        statusText = "DIJEDA"
    ElseIf GetIdleMs() > IDLE_THRESHOLD_MS Then
        statusText = "IDLE — timer jeda (>5 detik diam)"
    Else
        statusText = "AKTIF — timer jalan"
    End If

    ws.Range("B3").Value = statusText
    ws.Range("B4").Value = FormatSeconds(gActiveSeconds)
    ws.Range("B5").Value = gActiveSeconds
    ws.Range("B6").Value = FormatSeconds(gIdleSeconds)
    ws.Range("B7").Value = gIdleSeconds
    ws.Range("B8").Value = gEditCount
    ws.Range("B9").Value = gPasteCount
    ws.Range("B10").Value = gSaveCount
    ws.Range("B11").Value = gFormulaCount
    ws.Range("B12").Value = gValueCount
    If gSessionStart <> 0 Then ws.Range("B13").Value = gSessionStart
    ws.Range("B14").Value = Now
    ws.Range("B15").Value = gLastHash
    On Error GoTo 0
End Sub

Public Function FormatSeconds(ByVal totalSec As Long) As String
    Dim h As Long, m As Long, s As Long
    h = totalSec \ 3600
    m = (totalSec Mod 3600) \ 60
    s = totalSec Mod 60
    FormatSeconds = h & " jam " & m & " mnt " & s & " dtk"
End Function

' Hash FNV-1a 32-bit, hasil 8 digit hex. Sederhana, cepat, cukup untuk prototipe.
Public Function SimpleHash(ByVal s As String) As String
    Dim h As Long
    Dim i As Long
    Dim b As Long
    h = &H811C9DC5
    For i = 1 To Len(s)
        b = Asc(Mid$(s, i, 1))
        h = h Xor b
        h = (h * &H1000193) And &HFFFFFFFF
    Next i
    SimpleHash = Right$("00000000" & Hex$(h And &HFFFFFFFF), 8)
End Function

' ============================================================
' SIMPAN / MUAT STATE — supaya angka tidak hilang saat tutup-buka
' State disimpan di sheet _AUDIT_LOG baris 1 (kolom H:N, tersembunyi
' dari tampilan biasa) + CustomDocumentProperties.
' ============================================================
Public Sub SaveStateToSheets()
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("_AUDIT_LOG")
    ws.Range("H1").Value = "STATE"
    ws.Range("H2").Value = gActiveSeconds
    ws.Range("I2").Value = gIdleSeconds
    ws.Range("J2").Value = gEditCount
    ws.Range("K2").Value = gPasteCount
    ws.Range("L2").Value = gSaveCount
    ws.Range("M2").Value = gFormulaCount
    ws.Range("N2").Value = gValueCount
    ws.Range("O2").Value = gLastHash
    ws.Range("P2").Value = gSessionStart
    ws.Range("Q2").Value = gIsFinished
    On Error GoTo 0
End Sub

Public Sub LoadStateFromSheets()
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("_AUDIT_LOG")
    If ws.Range("H1").Value = "STATE" Then
        gActiveSeconds = CLng(Nz(ws.Range("H2").Value, 0))
        gIdleSeconds = CLng(Nz(ws.Range("I2").Value, 0))
        gEditCount = CLng(Nz(ws.Range("J2").Value, 0))
        gPasteCount = CLng(Nz(ws.Range("K2").Value, 0))
        gSaveCount = CLng(Nz(ws.Range("L2").Value, 0))
        gFormulaCount = CLng(Nz(ws.Range("M2").Value, 0))
        gValueCount = CLng(Nz(ws.Range("N2").Value, 0))
        gLastHash = CStr(Nz(ws.Range("O2").Value, ""))
        If IsDate(ws.Range("P2").Value) Then gSessionStart = CDate(ws.Range("P2").Value)
        gIsFinished = CBool(Nz(ws.Range("Q2").Value, False))
    End If
    On Error GoTo 0
End Sub

Private Function Nz(ByVal v As Variant, ByVal dflt As Variant) As Variant
    If IsEmpty(v) Or IsNull(v) Or Trim(CStr(v)) = "" Then
        Nz = dflt
    Else
        Nz = v
    End If
End Function

Public Sub SaveAuditToProperties()
    On Error Resume Next
    Dim props As DocumentProperties
    Set props = ThisWorkbook.CustomDocumentProperties
    SetOrAddProp props, "Audit_NIM", msoPropertyTypeString, GetIdentityValue("NIM")
    SetOrAddProp props, "Audit_Nama", msoPropertyTypeString, GetIdentityValue("Nama")
    SetOrAddProp props, "Audit_ActiveSeconds", msoPropertyTypeNumber, gActiveSeconds
    SetOrAddProp props, "Audit_IdleSeconds", msoPropertyTypeNumber, gIdleSeconds
    SetOrAddProp props, "Audit_EditCount", msoPropertyTypeNumber, gEditCount
    SetOrAddProp props, "Audit_PasteCount", msoPropertyTypeNumber, gPasteCount
    SetOrAddProp props, "Audit_LastHash", msoPropertyTypeString, gLastHash
    SetOrAddProp props, "Audit_Finished", msoPropertyTypeBoolean, gIsFinished
    On Error GoTo 0
End Sub

Private Sub SetOrAddProp(ByVal props As DocumentProperties, ByVal nm As String, _
                         ByVal pType As MsoDocProperties, ByVal v As Variant)
    On Error Resume Next
    props(nm).Value = v
    If Err.Number <> 0 Then
        Err.Clear
        props.Add nm, False, pType, v
    End If
    On Error GoTo 0
End Sub

' ============================================================
' TOMBOL RIBBON — dipanggil dari customUI.xml
' ============================================================
Public Sub Ribbon_Mulai(control As IRibbonControl)
    If Not IsIdentityFilled() Then
        MsgBox "Isi dulu sheet Identitas (Nama, NIM, Kelas, Mata Kuliah, Judul Tugas), lalu tekan Mulai.", _
               vbExclamation, "Audit Excel"
        ThisWorkbook.Worksheets("Identitas").Activate
        Exit Sub
    End If
    StartTracking
    MsgBox "Pelacakan dimulai." & vbCrLf & _
           "Timer hanya jalan saat kamu aktif (mouse/keyboard bergerak)." & vbCrLf & _
           "Diam > 5 detik = timer jeda otomatis.", vbInformation, "Audit Excel"
End Sub

Public Sub Ribbon_Jeda(control As IRibbonControl)
    If gIsPaused Then ResumeTracking Else PauseTracking
End Sub

Public Sub Ribbon_Selesai(control As IRibbonControl)
    FinishAndLock
End Sub

Public Sub Ribbon_LihatLog(control As IRibbonControl)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("_AUDIT_LOG")
    ws.Visible = xlSheetVisible
    ws.Activate
    MsgBox "Ini sheet log mentah. Jangan diedit — kalau diedit, hash di Dashboard tidak akan cocok dan dosen akan melihatnya sebagai manipulasi." & vbCrLf & _
           "Setelah melihat, sheet ini akan disembunyikan lagi saat file disimpan/ditutup.", vbInformation, "Audit Excel"
End Sub

Public Sub Ribbon_ResetDemo(control As IRibbonControl)
    If MsgBox("Reset SEMUA data audit demo ini ke nol?" & vbCrLf & _
              "Hanya untuk pengujian. Jangan dipakai untuk tugas yang sudah dikerjakan.", _
              vbYesNo + vbQuestion, "Reset Demo") <> vbYes Then Exit Sub
    StopTracking
    gActiveSeconds = 0: gIdleSeconds = 0: gEditCount = 0: gPasteCount = 0
    gSaveCount = 0: gFormulaCount = 0: gValueCount = 0: gLastHash = ""
    gIsFinished = False: gSessionStart = 0
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("_AUDIT_LOG")
    ws.Rows("2:1000").ClearContents
    ws.Range("H2:Q2").ClearContents
    LockIdentity False
    ProtectJurnal False
    SaveStateToSheets
    UpdateDashboard
    MsgBox "Direset. Silakan isi Identitas lalu tekan Mulai.", vbInformation, "Audit Excel"
End Sub
