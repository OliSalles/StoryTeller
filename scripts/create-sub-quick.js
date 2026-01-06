#!/usr/bin/env node

/**
 * Script rápido para criar uma assinatura de teste
 * Uso: node scripts/create-sub-quick.js <userId> <planId> <monthly|yearly>
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

async function createSubscription() {
  const userId = process.argv[2] || '2'; // Default: usuário 2
  const planId = process.argv[3] || '2'; // Default: plano Pro
  const cycle = process.argv[4] || 'monthly'; // Default: mensal
  
  const billingCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
  
  const client = await pool.connect();
  
  try {
    console.log('🔧 Criando assinatura de teste...\n');
    
    // Verificar usuário
    const user = await client.query('SELECT id, email, name FROM users WHERE id = $1', [parseInt(userId)]);
    if (user.rows.length === 0) {
      console.error(`❌ Usuário ID ${userId} não encontrado!`);
      process.exit(1);
    }
    
    console.log(`👤 Usuário: ${user.rows[0].email} (${user.rows[0].name})`);
    
    // Verificar plano
    const plan = await client.query(`
      SELECT id, name, display_name, price_monthly, price_yearly
      FROM subscription_plans 
      WHERE id = $1
    `, [parseInt(planId)]);
    
    if (plan.rows.length === 0) {
      console.error(`❌ Plano ID ${planId} não encontrado!`);
      process.exit(1);
    }
    
    console.log(`📋 Plano: ${plan.rows[0].display_name}`);
    console.log(`💳 Ciclo: ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`);
    console.log('');
    
    // Cancelar assinaturas antigas
    await client.query(`
      UPDATE subscriptions 
      SET status = 'canceled', updated_at = NOW()
      WHERE user_id = $1 AND status IN ('active', 'trialing')
    `, [parseInt(userId)]);
    
    // Criar datas do período
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    // Criar assinatura
    const result = await client.query(`
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        stripe_subscription_id,
        stripe_customer_id,
        tokens_used_this_period,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING id
    `, [
      parseInt(userId),
      parseInt(planId),
      'active',
      billingCycle,
      now,
      periodEnd,
      false,
      `manual_test_${Date.now()}`,
      `cus_test_${Date.now()}`,
      0
    ]);
    
    console.log(`✅ Assinatura criada com sucesso! ID: ${result.rows[0].id}`);
    console.log('');
    console.log('📊 DETALHES:');
    console.log(`   Status: active`);
    console.log(`   Período: ${now.toLocaleDateString('pt-BR')} até ${periodEnd.toLocaleDateString('pt-BR')}`);
    console.log('');
    console.log('🎉 Pronto! Acesse: http://localhost:5173/account/subscription');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createSubscription().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

