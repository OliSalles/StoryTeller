#!/usr/bin/env node

/**
 * Script de debug para verificar o estado das assinaturas
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Carregar variáveis de ambiente
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function debug() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estado do banco de dados...\n');
    
    // 1. Verificar usuários
    console.log('👥 USUÁRIOS:');
    const users = await client.query('SELECT id, email, name, role FROM users ORDER BY id');
    users.rows.forEach(u => {
      console.log(`   [${u.id}] ${u.email} - ${u.name} (${u.role})`);
    });
    console.log('');
    
    // 2. Verificar planos
    console.log('📋 PLANOS:');
    const plans = await client.query(`
      SELECT 
        id, name, display_name, 
        price_monthly, price_yearly,
        stripe_monthly_price_id, stripe_yearly_price_id,
        is_active
      FROM subscription_plans 
      ORDER BY price_monthly
    `);
    plans.rows.forEach(p => {
      console.log(`   [${p.id}] ${p.display_name} (${p.name})`);
      console.log(`      Mensal: R$ ${(p.price_monthly / 100).toFixed(2)} - ${p.stripe_monthly_price_id || 'N/A'}`);
      console.log(`      Anual: R$ ${(p.price_yearly / 100).toFixed(2)} - ${p.stripe_yearly_price_id || 'N/A'}`);
      console.log(`      Ativo: ${p.is_active ? 'Sim' : 'Não'}`);
    });
    console.log('');
    
    // 3. Verificar assinaturas
    console.log('💳 ASSINATURAS:');
    const subscriptions = await client.query(`
      SELECT 
        s.id,
        s.user_id,
        u.email,
        p.display_name as plan_name,
        s.status,
        s.billing_cycle,
        s.stripe_subscription_id,
        s.current_period_start,
        s.current_period_end,
        s.tokens_used_this_period,
        s.created_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN subscription_plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
    `);
    
    if (subscriptions.rows.length === 0) {
      console.log('   ⚠️  Nenhuma assinatura encontrada!');
      console.log('   Isso explica por que você está no plano Free.');
      console.log('');
      console.log('   Possíveis causas:');
      console.log('   1. O webhook do Stripe não está recebendo eventos');
      console.log('   2. O webhook está falhando ao processar');
      console.log('   3. Os metadados não estão sendo enviados corretamente');
    } else {
      subscriptions.rows.forEach(s => {
        console.log(`   [${s.id}] ${s.email} - ${s.plan_name}`);
        console.log(`      Status: ${s.status}`);
        console.log(`      Ciclo: ${s.billing_cycle}`);
        console.log(`      Stripe ID: ${s.stripe_subscription_id || 'N/A'}`);
        console.log(`      Período: ${new Date(s.current_period_start).toLocaleDateString()} a ${new Date(s.current_period_end).toLocaleDateString()}`);
        console.log(`      Tokens usados: ${s.tokens_used_this_period}`);
        console.log(`      Criada em: ${new Date(s.created_at).toLocaleString()}`);
      });
    }
    console.log('');
    
    // 4. Verificar pagamentos
    console.log('💰 PAGAMENTOS:');
    const payments = await client.query(`
      SELECT 
        p.id,
        p.subscription_id,
        p.amount,
        p.status,
        p.stripe_payment_intent_id,
        p.paid_at,
        p.created_at
      FROM payments p
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    if (payments.rows.length === 0) {
      console.log('   ⚠️  Nenhum pagamento registrado!');
    } else {
      payments.rows.forEach(p => {
        console.log(`   [${p.id}] Subscription ${p.subscription_id}`);
        console.log(`      Valor: R$ ${(p.amount / 100).toFixed(2)}`);
        console.log(`      Status: ${p.status}`);
        console.log(`      Stripe Payment ID: ${p.stripe_payment_intent_id || 'N/A'}`);
        console.log(`      Pago em: ${p.paid_at ? new Date(p.paid_at).toLocaleString() : 'N/A'}`);
      });
    }
    console.log('');
    
    // 5. Verificar uso de tokens
    console.log('🪙 USO DE TOKENS (últimos 5):');
    const tokenUsage = await client.query(`
      SELECT 
        t.id,
        u.email,
        t.operation,
        t.total_tokens,
        t.created_at
      FROM token_usage t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);
    
    if (tokenUsage.rows.length === 0) {
      console.log('   ℹ️  Nenhum uso de tokens registrado ainda.');
    } else {
      tokenUsage.rows.forEach(t => {
        console.log(`   [${t.id}] ${t.email} - ${t.operation}`);
        console.log(`      Tokens: ${t.total_tokens.toLocaleString()}`);
        console.log(`      Data: ${new Date(t.created_at).toLocaleString()}`);
      });
    }
    console.log('');
    
    // Resumo
    console.log('📊 RESUMO:');
    console.log(`   Total de usuários: ${users.rows.length}`);
    console.log(`   Total de planos: ${plans.rows.length}`);
    console.log(`   Total de assinaturas: ${subscriptions.rows.length}`);
    console.log(`   Total de pagamentos: ${payments.rows.length}`);
    console.log('');
    
    if (subscriptions.rows.length === 0) {
      console.log('🔧 PRÓXIMOS PASSOS:');
      console.log('');
      console.log('1. Verifique se o Stripe CLI está rodando:');
      console.log('   stripe listen --forward-to localhost:3000/api/webhooks/stripe');
      console.log('');
      console.log('2. Verifique se o servidor está rodando:');
      console.log('   npm run dev');
      console.log('');
      console.log('3. Faça um pagamento de teste e observe os logs:');
      console.log('   - No terminal do Stripe CLI, você deve ver eventos chegando');
      console.log('   - No terminal do servidor, você deve ver logs do webhook');
      console.log('');
      console.log('4. Se não aparecer nada nos logs, o webhook não está configurado corretamente.');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debug().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

