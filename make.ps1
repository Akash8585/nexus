# PowerShell wrapper: run as `.\make start` or use a terminal with GNU Make on PATH
$makeExe = "C:\Program Files (x86)\GnuWin32\bin\make.exe"
if (-not (Test-Path $makeExe)) {
    Write-Error "GNU Make not found. Install: winget install GnuWin32.Make"
    exit 1
}
& $makeExe @args
