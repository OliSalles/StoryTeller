#!/usr/bin/env node

/**
 * Script para verificar se o webhook do Stripe está configurado corretamente
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });
dotenv.config();

console.log('🔍 Verificando Configuração do Webhook do Stripe\n');

// 1. Verificar se as chaves do Stripe existem
console.log('1️⃣ Verificando chaves do Stripe...');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (stripeSecretKey) {
  console.log('   ✅ STRIPE_SECRET_KEY: Configurada');
  console.log(`      ${stripeSecretKey.substring(0, 20)}...`);
} else {
  console.log('   ❌ STRIPE_SECRET_KEY: NÃO configurada');
}

if (stripePublishableKey) {
  console.log('   ✅ STRIPE_PUBLISHABLE_KEY: Configurada');
  console.log(`      ${stripePublishableKey.substring(0, 20)}...`);
} else {
  console.log('   ❌ STRIPE_PUBLISHABLE_KEY: NÃO configurada');
}

if (stripeWebhookSecret) {
  console.log('   ✅ STRIPE_WEBHOOK_SECRET: Configurada');
  console.log(`      ${stripeWebhookSecret.substring(0, 20)}...`);
} else {
  console.log('   ⚠️  STRIPE_WEBHOOK_SECRET: NÃO configurada');
  console.log('      Os webhooks não funcionarão sem essa chave!');
}

console.log('');

// 2. Verificar se o Stripe CLI está instalado
console.log('2️⃣ Verificando Stripe CLI...');

try {
  const version = execSync('stripe --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  console.log(`   ✅ Stripe CLI instalado: ${version}`);
} catch (error) {
  console.log('   ❌ Stripe CLI NÃO está instalado');
  console.log('      Instale com: winget install stripe.stripe-cli');
}

console.log('');

// 3. Verificar se há processos Stripe rodando
console.log('3️⃣ Verificando processos do Stripe...');

try {
  const processes = execSync('Get-Process stripe -ErrorAction SilentlyContinue | Select-Object -Property Id,ProcessName', { 
    encoding: 'utf-8',
    shell: 'powershell.exe',
    stdio: ['pipe', 'pipe', 'ignore']
  }).trim();
  
  if (processes) {
    console.log('   ✅ Stripe CLI está rodando');
  } else {
    console.log('   ⚠️  Stripe CLI NÃO está rodando');
    console.log('      Execute: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  }
} catch (error) {
  console.log('   ⚠️  Não foi possível verificar processos do Stripe');
}

console.log('');

// 4. Resumo e recomendações
console.log('📊 RESUMO:');
console.log('');

if (!stripeSecretKey || !stripePublishableKey) {
  console.log('❌ Configuração INCOMPLETA');
  console.log('');
  console.log('🔧 Ações necessárias:');
  console.log('   1. Adicione as chaves do Stripe no arquivo .env.local:');
  console.log('      STRIPE_SECRET_KEY=sk_test_...');
  console.log('      STRIPE_PUBLISHABLE_KEY=pk_test_...');
  console.log('      STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('');
  console.log('   2. Reinicie o servidor: npm run dev');
} else if (!stripeWebhookSecret) {
  console.log('⚠️  Configuração PARCIAL - Webhooks não funcionarão');
  console.log('');
  console.log('🔧 Para ativar webhooks:');
  console.log('');
  console.log('   OPÇÃO A - Desenvolvimento Local (Recomendado):');
  console.log('   ──────────────────────────────────────────────');
  console.log('   1. Execute em um terminal separado:');
  console.log('      stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log('');
  console.log('   2. Copie o webhook secret que aparece (whsec_...)');
  console.log('');
  console.log('   3. Adicione no .env.local:');
  console.log('      STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('');
  console.log('   4. Reinicie o servidor');
  console.log('');
  console.log('   OPÇÃO B - Usar Sincronização Automática:');
  console.log('   ─────────────────────────────────────────');
  console.log('   ✅ Já está funcionando! A sincronização automática');
  console.log('      criará a assinatura 3 segundos após o pagamento.');
  console.log('      Isso não requer webhook.');
} else {
  console.log('✅ Configuração COMPLETA');
  console.log('');
  console.log('🎯 Próximos passos:');
  console.log('   1. Certifique-se que o servidor está rodando:');
  console.log('      npm run dev');
  console.log('');
  console.log('   2. Em outro terminal, execute:');
  console.log('      stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log('');
  console.log('   3. Faça um pagamento de teste em:');
  console.log('      http://localhost:5173/pricing');
  console.log('');
  console.log('   4. Verifique se a assinatura foi criada:');
  console.log('      npm run db:debug');
}

console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('📚 Documentação completa: CONFIGURAR_WEBHOOK_STRIPE.md');
console.log('──────────────────────────────────────────────────────────');
console.log('');

