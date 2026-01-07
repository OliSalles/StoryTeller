#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Script para validar variáveis de ambiente antes do deploy
.DESCRIPTION
    Verifica se todas as variáveis necessárias estão configuradas
.EXAMPLE
    .\scripts\check-env-vars.ps1
#>

Write-Host "🔍 Verificando Variáveis de Ambiente...`n" -ForegroundColor Cyan

# Carregar .env se existir
if (Test-Path ".env") {
    Write-Host "📄 Carregando .env..." -ForegroundColor Gray
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Variáveis obrigatórias
$REQUIRED_VARS = @(
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
)

# Variáveis recomendadas
$RECOMMENDED_VARS = @(
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'OPENAI_API_KEY',
    'APP_URL',
    'PORT'
)

# Variáveis opcionais
$OPTIONAL_VARS = @(
    'OAUTH_SERVER_URL',
    'VITE_APP_ID',
    'OWNER_OPEN_ID'
)

$hasErrors = $false
$hasWarnings = $false

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🔴 OBRIGATÓRIAS (app não funciona sem):" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

foreach ($varName in $REQUIRED_VARS) {
    $value = [Environment]::GetEnvironmentVariable($varName, "Process")
    if (-not $value) {
        Write-Host "❌ $varName`: FALTANDO" -ForegroundColor Red
        $hasErrors = $true
    } else {
        Write-Host "✅ $varName`: OK ($($value.Length) caracteres)" -ForegroundColor Green
        
        # Validações específicas
        if ($varName -eq 'DATABASE_URL' -and -not $value.StartsWith('postgresql://')) {
            Write-Host "   ⚠️  Aviso: DATABASE_URL deve começar com 'postgresql://'" -ForegroundColor Yellow
            $hasWarnings = $true
        }
        
        if ($varName -eq 'JWT_SECRET' -and $value.Length -lt 32) {
            Write-Host "   ⚠️  Aviso: JWT_SECRET deve ter pelo menos 32 caracteres" -ForegroundColor Yellow
            $hasWarnings = $true
        }
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🟡 RECOMENDADAS (funcionalidades podem não funcionar):" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

foreach ($varName in $RECOMMENDED_VARS) {
    $value = [Environment]::GetEnvironmentVariable($varName, "Process")
    if (-not $value) {
        Write-Host "⚠️  $varName`: FALTANDO" -ForegroundColor Yellow
        $hasWarnings = $true
        
        # Dicas específicas
        if ($varName -like 'STRIPE_*') {
            Write-Host "   💡 Pagamentos não funcionarão sem Stripe" -ForegroundColor Gray
        }
        if ($varName -eq 'OPENAI_API_KEY') {
            Write-Host "   💡 IA não funcionará sem OpenAI" -ForegroundColor Gray
        }
    } else {
        $preview = if ($varName -like '*SECRET*' -or $varName -like '*KEY*') {
            $value.Substring(0, [Math]::Min(10, $value.Length)) + "..."
        } else {
            $value
        }
        Write-Host "✅ $varName`: OK ($preview)" -ForegroundColor Green
        
        # Validações específicas
        if ($varName -eq 'STRIPE_SECRET_KEY' -and $value.StartsWith('sk_test_')) {
            Write-Host "   ⚠️  Aviso: Usando chave de TESTE em produção!" -ForegroundColor Yellow
            $hasWarnings = $true
        }
        
        if ($varName -eq 'STRIPE_PUBLISHABLE_KEY' -and $value.StartsWith('pk_test_')) {
            Write-Host "   ⚠️  Aviso: Usando chave de TESTE em produção!" -ForegroundColor Yellow
            $hasWarnings = $true
        }
        
        if ($varName -eq 'APP_URL' -and $value -like '*localhost*') {
            Write-Host "   ⚠️  Aviso: APP_URL aponta para localhost em produção!" -ForegroundColor Yellow
            $hasWarnings = $true
        }
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🟢 OPCIONAIS:" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

foreach ($varName in $OPTIONAL_VARS) {
    $value = [Environment]::GetEnvironmentVariable($varName, "Process")
    if (-not $value) {
        Write-Host "ℹ️  $varName`: não configurado (ok)" -ForegroundColor Gray
    } else {
        Write-Host "✅ $varName`: OK ($value)" -ForegroundColor Green
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

if ($hasErrors) {
    Write-Host "❌ ERROS CRÍTICOS encontrados!" -ForegroundColor Red
    Write-Host "   A aplicação NÃO vai funcionar.`n" -ForegroundColor Red
    Write-Host "📝 Para corrigir:" -ForegroundColor Yellow
    Write-Host "   1. Configure as variáveis OBRIGATÓRIAS" -ForegroundColor White
    Write-Host "   2. Veja: docs/CORRIGIR_EASYPANEL_ENV.md`n" -ForegroundColor White
    exit 1
}

if ($hasWarnings) {
    Write-Host "⚠️  AVISOS encontrados." -ForegroundColor Yellow
    Write-Host "   A aplicação vai rodar, mas algumas funcionalidades podem não funcionar.`n" -ForegroundColor Yellow
    Write-Host "📝 Recomendação:" -ForegroundColor Cyan
    Write-Host "   Configure as variáveis RECOMENDADAS" -ForegroundColor White
    Write-Host "   Veja: docs/CORRIGIR_EASYPANEL_ENV.md`n" -ForegroundColor White
    exit 0
}

Write-Host "✅ Todas as variáveis estão OK!" -ForegroundColor Green
Write-Host "   A aplicação está pronta para rodar.`n" -ForegroundColor Green

# Informações adicionais
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📋 GUIAS ÚTEIS:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
Write-Host "   📖 Guia completo: docs/CORRIGIR_EASYPANEL_ENV.md" -ForegroundColor White
Write-Host "   ⚡ Checklist rápido: docs/EASYPANEL_ENV_CHECKLIST.md" -ForegroundColor White
Write-Host "   🚀 Deploy EasyPanel: docs/GUIA_EASYPANEL.md" -ForegroundColor White
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

exit 0

