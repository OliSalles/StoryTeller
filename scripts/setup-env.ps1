# Script para configurar variaveis de ambiente
# Copia o arquivo de configuracao correto para .env

param(
    [string]$Environment = "local"
)

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-EnvContent($EnvPath) {
    if (Test-Path $EnvPath) {
        Write-ColorOutput Cyan "`nConteudo do arquivo:"
        $content = Get-Content $EnvPath
        foreach ($line in $content) {
            if ($line -and !$line.StartsWith("#")) {
                if ($line.Contains("=")) {
                    $key = $line.Split("=")[0]
                    Write-ColorOutput Yellow "  $($key.Trim())=..."
                }
            }
        }
    }
}

# Banner
Write-ColorOutput Blue "`n========================================"
Write-ColorOutput Blue "   Setup de Variaveis de Ambiente"
Write-ColorOutput Blue "========================================"

Write-ColorOutput Cyan "`nAmbiente selecionado: $Environment"

$sourceFile = "env.$Environment.example"
$targetFile = ".env"

# Verificar se o arquivo de origem existe
if (!(Test-Path $sourceFile)) {
    Write-ColorOutput Red "`nArquivo $sourceFile nao encontrado!"
    Write-ColorOutput Yellow "`nAmbientes disponiveis:"
    Write-ColorOutput Yellow "  - local      (desenvolvimento com Docker)"
    Write-ColorOutput Yellow "  - production (deploy na VPS)"
    Write-ColorOutput Yellow "  - static     (hospedagem estatica)"
    Write-ColorOutput Cyan "`nUso: npm run env:local, npm run env:production ou npm run env:static"
    exit 1
}

# Fazer backup do .env existente
if (Test-Path $targetFile) {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $backupFile = ".env.backup.$timestamp"
    Copy-Item $targetFile $backupFile
    Write-ColorOutput Yellow "`nBackup criado: $backupFile"
}

# Copiar o arquivo
try {
    Copy-Item $sourceFile $targetFile -Force
    Write-ColorOutput Green "`nArquivo .env configurado para: $Environment"
    
    # Mostrar conteudo
    Show-EnvContent $targetFile
    
    if ($Environment -eq "production") {
        Write-ColorOutput Yellow "`nIMPORTANTE - Configuracao de Producao:"
        Write-ColorOutput Yellow "   1. Edite o arquivo .env"
        Write-ColorOutput Yellow "   2. Ajuste DATABASE_URL com suas credenciais reais"
        Write-ColorOutput Yellow "   3. Ajuste JWT_SECRET com uma string segura"
        Write-ColorOutput Cyan "   4. Execute: npm run deploy:prod"
    } else {
        Write-ColorOutput Green "`nPronto para desenvolvimento local!"
        Write-ColorOutput Cyan "   Execute: npm run dev"
    }
    
} catch {
    Write-ColorOutput Red "`nErro ao copiar arquivo: $($_.Exception.Message)"
    exit 1
}

Write-Output ""

