#!/usr/bin/env node

/**
 * Script para criar uma assinatura de teste manualmente
 * Use isso temporariamente enquanto o webhook não funciona
 */

import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function createTestSubscription() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Criar Assinatura de Teste Manualmente\n');
    
    // 1. Listar usuários
    const users = await client.query('SELECT id, email, name FROM users ORDER BY id');
    console.log('👥 USUÁRIOS:');
    users.rows.forEach(u => {
      console.log(`   [${u.id}] ${u.email} - ${u.name}`);
    });
    console.log('');
    
    const userId = await question('Digite o ID do usuário: ');
    
    // 2. Listar planos
    const plans = await client.query(`
      SELECT id, name, display_name, price_monthly, price_yearly
      FROM subscription_plans 
      WHERE name != 'free'
      ORDER BY price_monthly
    `);
    console.log('\n📋 PLANOS DISPONÍVEIS:');
    plans.rows.forEach(p => {
      console.log(`   [${p.id}] ${p.display_name} - R$ ${(p.price_monthly / 100).toFixed(2)}/mês ou R$ ${(p.price_yearly / 100).toFixed(2)}/ano`);
    });
    console.log('');
    
    const planId = await question('Digite o ID do plano: ');
    
    console.log('\n💳 CICLO DE COBRANÇA:');
    console.log('   [1] Mensal');
    console.log('   [2] Anual');
    console.log('');
    
    const cycleChoice = await question('Digite 1 ou 2: ');
    const billingCycle = cycleChoice === '2' ? 'yearly' : 'monthly';
    
    // 3. Criar datas do período
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    // 4. Verificar se já existe assinatura ativa
    const existing = await client.query(`
      SELECT id FROM subscriptions 
      WHERE user_id = $1 AND status IN ('active', 'trialing')
    `, [parseInt(userId)]);
    
    if (existing.rows.length > 0) {
      console.log('\n⚠️  Usuário já tem uma assinatura ativa!');
      const overwrite = await question('Deseja cancelar a antiga e criar uma nova? (s/n): ');
      
      if (overwrite.toLowerCase() === 's' || overwrite.toLowerCase() === 'sim') {
        await client.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['canceled', parseInt(userId)]);
        console.log('✅ Assinatura antiga cancelada');
      } else {
        console.log('❌ Operação cancelada');
        rl.close();
        await pool.end();
        return;
      }
    }
    
    // 5. Criar assinatura
    console.log('\n📝 Criando assinatura...');
    
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
    
    console.log(`\n✅ Assinatura criada com sucesso! ID: ${result.rows[0].id}`);
    console.log('');
    console.log('📊 DETALHES:');
    console.log(`   Usuário ID: ${userId}`);
    console.log(`   Plano ID: ${planId}`);
    console.log(`   Ciclo: ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`);
    console.log(`   Status: active`);
    console.log(`   Período: ${now.toLocaleDateString()} até ${periodEnd.toLocaleDateString()}`);
    console.log('');
    console.log('🎉 Agora você pode testar o sistema com a assinatura ativa!');
    console.log('   Acesse: http://localhost:5173/account/subscription');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
    client.release();
    await pool.end();
  }
}

createTestSubscription().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

