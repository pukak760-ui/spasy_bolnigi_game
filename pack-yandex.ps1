# =============================================================
#  Save the Patient! - Yandex Games archive builder
#  Zips the CONTENTS of dist/ into spasi-bolnogo-yandex.zip and
#  then VALIDATES the archive (exactly one index.html, in root).
#  ASCII-only on purpose: Windows PowerShell 5.1 reads BOM-less
#  scripts in the ANSI codepage; Cyrillic text would corrupt it.
# =============================================================
$ErrorActionPreference = 'Stop'
$dist    = Join-Path $PSScriptRoot 'dist'
$zipName = 'spasi-bolnogo-yandex.zip'
$zipPath = Join-Path $PSScriptRoot $zipName

Write-Host ''
Write-Host '  YANDEX GAMES ARCHIVE BUILDER' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    Write-Host 'ERROR: dist/index.html not found. Build the game first:' -ForegroundColor Red
    Write-Host '       npm install' -ForegroundColor Yellow
    Write-Host '       npm run build' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}

# ---------- integrity guard: refuse to pack a STALE or broken build ----------
$html = Get-Content (Join-Path $dist 'index.html') -Raw
$lastWrite = (Get-Item (Join-Path $dist 'index.html')).LastWriteTime
Write-Host ('  Build date   : {0}' -f $lastWrite)

$problems = @()
if ($html -notmatch 'scheduleReady')        { $problems += 'missing inline LoadingAPI.ready() (scheduleReady)' }
if ($html -notmatch 'boot-splash')          { $problems += 'missing boot splash' }
if ($html -notmatch 'environment\.i18n\.lang') { $problems += 'missing language auto-detection (2.14)' }
if ($html -match 'src="/assets/')           { $problems += 'ABSOLUTE asset paths found (stale build, base "./" lost)' }
if ($html -notmatch 'src="\./assets/')      { $problems += 'no relative ./assets/ paths found' }

if ($problems.Count -gt 0) {
    Write-Host ''
    Write-Host 'REFUSING TO PACK — the build in dist/ is stale or broken:' -ForegroundColor Red
    foreach ($p in $problems) { Write-Host ('   - ' + $p) -ForegroundColor Red }
    Write-Host ''
    Write-Host 'Run "npm run build" first, then start this script again.' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host '  Build check  : OK (all platform fixes are present)' -ForegroundColor Green

# fresh archive every time
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# zip CONTENTS of dist (star!), so index.html lands in the archive root
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zipPath -CompressionLevel Optimal

# ---------- validation: the exact check Yandex moderators run ----------
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $allIndex    = @($zip.Entries | Where-Object { $_.Name -eq 'index.html' })
    $rootIndex   = @($zip.Entries | Where-Object { $_.FullName -eq 'index.html' })
    $totalFiles  = @($zip.Entries | Where-Object { $_.FullName -notlike '*/' }).Count
    $totalSizeKB = [math]::Round((Get-Item $zipPath).Length / 1024)
} finally {
    $zip.Dispose()
}

Write-Host ('  Files packed : {0}' -f $totalFiles)
Write-Host ('  Archive size : {0} KB' -f $totalSizeKB)
Write-Host ('  index.html   : {0} (in root: {1})' -f $allIndex.Count, $rootIndex.Count)

if ($allIndex.Count -ne 1 -or $rootIndex.Count -ne 1) {
    Write-Host ''
    Write-Host 'FAILED: the archive must contain exactly one index.html in its root.' -ForegroundColor Red
    Write-Host '        This builder packs dist/* only, so this should never happen.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}

Write-Host ''
Write-Host '  OK! Upload this file to the Yandex Games console draft:' -ForegroundColor Green
Write-Host "  $zipPath" -ForegroundColor White
Write-Host ''

try { explorer.exe ('/select,"{0}"' -f $zipPath) } catch { }
Read-Host 'Press Enter to exit'
exit 0
