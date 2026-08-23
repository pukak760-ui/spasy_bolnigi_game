# Спаси Больного! — простой локальный веб-сервер для папки dist (Windows PowerShell)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'dist'
$port = 8765
$url  = "http://localhost:$port"

if (-not (Test-Path (Join-Path $root 'index.html'))) {
    Write-Host 'ОШИБКА: папка dist с собранной игрой не найдена.' -ForegroundColor Red
    Write-Host 'Соберите игру: npm install, затем npm run build.' -ForegroundColor Yellow
    Read-Host 'Нажмите Enter для выхода'
    exit 1
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("$url/")
try {
    $listener.Start()
} catch {
    Write-Host "ОШИБКА: не удалось занять порт $port. Закройте другие серверы и повторите." -ForegroundColor Red
    Read-Host 'Нажмите Enter для выхода'
    exit 1
}

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

Write-Host "  Игра запущена: $url" -ForegroundColor Green
Write-Host '  Окно можно закрыть, чтобы остановить сервер.' -ForegroundColor DarkGray
Start-Process $url

while ($listener.IsListening) {
    $ctx  = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
    try {
        if ((Test-Path $file -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
            else { $ctx.Response.ContentType = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # /sdk.js намеренно отсутствует вне платформы — браузер получит 404,
            # игра корректно работает без SDK (реклама просто не показывается)
            $ctx.Response.StatusCode = 404
            $b = [System.Text.Encoding]::UTF8.GetBytes('404')
            $ctx.Response.OutputStream.Write($b, 0, $b.Length)
        }
    } finally {
        $ctx.Response.Close()
    }
}
