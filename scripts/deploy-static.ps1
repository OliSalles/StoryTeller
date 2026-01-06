# Script de deployment para hospedagem estatica
# Build do frontend para upload manual

$ErrorActionPreference = "Continue"

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Get-DirectorySize($Path) {
    $size = 0
    Get-ChildItem -Path $Path -Recurse -File | ForEach-Object {
        $size += $_.Length
    }
    return $size
}

function Format-Bytes($Bytes) {
    if ($Bytes -eq 0) { return "0 Bytes" }
    $k = 1024
    $sizes = @("Bytes", "KB", "MB", "GB")
    $i = [Math]::Floor([Math]::Log($Bytes) / [Math]::Log($k))
    $value = [Math]::Round($Bytes / [Math]::Pow($k, $i), 2)
    return "$value $($sizes[$i])"
}

# Banner
Write-ColorOutput Blue "`n========================================"
Write-ColorOutput Blue "   Deploy Estatico - StroryTeller AI"
Write-ColorOutput Blue "=========================================="

# 1. Verificar .env
if (!(Test-Path ".env")) {
    Write-ColorOutput Yellow "`nArquivo .env nao encontrado!"
    Write-ColorOutput Cyan "Execute primeiro: npm run env:static"
    exit 1
}

Write-ColorOutput Cyan "`nModo: Hospedagem Estatica (Frontend apenas)"

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

# 4. Build do frontend
Write-ColorOutput Cyan "`n> Fazendo build do frontend..."
npm run build:frontend
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "OK - Build concluido!"
} else {
    Write-ColorOutput Red "`nBuild falhou!"
    exit 1
}

# 5. Verificar tamanho
$publicDir = "dist\public"
if (Test-Path $publicDir) {
    $size = Get-DirectorySize $publicDir
    $formattedSize = Format-Bytes $size
    Write-ColorOutput Magenta "`nTamanho total: $formattedSize"
}

# 6. Mensagem final
Write-ColorOutput Green "`n===================================="
Write-ColorOutput Green "  Build concluido com sucesso!"
Write-ColorOutput Green "===================================="

Write-ColorOutput Cyan "`nArquivos gerados em: dist\public\"
Write-ColorOutput Yellow "`nProximos passos:"
Write-ColorOutput Yellow "   1. Abra a pasta: dist\public\"
Write-ColorOutput Yellow "   2. Selecione TODOS os arquivos dentro dela"
Write-ColorOutput Yellow "   3. Faca upload para sua hospedagem"

Write-ColorOutput Cyan "`nDica:"
Write-ColorOutput Cyan "   - Upload: index.html + pasta assets\"
Write-ColorOutput Cyan "   - Certifique-se de que index.html esta na raiz"

Write-ColorOutput Yellow "`nLembre-se:"
Write-ColorOutput Yellow "   O backend precisa estar rodando em outro servidor!"
Write-ColorOutput Cyan "   Veja: STATIC_HOSTING.md"

Write-Output ""

# Abrir pasta automaticamente (opcional)
Write-ColorOutput Cyan "`nDeseja abrir a pasta dist\public? (S/N)"
$response = Read-Host
if ($response -eq "S" -or $response -eq "s") {
    Start-Process explorer.exe -ArgumentList (Resolve-Path $publicDir)
}













