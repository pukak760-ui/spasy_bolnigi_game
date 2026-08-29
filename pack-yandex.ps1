# =============================================================
#  Save the Patient! - Yandex Games archive builder (FOOLPROOF)
#
#  Builds spasi-bolnogo-yandex.zip from the CONTENTS of dist/
#  (index.html in the archive root) and then VALIDATES it exactly
#  like Yandex moderation does. A broken archive can never leave
#  this script.
#
#  IMPORTANT - why the ZIP is built file-by-file:
#  On PowerShell 5.1 / .NET Framework (Windows), both
#  Compress-Archive and ZipFile.CreateFromDirectory write entry
#  names with BACKSLASHES ("assets\index-....css"). Browsers and
#  the Yandex platform expect FORWARD slashes ("assets/..."), so
#  the game 404'd on its own CSS/JS. This script creates every
#  entry manually and forces "/" in entry names - backslashes can
#  never leak into the archive.
#
#  ASCII-only on purpose: PowerShell 5.1 reads BOM-less scripts
#  in the ANSI codepage, so any non-ASCII character here could
#  corrupt parsing or console output.
# =============================================================
$ErrorActionPreference = 'Stop'
$dist      = Join-Path $PSScriptRoot 'dist'
$zipName   = 'spasi-bolnogo-yandex.zip'
$zipPath   = Join-Path $PSScriptRoot $zipName
$indexHtml = Join-Path $dist 'index.html'

Write-Host ''
Write-Host '  YANDEX GAMES ARCHIVE BUILDER' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $indexHtml)) {
    Write-Host 'ERROR: dist/index.html not found. Build the game first:' -ForegroundColor Red
    Write-Host '       npm install' -ForegroundColor Yellow
    Write-Host '       npm run build' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# ---------------- pre-flight: build freshness & platform markers ----------------
$buildDate = (Get-Item $indexHtml).LastWriteTime
$html = Get-Content $indexHtml -Raw
$markers = @('scheduleReady', 'boot-splash', 'environment.i18n.lang', './assets/')
$missingMarkers = @($markers | Where-Object { -not $html.Contains($_) })
$badPaths = [regex]::Matches($html, 'src="/assets/|href="/assets/')

Write-Host ('  Build date   : {0}' -f $buildDate.ToString('yyyy-MM-dd HH:mm:ss'))
if ($missingMarkers.Count -gt 0) {
    Write-Host ('ERROR: dist/index.html is OUTDATED (missing: {0}).' -f ($missingMarkers -join ', ')) -ForegroundColor Red
    Write-Host '       Rebuild first: npm run build, then run this script again.' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}
if ($badPaths.Count -gt 0) {
    Write-Host 'ERROR: dist/index.html has ABSOLUTE asset paths (/assets/...).' -ForegroundColor Red
    Write-Host '       vite.config.js must contain base: "./" - then rebuild.' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host '  Build check  : OK (all platform fixes present, paths relative)' -ForegroundColor Green

# ---------------- sanitize: strip external URLs from the build ----------------
# Yandex moderation rejects archives containing links to external services or
# storage ("service storage" rule). Its scanner greps every file in the ZIP,
# so even license-banner URLs inside the minified bundle would trigger it.
# The sanitizer keeps http://www.w3.org/* (SVG namespace ids, never fetched).
# Implemented inline (pure .NET) so it works WITHOUT Node.js on PATH.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$textExts  = @('.js', '.css', '.html', '.svg')
$sanitized = 0
foreach ($f in Get-ChildItem -Path $dist -Recurse -File) {
    if ($textExts -notcontains $f.Extension.ToLower()) { continue }
    $text  = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $count = [regex]::Matches($text, 'https?://(?!www\.w3\.org)').Count
    if ($count -gt 0) {
        $clean = [regex]::Replace($text, 'https?://(?!www\.w3\.org)', 'about:blank#')
        [System.IO.File]::WriteAllText($f.FullName, $clean, $utf8NoBom)
        $sanitized += $count
    }
}
Write-Host ('  Sanitize     : {0} external URL(s) neutralized in dist/' -f $sanitized) -ForegroundColor Cyan

# ---------------- create the ZIP manually, one entry per file ----------------
# Entry names are forced to FORWARD slashes (see header). $false = do not
# include the dist folder itself, so index.html lands in the archive root.
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$distFull = (Resolve-Path $dist).Path.TrimEnd('\')
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $allFiles = Get-ChildItem -Path $dist -Recurse -File
    foreach ($f in $allFiles) {
        $rel = $f.FullName.Substring($distFull.Length + 1).Replace('\', '/')
        $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
        $es = $entry.Open()
        try {
            $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
            $es.Write($bytes, 0, $bytes.Length)
        } finally {
            $es.Dispose()
        }
    }
} finally {
    $archive.Dispose()
}

# ---------------- validate the ZIP ----------------
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    # normalize defensively, even though we just wrote them with "/"
    $names      = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    $fileCount  = @($names | Where-Object { $_ -notlike '*/' }).Count
    $assetCount = @($names | Where-Object { $_ -like 'assets/*' }).Count
    $rootIndex  = @($names | Where-Object { $_ -eq 'index.html' }).Count
    $anyIndex   = @($names | Where-Object { ($_ -split '/')[-1] -eq 'index.html' }).Count
} finally {
    $zip.Dispose()
}

$sizeKB = [math]::Round((Get-Item $zipPath).Length / 1024)
Write-Host ('  Archive size : {0} KB' -f $sizeKB)
Write-Host ('  Entries      : {0} files (assets folder: {1})' -f $fileCount, $assetCount)
Write-Host ('  index.html   : {0} in root, {1} total' -f $rootIndex, $anyIndex)

$fail = $false

# rule 1: exactly one index.html, and it must be at the archive root
if ($rootIndex -ne 1 -or $anyIndex -ne 1) {
    Write-Host 'FAILED: the ZIP must contain exactly ONE index.html at its root.' -ForegroundColor Red
    $fail = $true
}

# rule 2: assets folder must exist and be non-empty (this is what broke before:
# an archive uploaded without assets/ boots index.html but 404s on CSS/JS)
if ($assetCount -lt 2) {
    Write-Host 'FAILED: the ZIP is missing the assets/ folder (JS/CSS bundles).' -ForegroundColor Red
    $fail = $true
}

# rule 4: NO external http(s) links ANYWHERE in the build (index.html, JS, CSS,
# SVG). Yandex moderation's "service storage" scanner greps every file in the
# ZIP — even license-banner URLs inside the minified bundle trigger it.
# http://www.w3.org/* is allowed: those are SVG/XML namespace identifiers that
# are never fetched over the network.
$extTotal = 0
$textFiles = @(Get-ChildItem $dist -Recurse -File -Include '*.js', '*.css', '*.html', '*.svg')
foreach ($tf in $textFiles) {
    $t = Get-Content $tf.FullName -Raw
    foreach ($m in [regex]::Matches($t, 'https?://')) {
        $snippet = $t.Substring($m.Index, [math]::Min(24, $t.Length - $m.Index))
        if (-not $snippet.StartsWith('http://www.w3.org')) { $extTotal++ }
    }
}
if ($extTotal -gt 0) {
    Write-Host ('FAILED: the build still contains {0} external link(s).' -f $extTotal) -ForegroundColor Red
    Write-Host '        The inline URL sanitizer above must have failed to run.' -ForegroundColor Red
    $fail = $true
}

# rule 5 (bulletproof): every file referenced by index.html must exist in the ZIP
$refs = [regex]::Matches($html, '\./assets/([A-Za-z0-9._-]+)') | ForEach-Object { 'assets/' + $_.Groups[1].Value }
$refs += [regex]::Matches($html, 'href="\./([A-Za-z0-9._-]+)"') | ForEach-Object { $_.Groups[1].Value }
$refs = @($refs | Sort-Object -Unique)
$missingRefs = @($refs | Where-Object { $names -notcontains $_ })
if ($missingRefs.Count -gt 0) {
    Write-Host 'FAILED: index.html references files that are NOT in the ZIP:' -ForegroundColor Red
    foreach ($m in $missingRefs) { Write-Host ('        - {0}' -f $m) -ForegroundColor Red }
    $fail = $true
}

if ($fail) {
    Write-Host ''
    Write-Host 'The archive was NOT produced correctly. Rebuild (npm run build)' -ForegroundColor Red
    Write-Host 'and run this script again. Never upload a hand-made ZIP.' -ForegroundColor Red
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Read-Host 'Press Enter to exit'
    exit 1
}

Write-Host ''
Write-Host '  OK! Every file referenced by index.html is inside the ZIP,' -ForegroundColor Green
Write-Host '  with correct forward-slash paths. Safe to upload.' -ForegroundColor Green
Write-Host '  Upload this file to the Yandex Games console draft:' -ForegroundColor Green
Write-Host "  $zipPath" -ForegroundColor White
Write-Host ''

try { explorer.exe ('/select,"{0}"' -f $zipPath) } catch { }
Read-Host 'Press Enter to exit'
exit 0
