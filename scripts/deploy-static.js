#!/usr/bin/env node

/**
 * Script de deployment para hospedagem estática
 * Build do frontend para upload manual
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(command, description) {
  log(`\n▶ ${description}...`, 'cyan');
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    log(`✓ ${description} concluído!`, 'green');
    return true;
  } catch (error) {
    log(`✗ Erro ao executar: ${description}`, 'red');
    return false;
  }
}

function getDirectorySize(dirPath) {
  let size = 0;
  const files = readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = join(dirPath, file);
    const stats = statSync(filePath);
    
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function main() {
  log('╔═══════════════════════════════════════════╗', 'blue');
  log('║   🌐 Deploy Estático - StroryTeller AI    ║', 'blue');
  log('╚═══════════════════════════════════════════╝', 'blue');

  // 1. Verificar .env
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) {
    log('\n⚠ Arquivo .env não encontrado!', 'yellow');
    log('Execute primeiro: npm run env:static', 'cyan');
    process.exit(1);
  }

  log('\n📦 Modo: Hospedagem Estática (Frontend apenas)', 'cyan');

  // 2. Instalar dependências
  if (!run('npm install', 'Instalando dependências')) {
    process.exit(1);
  }

  // 3. Verificar tipos
  log('\n🔍 Verificando tipos TypeScript...', 'cyan');
  run('npm run check', 'Verificação de tipos');

  // 4. Build do frontend
  if (!run('npm run build:frontend', 'Fazendo build do frontend')) {
    log('\n✗ Build falhou!', 'red');
    process.exit(1);
  }

  // 5. Verificar tamanho dos arquivos
  const publicDir = join(rootDir, 'dist', 'public');
  if (existsSync(publicDir)) {
    const size = getDirectorySize(publicDir);
    log(`\n📊 Tamanho total: ${formatBytes(size)}`, 'magenta');
  }

  // 6. Mensagem final
  log('\n╔════════════════════════════════════════╗', 'green');
  log('║   ✓ Build concluído com sucesso!      ║', 'green');
  log('╚════════════════════════════════════════╝', 'green');
  
  log('\n📁 Arquivos gerados em: dist/public/', 'cyan');
  log('\n📤 Próximos passos:', 'yellow');
  log('   1. Abra a pasta: dist/public/', 'yellow');
  log('   2. Selecione TODOS os arquivos dentro dela', 'yellow');
  log('   3. Faça upload para sua hospedagem', 'yellow');
  
  log('\n💡 Dica:', 'cyan');
  log('   - Upload: index.html + pasta assets/', 'cyan');
  log('   - Certifique-se de que index.html está na raiz', 'cyan');
  
  log('\n⚠️  Lembre-se:', 'yellow');
  log('   O backend precisa estar rodando em outro servidor!', 'yellow');
  log('   Veja: STATIC_HOSTING.md', 'cyan');
}

main().catch((error) => {
  log(`\n✗ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});













