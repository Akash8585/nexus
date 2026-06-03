@echo off
REM Windows fallback when GNU Make is not on PATH (install: winget install GnuWin32.Make)
set "MAKE_EXE=C:\Program Files (x86)\GnuWin32\bin\make.exe"
if not exist "%MAKE_EXE%" (
  echo Error: GNU Make not found at %MAKE_EXE%
  echo Install with: winget install GnuWin32.Make
  exit /b 1
)
"%MAKE_EXE%" %*
