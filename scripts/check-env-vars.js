#!/usr/bin/env node

/**
 * Script para validar variáveis de ambiente antes do deploy
 * Uso: node scripts/check-env-vars.js
 */

console.log('🔍 Verificando Variáveis de Ambiente...\n');

// Variáveis obrigatórias
const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV',
];

// Variáveis recomendadas
const RECOMMENDED_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'APP_URL',
  'PORT',
];

// Variáveis opcionais
const OPTIONAL_VARS = [
  'OAUTH_SERVER_URL',
  'VITE_APP_ID',
  'OWNER_OPEN_ID',
];

let hasErrors = false;
let hasWarnings = false;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔴 OBRIGATÓRIAS (app não funciona sem):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: FALTANDO`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: OK (${value.length} caracteres)`);
    
    // Validações específicas
    if (varName === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
      console.log(`   ⚠️  Aviso: DATABASE_URL deve começar com 'postgresql://'`);
      hasWarnings = true;
    }
    
    if (varName === 'JWT_SECRET' && value.length < 32) {
      console.log(`   ⚠️  Aviso: JWT_SECRET deve ter pelo menos 32 caracteres`);
      hasWarnings = true;
    }
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🟡 RECOMENDADAS (funcionalidades podem não funcionar):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

RECOMMENDED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: FALTANDO`);
    hasWarnings = true;
    
    // Dicas específicas
    if (varName.startsWith('STRIPE_')) {
      console.log(`   💡 Pagamentos não funcionarão sem Stripe`);
    }
    if (varName === 'OPENAI_API_KEY') {
      console.log(`   💡 IA não funcionará sem OpenAI`);
    }
  } else {
    const preview = varName.includes('SECRET') || varName.includes('KEY') 
      ? `${value.substring(0, 10)}...` 
      : value;
    console.log(`✅ ${varName}: OK (${preview})`);
    
    // Validações específicas
    if (varName === 'STRIPE_SECRET_KEY' && value.startsWith('sk_test_')) {
      console.log(`   ⚠️  Aviso: Usando chave de TESTE em produção!`);
      hasWarnings = true;
    }
    
    if (varName === 'STRIPE_PUBLISHABLE_KEY' && value.startsWith('pk_test_')) {
      console.log(`   ⚠️  Aviso: Usando chave de TESTE em produção!`);
      hasWarnings = true;
    }
    
    if (varName === 'APP_URL' && value.includes('localhost')) {
      console.log(`   ⚠️  Aviso: APP_URL aponta para localhost em produção!`);
      hasWarnings = true;
    }
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🟢 OPCIONAIS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

OPTIONAL_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`ℹ️  ${varName}: não configurado (ok)`);
  } else {
    console.log(`✅ ${varName}: OK (${value})`);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 RESUMO:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (hasErrors) {
  console.log('❌ ERROS CRÍTICOS encontrados!');
  console.log('   A aplicação NÃO vai funcionar.\n');
  console.log('📝 Para corrigir:');
  console.log('   1. Configure as variáveis OBRIGATÓRIAS');
  console.log('   2. Veja: docs/CORRIGIR_EASYPANEL_ENV.md\n');
  process.exit(1);
}

if (hasWarnings) {
  console.log('⚠️  AVISOS encontrados.');
  console.log('   A aplicação vai rodar, mas algumas funcionalidades podem não funcionar.\n');
  console.log('📝 Recomendação:');
  console.log('   Configure as variáveis RECOMENDADAS');
  console.log('   Veja: docs/CORRIGIR_EASYPANEL_ENV.md\n');
  process.exit(0);
}

console.log('✅ Todas as variáveis estão OK!');
console.log('   A aplicação está pronta para rodar.\n');

// Informações adicionais
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 GUIAS ÚTEIS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('   📖 Guia completo: docs/CORRIGIR_EASYPANEL_ENV.md');
console.log('   ⚡ Checklist rápido: docs/EASYPANEL_ENV_CHECKLIST.md');
console.log('   🚀 Deploy EasyPanel: docs/GUIA_EASYPANEL.md');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(0);

