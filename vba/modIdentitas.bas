Attribute VB_Name = "modIdentitas"
' ============================================================
' Prototipe Audit Excel v0.1 — modIdentitas
' Form identitas berbasis SHEET (bukan UserForm), supaya
' prototipe ini bisa diimpor hanya dari 2 file .bas,
' tanpa file .frx UserForm yang rapuh.
'
' Layout sheet "Identitas":
'   B3  Nama
'   B4  NIM
'   B5  Kelas
'   B6  Mata Kuliah
'   B7  Judul Tugas
'   B8  Tanggal (diisi otomatis saat Mulai)
' ============================================================
Option Explicit

Public Function GetIdentityValue(ByVal fieldName As String) As String
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Identitas")
    Select Case UCase$(fieldName)
        Case "NAMA": GetIdentityValue = Trim(CStr(ws.Range("B3").Value))
        Case "NIM": GetIdentityValue = Trim(CStr(ws.Range("B4").Value))
        Case "KELAS": GetIdentityValue = Trim(CStr(ws.Range("B5").Value))
        Case "MATKUL", "MATA KULIAH": GetIdentityValue = Trim(CStr(ws.Range("B6").Value))
        Case "TUGAS", "JUDUL TUGAS": GetIdentityValue = Trim(CStr(ws.Range("B7").Value))
        Case Else: GetIdentityValue = ""
    End Select
    On Error GoTo 0
End Function

Public Function IsIdentityFilled() As Boolean
    IsIdentityFilled = (GetIdentityValue("Nama") <> "" _
        And GetIdentityValue("NIM") <> "" _
        And GetIdentityValue("Kelas") <> "" _
        And GetIdentityValue("Matkul") <> "" _
        And GetIdentityValue("Tugas") <> "")
End Function

Public Function IdentityMissingList() As String
    Dim s As String
    If GetIdentityValue("Nama") = "" Then s = s & "- Nama" & vbCrLf
    If GetIdentityValue("NIM") = "" Then s = s & "- NIM" & vbCrLf
    If GetIdentityValue("Kelas") = "" Then s = s & "- Kelas" & vbCrLf
    If GetIdentityValue("Matkul") = "" Then s = s & "- Mata Kuliah" & vbCrLf
    If GetIdentityValue("Tugas") = "" Then s = s & "- Judul Tugas" & vbCrLf
    IdentityMissingList = s
End Function

' Kunci / buka sheet Identitas. Tanpa password di prototipe —
' versi final (VSTO) akan pakai proteksi + validasi server.
Public Sub LockIdentity(ByVal doLock As Boolean)
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Identitas")
    If doLock Then
        ws.Range("B3:B7").Locked = True
        ws.Protect Password:="", UserInterfaceOnly:=True
    Else
        ws.Unprotect Password:=""
        ws.Range("B3:B7").Locked = False
    End If
    On Error GoTo 0
End Sub

Public Sub ProtectJurnal(ByVal doLock As Boolean)
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Jurnal Umum")
    ' Jurnal tetap bisa diedit selama mengerjakan; saat selesai,
    ' proteksi dengan UserInterfaceOnly agar VBA tetap bisa menulis
    ' tapi user tidak bisa mengubah sel isi secara manual.
    ' (Prototipe: tanpa password, supaya dosen bisa membuka bila perlu)
    If doLock Then
        ws.Protect Password:="", UserInterfaceOnly:=True
    Else
        ws.Unprotect Password:=""
    End If
    On Error GoTo 0
End Sub
