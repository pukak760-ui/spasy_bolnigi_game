# =============================================================
#  Save the Patient! - tiny static web server for the dist folder
#  IMPORTANT: this file is ASCII-only on purpose. Windows
#  PowerShell 5.1 reads scripts without BOM using the system
#  ANSI codepage, so any Cyrillic text here could corrupt the
#  parsing on some machines. Keep all strings below in English.
# =============================================================
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'dist'

if (-not (Test-Path (Join-Path $root 'index.html'))) {
    Write-Host 'ERROR: dist folder with the built game was not found.' -ForegroundColor Red
    Write-Host 'Build the game first: npm install, then npm run build.' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}

# pick a free port: 8765, then 8766..8775 if busy
$port = 0
$listener = $null
for ($p = 8765; $p -le 8775; $p++) {
    $l = New-Object System.Net.HttpListener
    try {
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Start()
        $port = $p
        $listener = $l
        break
    } catch {
        $l = $null
    }
}
if ($null -eq $listener) {
    Write-Host 'ERROR: ports 8765-8775 are all busy. Close other servers and retry.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}

$url = "http://localhost:$port"
$mime = @{
    '.html'  = 'text/html; charset=utf-8'
    '.js'    = 'text/javascript; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.woff2' = 'font/woff2'
    '.json'  = 'application/json'
}

Write-Host ''
Write-Host '  GAME IS RUNNING: ' -NoNewline -ForegroundColor Green
Write-Host $url -ForegroundColor White
Write-Host '  Close this window to stop the server.' -ForegroundColor DarkGray
Write-Host ''

try { Start-Process $url } catch { Write-Host "  Open manually: $url" -ForegroundColor Yellow }

while ($listener.IsListening) {
    $ctx  = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
    try {
        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
            else { $ctx.Response.ContentType = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # /sdk.js is intentionally missing outside the Yandex platform:
            # the browser gets a 404 and the game simply runs without ads.
            $ctx.Response.StatusCode = 404
            $b = [System.Text.Encoding]::UTF8.GetBytes('404')
            $ctx.Response.OutputStream.Write($b, 0, $b.Length)
        }
    } finally {
        $ctx.Response.Close()
    }
}
