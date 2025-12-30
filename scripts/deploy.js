#!/usr/bin/env node

/**
 * Script de deployment automático
 * Detecta o ambiente e configura tudo automaticamente
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
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

function checkEnvFile() {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) {
    log('\n⚠ Arquivo .env não encontrado!', 'yellow');
    log('Crie um arquivo .env com as seguintes variáveis:', 'yellow');
    log('  - DATABASE_URL', 'yellow');
    log('  - JWT_SECRET', 'yellow');
    log('  - NODE_ENV (development ou production)', 'yellow');
    log('\nVeja DEPLOYMENT.md para mais detalhes.', 'cyan');
    return false;
  }
  return true;
}

async function main() {
  log('╔════════════════════════════════════════╗', 'blue');
  log('║   🚀 Deploy Script - Bardo AI          ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  // 1. Verificar .env
  if (!checkEnvFile()) {
    process.exit(1);
  }

  const env = process.env.NODE_ENV || 'development';
  log(`\n📦 Ambiente: ${env}`, 'cyan');

  // 2. Instalar dependências
  if (!run('npm install', 'Instalando dependências')) {
    process.exit(1);
  }

  // 3. Verificar tipos
  log('\n🔍 Verificando tipos TypeScript...', 'cyan');
  run('npm run check', 'Verificação de tipos');

  // 4. Executar migrações do banco
  if (!run('npm run db:push', 'Aplicando migrações do banco de dados')) {
    log('\n⚠ Atenção: Falha nas migrações. Verifique a DATABASE_URL', 'yellow');
    log('O build continuará, mas o app pode não funcionar corretamente.', 'yellow');
  }

  // 5. Build da aplicação
  if (!run('npm run build', 'Fazendo build da aplicação')) {
    log('\n✗ Build falhou!', 'red');
    process.exit(1);
  }

  // 6. Mensagem final
  log('\n╔════════════════════════════════════════╗', 'green');
  log('║   ✓ Deploy concluído com sucesso!     ║', 'green');
  log('╚════════════════════════════════════════╝', 'green');
  
  if (env === 'production') {
    log('\n▶ Para iniciar o servidor:', 'cyan');
    log('  npm start', 'yellow');
  } else {
    log('\n▶ Para iniciar em modo desenvolvimento:', 'cyan');
    log('  npm run dev', 'yellow');
  }
}

main().catch((error) => {
  log(`\n✗ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});

