# Gera uma string aleatoria segura para JWT_SECRET

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Generate-Secret {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

Write-ColorOutput Cyan "`n========================================"
Write-ColorOutput Cyan "   Gerador de JWT Secret"
Write-ColorOutput Cyan "========================================`n"

$secret = Generate-Secret

Write-ColorOutput Green "OK - JWT_SECRET gerado com sucesso!`n"
Write-ColorOutput Yellow "Copie e cole no seu .env ou no Render:`n"
Write-ColorOutput Green "JWT_SECRET=$secret`n"
Write-ColorOutput Cyan "Esta string tem 64 caracteres e e criptograficamente segura."
Write-ColorOutput Yellow "Nunca compartilhe este valor publicamente!`n"




