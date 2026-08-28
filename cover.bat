@echo off
setlocal enabledelayedexpansion

REM ================================================
REM  Auto Push ke GitHub - rothed-db-covers
REM ================================================

set REPO_URL=https://github.com/Roth-Links/rothed-db-covers.git
set BRANCH=main

echo.
echo === Push ke %REPO_URL% ===
echo.

REM Cek apakah folder ini sudah git repo
if not exist ".git" (
    echo [INFO] Belum ada git repo, inisialisasi...
    git init
    git remote add origin %REPO_URL%
) else (
    echo [INFO] Git repo sudah ada, cek remote...
    git remote get-url origin >nul 2>&1
    if errorlevel 1 (
        git remote add origin %REPO_URL%
    )
)

REM Minta pesan commit dari user
set /p COMMIT_MSG="Masukkan pesan commit (kosongkan untuk default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update covers

echo.
echo [INFO] Menambahkan semua perubahan...
git add .

echo [INFO] Commit dengan pesan: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

echo [INFO] Pastikan branch %BRANCH%...
git branch -M %BRANCH%

echo [INFO] Push ke origin/%BRANCH%...
git push -u origin %BRANCH%

if errorlevel 1 (
    echo.
    echo [ERROR] Push gagal. Cek koneksi, autentikasi, atau konflik branch.
) else (
    echo.
    echo [SUKSES] Push berhasil ke %REPO_URL%
)

echo.
pause
