#!/usr/bin/env node

/**
 * Gera uma string aleatória segura para JWT_SECRET
 */

import { randomBytes } from 'crypto';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecret(length = 64) {
  return randomBytes(length).toString('base64url');
}

log('\n╔════════════════════════════════════════╗', 'cyan');
log('║   🔐 Gerador de JWT Secret             ║', 'cyan');
log('╚════════════════════════════════════════╝', 'cyan');

const secret = generateSecret();

log('\n✓ JWT_SECRET gerado com sucesso!', 'green');
log('\n📋 Copie e cole no seu .env ou no Render:', 'yellow');
log(`\nJWT_SECRET=${secret}`, 'green');
log('\n💡 Esta string tem 64 caracteres e é criptograficamente segura.', 'cyan');
log('   Nunca compartilhe este valor publicamente!\n', 'yellow');

