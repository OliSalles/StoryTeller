#!/usr/bin/env node

/**
 * Script para popular/atualizar os planos de assinatura no banco de dados
 * Executa o SQL do arquivo seed-subscription-plans.sql
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no arquivo .env');
  console.error('   Execute: cp env.local.example .env');
  console.error('   E configure a DATABASE_URL corretamente');
  process.exit(1);
}

console.log('🔗 Conectando ao banco de dados...');
console.log(`   ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function seedPlans() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado ao banco de dados');
    console.log('');
    
    // Ler o arquivo SQL
    const sqlFile = join(__dirname, 'seed-subscription-plans.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    
    console.log('📝 Executando script SQL...');
    console.log('');
    
    // Executar o SQL
    const result = await client.query(sql);
    
    console.log('✅ Planos de assinatura atualizados com sucesso!');
    console.log('');
    
    // Buscar e exibir os planos cadastrados
    const plansResult = await client.query(`
      SELECT 
        id,
        name,
        display_name,
        price_monthly / 100.0 as price_monthly_brl,
        price_yearly / 100.0 as price_yearly_brl,
        features_limit,
        tokens_limit,
        has_trial_days,
        stripe_monthly_price_id,
        stripe_yearly_price_id,
        is_active
      FROM subscription_plans 
      ORDER BY price_monthly
    `);
    
    console.log('📋 Planos cadastrados:');
    console.log('');
    
    plansResult.rows.forEach(plan => {
      console.log(`   ${plan.display_name} (${plan.name})`);
      console.log(`   - ID: ${plan.id}`);
      console.log(`   - Preço Mensal: R$ ${Number(plan.price_monthly_brl).toFixed(2)}`);
      console.log(`   - Preço Anual: R$ ${Number(plan.price_yearly_brl).toFixed(2)}`);
      console.log(`   - Features: ${plan.features_limit || 'Ilimitadas'}`);
      console.log(`   - Tokens: ${plan.tokens_limit ? Number(plan.tokens_limit).toLocaleString('pt-BR') : 'Ilimitados'}`);
      
      if (plan.has_trial_days > 0) {
        console.log(`   - Trial: ${plan.has_trial_days} dias`);
      }
      
      if (plan.stripe_monthly_price_id) {
        console.log(`   - Stripe Monthly Price ID: ${plan.stripe_monthly_price_id}`);
      }
      if (plan.stripe_yearly_price_id) {
        console.log(`   - Stripe Yearly Price ID: ${plan.stripe_yearly_price_id}`);
      }
      
      console.log(`   - Ativo: ${plan.is_active ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao executar o script:');
    console.error('   ', error.message);
    if (error.detail) {
      console.error('   Detalhe:', error.detail);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
seedPlans().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

