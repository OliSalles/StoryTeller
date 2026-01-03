#!/usr/bin/env node

/**
 * Script para configurar variáveis de ambiente
 * Uso: npm run env:setup [dev|prod]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const env = process.argv[2] || 'dev';

const templates = {
  dev: 'config.dev.template',
  prod: 'config.prod.template'
};

const templateFile = templates[env];

if (!templateFile) {
  console.error(`❌ Ambiente inválido: ${env}`);
  console.log('📋 Use: npm run env:setup dev  ou  npm run env:setup prod');
  process.exit(1);
}

const templatePath = path.join(rootDir, templateFile);
const envPath = path.join(rootDir, '.env');

if (!fs.existsSync(templatePath)) {
  console.error(`❌ Template não encontrado: ${templateFile}`);
  process.exit(1);
}

// Verifica se .env já existe
if (fs.existsSync(envPath)) {
  console.log('⚠️  Arquivo .env já existe!');
  console.log('');
  console.log('Opções:');
  console.log('1. Faça backup: mv .env .env.backup');
  console.log('2. Delete o atual: rm .env');
  console.log('3. Execute novamente este script');
  process.exit(0);
}

// Copia template para .env
fs.copyFileSync(templatePath, envPath);

console.log('✅ Arquivo .env criado com sucesso!');
console.log('');
console.log(`📂 Origem: ${templateFile}`);
console.log(`📂 Destino: .env`);
console.log('');
console.log('🔧 Próximos passos:');
console.log('1. Edite o arquivo .env');
console.log('2. Configure suas chaves e credenciais');

if (env === 'dev') {
  console.log('3. Execute: docker compose up -d');
  console.log('4. Execute: npm run db:push');
  console.log('5. Execute: npm run dev');
} else {
  console.log('3. Configure as variáveis no EasyPanel');
  console.log('4. Faça deploy: git push origin main');
}

console.log('');
console.log('📖 Leia: CONFIGURACAO_AMBIENTES.md para mais detalhes');

