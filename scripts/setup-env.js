#!/usr/bin/env node

/**
 * Script para configurar variáveis de ambiente
 * Copia o arquivo de configuração correto para .env
 */

import { copyFileSync, existsSync, readFileSync } from 'fs';
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showEnvContent(envPath) {
  if (existsSync(envPath)) {
    log('\n📄 Conteúdo do arquivo:', 'cyan');
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('#')
    );
    lines.forEach(line => {
      if (line.includes('=')) {
        const [key] = line.split('=');
        log(`  ${key.trim()}=...`, 'yellow');
      }
    });
  }
}

async function main() {
  const environment = process.argv[2] || 'local';
  
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║   🔧 Setup de Variáveis de Ambiente   ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');
  
  log(`\n📦 Ambiente selecionado: ${environment}`, 'cyan');
  
  const sourceFile = join(rootDir, `env.${environment}.example`);
  const targetFile = join(rootDir, '.env');
  
  // Verificar se o arquivo de origem existe
  if (!existsSync(sourceFile)) {
    log(`\n✗ Arquivo ${sourceFile} não encontrado!`, 'red');
    log('\nAmbientes disponíveis:', 'yellow');
    log('  - local      (desenvolvimento com Docker)', 'yellow');
    log('  - production (deploy na VPS)', 'yellow');
    log('  - static     (hospedagem estática)', 'yellow');
    log('\nUso: npm run env:local, npm run env:production ou npm run env:static', 'cyan');
    process.exit(1);
  }
  
  // Fazer backup do .env existente
  if (existsSync(targetFile)) {
    const backupFile = join(rootDir, `.env.backup.${Date.now()}`);
    copyFileSync(targetFile, backupFile);
    log(`\n💾 Backup criado: ${backupFile}`, 'yellow');
  }
  
  // Copiar o arquivo
  try {
    copyFileSync(sourceFile, targetFile);
    log(`\n✓ Arquivo .env configurado para: ${environment}`, 'green');
    
    // Mostrar conteúdo
    showEnvContent(targetFile);
    
    if (environment === 'production') {
      log('\n⚠️  IMPORTANTE - Configuração de Produção:', 'yellow');
      log('   1. Edite o arquivo .env', 'yellow');
      log('   2. Ajuste DATABASE_URL com suas credenciais reais', 'yellow');
      log('   3. Ajuste JWT_SECRET com uma string segura', 'yellow');
      log('   4. Execute: npm run deploy:prod', 'cyan');
    } else {
      log('\n✓ Pronto para desenvolvimento local!', 'green');
      log('   Execute: npm run dev', 'cyan');
    }
    
  } catch (error) {
    log(`\n✗ Erro ao copiar arquivo: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n✗ Erro: ${error.message}`, 'red');
  process.exit(1);
});

