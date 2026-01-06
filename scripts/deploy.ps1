# Script de deployment automatico para Windows (PowerShell)
# Detecta o ambiente e configura tudo automaticamente

$ErrorActionPreference = "Continue"

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Run-Command($Command, $Description) {
    Write-ColorOutput Cyan "`n> $Description..."
    try {
        $output = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
            Write-ColorOutput Green "OK - $Description concluido!"
            return $true
        } else {
            Write-ColorOutput Red "ERRO ao executar: $Description"
            if ($output) {
                Write-Output $output
            }
            return $false
        }
    } catch {
        Write-ColorOutput Red "ERRO ao executar: $Description"
        Write-ColorOutput Red $_.Exception.Message
        return $false
    }
}

function Check-EnvFile {
    if (!(Test-Path ".env")) {
        Write-ColorOutput Yellow "`nArquivo .env nao encontrado!"
        Write-ColorOutput Yellow "Crie um arquivo .env com as seguintes variaveis:"
        Write-ColorOutput Yellow "  - DATABASE_URL"
        Write-ColorOutput Yellow "  - JWT_SECRET"
        Write-ColorOutput Yellow "  - NODE_ENV (development ou production)"
        Write-ColorOutput Cyan "`nVeja DEPLOYMENT.md para mais detalhes."
        return $false
    }
    Write-ColorOutput Green "OK - Arquivo .env encontrado!"
    return $true
}

# Banner
Write-ColorOutput Blue "`n========================================"
Write-ColorOutput Blue "   Deploy Script - StroryTeller AI"
Write-ColorOutput Blue "========================================"

# 1. Verificar .env
if (!(Check-EnvFile)) {
    exit 1
}

$env:NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "development" }
Write-ColorOutput Cyan "`nAmbiente: $($env:NODE_ENV)"

# 2. Instalar dependencias
Write-ColorOutput Cyan "`n> Instalando dependencias..."
npm install
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "OK - Dependencias instaladas!"
} else {
    Write-ColorOutput Red "ERRO ao instalar dependencias!"
    exit 1
}

# 3. Verificar tipos
Write-ColorOutput Cyan "`n> Verificando tipos TypeScript..."
npm run check 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "OK - Tipos verificados!"
} else {
    Write-ColorOutput Yellow "AVISO - Erros de tipo encontrados (continuando...)"
}

# 4. Executar migracoes
Write-ColorOutput Cyan "`n> Aplicando migracoes do banco de dados..."
npm run db:push
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "OK - Migracoes aplicadas!"
} else {
    Write-ColorOutput Yellow "`nAtencao: Falha nas migracoes. Verifique a DATABASE_URL"
    Write-ColorOutput Yellow "O build continuara, mas o app pode nao funcionar corretamente."
}

# 5. Build
Write-ColorOutput Cyan "`n> Fazendo build da aplicacao..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "OK - Build concluido!"
} else {
    Write-ColorOutput Red "`nBuild falhou!"
    exit 1
}

# 6. Mensagem final
Write-ColorOutput Green "`n===================================="
Write-ColorOutput Green "  Deploy concluido com sucesso!"
Write-ColorOutput Green "===================================="

if ($env:NODE_ENV -eq "production") {
    Write-ColorOutput Cyan "`nPara iniciar o servidor:"
    Write-ColorOutput Yellow "  npm start"
} else {
    Write-ColorOutput Cyan "`nPara iniciar em modo desenvolvimento:"
    Write-ColorOutput Yellow "  npm run dev"
}

Write-Output ""
