@echo off
setlocal EnableExtensions

rem ============================================================
rem  Sikarsa Tracker Generator  -  checker.sikarsa.id
rem  Jalankan skrip ini setiap kali butuh template tugas baru.
rem  Template terbaru diunduh langsung dari situs, jadi selalu
rem  versi paling baru tanpa perlu unduh ulang skrip ini.
rem ============================================================

set "DESTDIR=%USERPROFILE%\Tracker"
set "URL=https://checker.sikarsa.id/api/template/baru"

echo.
echo  Sikarsa Tracker Generator
echo  -------------------------
echo  Membuat file template tracker baru di: %DESTDIR%
echo.

if not exist "%DESTDIR%\" mkdir "%DESTDIR%"

rem Daftarkan folder sebagai Trusted Location Excel (cukup sekali,
rem ditulis ke HKCU sehingga tidak butuh hak administrator).
reg query "HKCU\Software\Microsoft\Office\16.0\Excel\Security\Trusted Locations\LocationSikarsa" /v Path >nul 2>nul
if errorlevel 1 reg add "HKCU\Software\Microsoft\Office\16.0\Excel\Security\Trusted Locations\LocationSikarsa" /v Path /t REG_SZ /d "%DESTDIR%\" /f >nul 2>nul

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
set "DESTFILE=%DESTDIR%\Tracker_Audit_Tugas_%TS%.xlsm"

rem curl.exe tidak menambahkan Mark of the Web, sehingga file hasil
rem unduhan langsung bisa dipakai tanpa langkah Unblock di Properties.
where curl.exe >nul 2>nul
if errorlevel 1 goto bits

curl.exe -fsSL -o "%DESTFILE%" "%URL%"
if errorlevel 1 goto err
goto open

:bits
rem Fallback tanpa curl: BITS juga tidak menambahkan MOTW.
powershell -NoProfile -Command "Start-BitsTransfer -Source '%URL%' -Destination '%DESTFILE%'"
if errorlevel 1 goto err

:open
if not exist "%DESTFILE%" goto err
echo  Berhasil: %DESTFILE%
echo  File siap dipakai tanpa Unblock. Membuka di Excel...
start "" "%DESTFILE%"
echo.
echo  Selesai. Butuh file untuk tugas berikutnya?
echo  Jalankan skrip ini sekali lagi.
pause
exit /b 0

:err
echo  Gagal mengunduh template.
echo  Periksa koneksi internet, lalu jalankan lagi.
pause
exit /b 1
