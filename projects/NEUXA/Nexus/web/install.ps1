# ============================================================================
# NEUXA Lite Windows 一鍵安裝腳本 (PowerShell)
# 使用方法: irm https://neuxa.io/install.ps1 | iex
# ============================================================================

$ErrorActionPreference = "Stop"

# NEUXA Logo
Write-Host @"
    ███╗   ██╗███████╗██╗   ██╗██╗  ██╗ █████╗ 
    ████╗  ██║██╔════╝██║   ██║╚██╗██╔╝██╔══██╗
    ██╔██╗ ██║█████╗  ██║   ██║ ╚███╔╝ ███████║
    ██║╚██╗██║██╔══╝  ██║   ██║ ██╔██╗ ██╔══██║
    ██║ ╚████║███████╗╚██████╔╝██╔╝ ██╗██║  ██║
    ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
"@ -ForegroundColor Cyan
Write-Host "    精算未來的星艦代理人 🚀`n" -ForegroundColor Green
Write-Host "    Windows 安裝模式`n" -ForegroundColor Yellow

# 檢測作業系統
$OS = [System.Environment]::OSVersion.Platform
Write-Host "🔍 檢測到系統: Windows" -ForegroundColor Blue

# 檢查權限（需要管理員權限）
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  建議以系統管理員身份執行 PowerShell" -ForegroundColor Yellow
    Write-Host "   右鍵 PowerShell → 以系統管理員身份執行`n" -ForegroundColor Gray
}

# 檢查必要工具
Write-Host "📦 檢查依賴..." -ForegroundColor Blue

# 檢查 git
$gitInstalled = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if ($gitInstalled) {
    Write-Host "✅ Git 已安裝" -ForegroundColor Green
} else {
    Write-Host "⚠️  未檢測到 Git，建議安裝" -ForegroundColor Yellow
    Write-Host "   前往: https://git-scm.com/download/win" -ForegroundColor Gray
}

# 檢查 Ollama
$ollamaInstalled = $null -ne (Get-Command ollama -ErrorAction SilentlyContinue)
if ($ollamaInstalled) {
    try {
        $ollamaVersion = ollama --version 2>$null
        Write-Host "✅ Ollama 已安裝: $ollamaVersion" -ForegroundColor Green
    } catch {
        Write-Host "✅ Ollama 已安裝" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  未檢測到 Ollama" -ForegroundColor Yellow
    Write-Host "   建議安裝以實現 100% 本地運算（零 API 費用）" -ForegroundColor Gray
    Write-Host "   前往: https://ollama.com/download/windows" -ForegroundColor Gray
}

# 設定安裝路徑
$env:NEUXA_HOME = "$env:USERPROFILE\.neuxa"
$NEUXA_BIN = "$env:NEUXA_HOME\bin"
$NEUXA_VAULT = "$env:NEUXA_HOME\vault"
$NEUXA_MEMORY = "$env:NEUXA_HOME\memory"
$NEUXA_LOGS = "$env:NEUXA_HOME\logs"

Write-Host ""
Write-Host "📂 安裝路徑: $env:NEUXA_HOME" -ForegroundColor Blue

# 創建目錄結構
Write-Host "🗂️  建立目錄結構..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path $NEUXA_BIN | Out-Null
New-Item -ItemType Directory -Force -Path $NEUXA_VAULT | Out-Null
New-Item -ItemType Directory -Force -Path $NEUXA_MEMORY | Out-Null
New-Item -ItemType Directory -Force -Path $NEUXA_LOGS | Out-Null

# 建立 PowerShell 模組
Write-Host "⬇️  下載 NEUXA 核心..." -ForegroundColor Blue

$neuxaModule = @'
# NEUXA Lite PowerShell 模組
$script:NEUXA_VERSION = "1.0.0"
$script:NEUXA_HOME = $env:NEUXA_HOME

function Show-Logo {
    Write-Host @'
🚀 NEUXA Lite v1.0.0
   精算未來的星艦代理人
'@ -ForegroundColor Cyan
}

function Show-Help {
    Show-Logo
    Write-Host "使用方法: neuxa [命令]" -ForegroundColor White
    Write-Host ""
    Write-Host "命令:" -ForegroundColor Yellow
    Write-Host "  start       啟動 NEUXA 核心"
    Write-Host "  status      查看系統狀態"
    Write-Host "  config      編輯設定檔"
    Write-Host "  update      更新到最新版本"
    Write-Host "  uninstall   移除 NEUXA"
    Write-Host "  help        顯示此說明"
    Write-Host ""
    Write-Host "範例:" -ForegroundColor Gray
    Write-Host "  neuxa start    # 啟動 NEUXA"
    Write-Host "  neuxa status   # 查看狀態"
}

function Test-Ollama {
    $ollama = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollama) {
        Write-Host "✅ Ollama 運行中" -ForegroundColor Green
        Write-Host "   可用模型:" -ForegroundColor Gray
        try {
            $models = ollama list 2>$null | Select-Object -Skip 1 | Select-Object -First 5
            $models | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
        } catch {}
    } else {
        Write-Host "⚠️  Ollama 未安裝" -ForegroundColor Yellow
        Write-Host "   建議安裝以啟用本地 AI 功能" -ForegroundColor Gray
    }
}

function Start-Neuxa {
    Show-Logo
    Write-Host "🔄 正在啟動 NEUXA..." -ForegroundColor Blue
    Test-Ollama
    Write-Host ""
    Write-Host "💡 提示: NEUXA Lite 需要配合 OpenClaw 使用" -ForegroundColor Cyan
    Write-Host "   請確認 OpenClaw 已安裝並運行" -ForegroundColor Gray
}

function Get-NeuxaStatus {
    Show-Logo
    Write-Host "📊 系統狀態" -ForegroundColor White
    Write-Host "------------" -ForegroundColor Gray
    Test-Ollama
    Write-Host ""
    Write-Host "📁 目錄狀態:" -ForegroundColor White
    Write-Host "   NEUXA_HOME: $env:NEUXA_HOME" -ForegroundColor Gray
    if (Test-Path $env:NEUXA_HOME) {
        Get-ChildItem $env:NEUXA_HOME | ForEach-Object {
            Write-Host "   - $($_.Name) ($($_.Length) bytes)" -ForegroundColor Gray
        }
    }
}

function Update-Neuxa {
    Write-Host "🔄 檢查更新..." -ForegroundColor Blue
    irm https://enchanting-cuchufli-f38241.netlify.app/install.ps1 | iex
}

function Uninstall-Neuxa {
    Write-Host "⚠️  確定要移除 NEUXA? (Y/N)" -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        Remove-Item -Recurse -Force $env:NEUXA_HOME -ErrorAction SilentlyContinue
        # 移除 PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $newPath = ($currentPath -split ';' | Where-Object { $_ -notmatch '\\.neuxa\\bin' }) -join ';'
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "✅ NEUXA 已移除" -ForegroundColor Green
    } else {
        Write-Host "取消解除安裝" -ForegroundColor Gray
    }
}

# 主入口
param([string]$Command = "help")

switch ($Command) {
    "start" { Start-Neuxa }
    "status" { Get-NeuxaStatus }
    "config" { notepad "$env:NEUXA_HOME\config.json" }
    "update" { Update-Neuxa }
    "uninstall" { Uninstall-Neuxa }
    "help" { Show-Help }
    default { 
        Write-Host "❌ 未知命令: $Command" -ForegroundColor Red
        Write-Host "使用 'neuxa help' 查看說明" -ForegroundColor Gray
    }
}
'@

# 儲存 PowerShell 模組
$modulePath = "$NEUXA_BIN\neuxa.psm1"
$neuxaModule | Out-File -FilePath $modulePath -Encoding UTF8

# 建立 neuxa.cmd（讓命令提示字元也能用）
$cmdWrapper = @'
@ECHO OFF
powershell -ExecutionPolicy Bypass -Command "& '%USERPROFILE%\.neuxa\bin\neuxa.psm1' %*"
'@
$cmdWrapper | Out-File -FilePath "$NEUXA_BIN\neuxa.cmd" -Encoding ASCII

# 建立 neuxa.ps1（PowerShell 專用）
$psWrapper = @'
param([string]$Command = "help")
Import-Module "$env:USERPROFILE\.neuxa\bin\neuxa.psm1" -Force
& "$env:USERPROFILE\.neuxa\bin\neuxa.psm1" -Command $Command
'@
$psWrapper | Out-File -FilePath "$NEUXA_BIN\neuxa.ps1" -Encoding UTF8

# 建立預設設定檔
Write-Host "⚙️  建立設定檔..." -ForegroundColor Blue
$config = @{
    version = "1.0.0"
    name = "NEUXA Lite"
    home = $env:NEUXA_HOME
    features = @{
        local_ai = $true
        vault = $true
        memory = $true
    }
    models = @{
        default = "ollama/qwen3:4b"
        fast = "ollama/qwen3:4b"
        smart = "ollama/deepseek-r1:8b"
    }
    installed_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platform = "Windows"
} | ConvertTo-Json -Depth 3

$config | Out-File -FilePath "$env:NEUXA_HOME\config.json" -Encoding UTF8

# 加入 PATH
Write-Host "🔧 配置環境變數..." -ForegroundColor Blue
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$NEUXA_BIN*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$NEUXA_BIN", "User")
    Write-Host "✅ 已加入 PATH" -ForegroundColor Green
} else {
    Write-Host "✅ PATH 已配置" -ForegroundColor Green
}

# 立即生效 PATH（當前 session）
$env:Path = [Environment]::GetEnvironmentVariable("Path", "User")

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✅ NEUXA Lite 安裝成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步:" -ForegroundColor Blue
Write-Host ""
Write-Host "   1️⃣  重新開啟 PowerShell" -ForegroundColor White
Write-Host ""
Write-Host "   2️⃣  驗證安裝:" -ForegroundColor White
Write-Host "      neuxa help" -ForegroundColor Yellow
Write-Host ""
Write-Host "   3️⃣  查看狀態:" -ForegroundColor White
Write-Host "      neuxa status" -ForegroundColor Yellow
Write-Host ""
Write-Host "   4️⃣ (可選) 安裝 Ollama 以啟用本地 AI:" -ForegroundColor White
Write-Host "      前往: https://ollama.com/download/windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Cyan
Write-Host "   NEUXA Lite 是 OpenClaw 的輔助工具包" -ForegroundColor Gray
Write-Host "   請確保您已安裝 OpenClaw 以獲得完整體驗" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 開始您的 AI 轉型之旅！" -ForegroundColor Green
