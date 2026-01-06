#!/usr/bin/env node

/**
 * Script para debugar planos de assinatura em PRODUÇÃO
 */

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { subscriptionPlans } from '../drizzle/schema.ts';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

console.log('\n🔍 Verificando Planos de Assinatura em PRODUÇÃO\n');
console.log('='.repeat(60));

async function debugPlans() {
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Buscar todos os planos
    const plans = await db.select().from(subscriptionPlans);

    if (plans.length === 0) {
      console.log('\n❌ NENHUM PLANO ENCONTRADO NO BANCO DE DADOS!\n');
      console.log('📝 Solução:');
      console.log('   1. Verifique se você rodou: npm run db:seed:plans');
      console.log('   2. Verifique se o DATABASE_URL está correto no .env\n');
      await client.end();
      process.exit(1);
    }

    console.log(`\n✅ Encontrados ${plans.length} planos no banco de dados\n`);
    console.log('='.repeat(60));

    for (const plan of plans) {
      console.log(`\n📦 Plano: ${plan.displayName} (${plan.name})`);
      console.log('-'.repeat(60));
      console.log(`   ID: ${plan.id}`);
      console.log(`   Ativo: ${plan.isActive ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Ordem: ${plan.displayOrder}`);
      
      console.log(`\n   💰 Preços:`);
      console.log(`   Mensal: R$ ${(plan.priceMonthly / 100).toFixed(2)}`);
      console.log(`   Anual: R$ ${(plan.priceYearly / 100).toFixed(2)}`);
      
      console.log(`\n   🔑 IDs do Stripe:`);
      console.log(`   Preço Mensal: ${plan.stripeMonthlyPriceId || '❌ NÃO CONFIGURADO'}`);
      console.log(`   Preço Anual: ${plan.stripeYearlyPriceId || '❌ NÃO CONFIGURADO'}`);
      
      // Verificar se são IDs de teste ou produção
      if (plan.stripeMonthlyPriceId) {
        if (plan.stripeMonthlyPriceId.startsWith('price_test_')) {
          console.log(`   ⚠️  ATENÇÃO: ID mensal é de TESTE! Deve começar com "price_" (sem "test")`);
        } else {
          console.log(`   ✅ ID mensal está correto (produção)`);
        }
      }
      
      if (plan.stripeYearlyPriceId) {
        if (plan.stripeYearlyPriceId.startsWith('price_test_')) {
          console.log(`   ⚠️  ATENÇÃO: ID anual é de TESTE! Deve começar com "price_" (sem "test")`);
        } else {
          console.log(`   ✅ ID anual está correto (produção)`);
        }
      }
      
      console.log(`\n   📊 Limites:`);
      console.log(`   Features: ${plan.featuresLimit === -1 ? 'Ilimitado' : plan.featuresLimit}`);
      console.log(`   Tokens: ${plan.tokensLimit === -1 ? 'Ilimitado' : plan.tokensLimit.toLocaleString()}`);
      console.log(`   Trial: ${plan.hasTrialDays || 0} dias`);
      
      if (plan.description) {
        console.log(`\n   📝 Descrição: ${plan.description}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMO:\n');
    
    const activePlans = plans.filter(p => p.isActive);
    const inactivePlans = plans.filter(p => !p.isActive);
    const plansWithoutStripeIds = plans.filter(p => !p.stripeMonthlyPriceId || !p.stripeYearlyPriceId);
    const plansWithTestIds = plans.filter(p => 
      (p.stripeMonthlyPriceId && p.stripeMonthlyPriceId.startsWith('price_test_')) ||
      (p.stripeYearlyPriceId && p.stripeYearlyPriceId.startsWith('price_test_'))
    );
    
    console.log(`   Total de planos: ${plans.length}`);
    console.log(`   Planos ativos: ${activePlans.length}`);
    console.log(`   Planos inativos: ${inactivePlans.length}`);
    
    if (plansWithoutStripeIds.length > 0) {
      console.log(`\n   ⚠️  ${plansWithoutStripeIds.length} plano(s) SEM IDs do Stripe configurados:`);
      plansWithoutStripeIds.forEach(p => console.log(`      - ${p.displayName}`));
    }
    
    if (plansWithTestIds.length > 0) {
      console.log(`\n   ⚠️  ${plansWithTestIds.length} plano(s) com IDs de TESTE (não funcionará em produção):`);
      plansWithTestIds.forEach(p => console.log(`      - ${p.displayName}`));
      console.log(`\n   📝 SOLUÇÃO:`);
      console.log(`      1. Obtenha os IDs de PRODUÇÃO no Dashboard do Stripe`);
      console.log(`      2. Edite: scripts/seed-subscription-plans.sql`);
      console.log(`      3. Execute: npm run db:seed:plans`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 PRÓXIMOS PASSOS:\n');
    
    if (plansWithoutStripeIds.length > 0 || plansWithTestIds.length > 0) {
      console.log('   ❌ Problema encontrado: IDs do Stripe incorretos ou faltando');
      console.log('   \n   🔧 Como corrigir:');
      console.log('   1. Acesse: https://dashboard.stripe.com/products');
      console.log('   2. DESATIVE o modo de teste (toggle superior)');
      console.log('   3. Copie os IDs de preço de PRODUÇÃO (começam com "price_")');
      console.log('   4. Edite: scripts/seed-subscription-plans.sql');
      console.log('   5. Execute: npm run db:seed:plans\n');
    } else {
      console.log('   ✅ Todos os planos estão configurados corretamente!');
      console.log('   \n   Se os preços ainda não aparecem no site:');
      console.log('   1. Verifique se o servidor está rodando');
      console.log('   2. Verifique os logs do navegador (F12 → Console)');
      console.log('   3. Verifique se há erros no servidor\n');
    }

  } catch (error) {
    console.error('\n❌ Erro ao buscar planos:', error.message);
    console.error('\n📝 Verifique:');
    console.error('   1. DATABASE_URL está correto no .env');
    console.error('   2. Banco de dados está acessível');
    console.error('   3. Tabela "subscription_plans" existe (rode: npm run db:push)\n');
  } finally {
    await client.end();
  }
}

debugPlans().catch(console.error);

