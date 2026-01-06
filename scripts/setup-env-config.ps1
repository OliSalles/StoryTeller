# Script para configurar variáveis de ambiente (Windows PowerShell)
# Uso: npm run env:setup:win [dev|prod]

param(
    [Parameter(Position=0)]
    [string]$Environment = "dev"
)

$rootDir = Split-Path -Parent $PSScriptRoot

$templates = @{
    "dev" = "config.dev.template"
    "prod" = "config.prod.template"
}

$templateFile = $templates[$Environment]

if (-not $templateFile) {
    Write-Host "❌ Ambiente inválido: $Environment" -ForegroundColor Red
    Write-Host "📋 Use: npm run env:setup:win dev  ou  npm run env:setup:win prod"
    exit 1
}

$templatePath = Join-Path $rootDir $templateFile
$envPath = Join-Path $rootDir ".env"

if (-not (Test-Path $templatePath)) {
    Write-Host "❌ Template não encontrado: $templateFile" -ForegroundColor Red
    exit 1
}

# Verifica se .env já existe
if (Test-Path $envPath) {
    Write-Host "⚠️  Arquivo .env já existe!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opções:"
    Write-Host "1. Faça backup: Move-Item .env .env.backup"
    Write-Host "2. Delete o atual: Remove-Item .env"
    Write-Host "3. Execute novamente este script"
    exit 0
}

# Copia template para .env
Copy-Item $templatePath $envPath

Write-Host "✅ Arquivo .env criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📂 Origem: $templateFile"
Write-Host "📂 Destino: .env"
Write-Host ""
Write-Host "🔧 Próximos passos:"
Write-Host "1. Edite o arquivo .env"
Write-Host "2. Configure suas chaves e credenciais"

if ($Environment -eq "dev") {
    Write-Host "3. Execute: docker compose up -d"
    Write-Host "4. Execute: npm run db:push"
    Write-Host "5. Execute: npm run dev"
} else {
    Write-Host "3. Configure as variáveis no EasyPanel"
    Write-Host "4. Faça deploy: git push origin main"
}

Write-Host ""
Write-Host "📖 Leia: CONFIGURACAO_AMBIENTES.md para mais detalhes"










