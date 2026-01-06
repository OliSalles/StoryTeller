#!/usr/bin/env node

/**
 * Script para configurar o Portal do Cliente do Stripe
 * 
 * Este script cria uma configuração personalizada do Portal do Cliente
 * com todas as funcionalidades necessárias habilitadas.
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

async function configureCustomerPortal() {
  console.log('🔧 Verificando configuração do Portal do Cliente do Stripe...\n');

  try {
    // Listar configurações existentes
    const configurations = await stripe.billingPortal.configurations.list({ limit: 1 });
    
    if (configurations.data.length > 0) {
      const config = configurations.data[0];
      console.log('✅ Portal do Cliente já está configurado!');
      console.log('\n📋 Detalhes da configuração:');
      console.log(`   ID: ${config.id}`);
      console.log(`   Ativo: ${config.is_default ? 'Sim (padrão)' : 'Sim'}`);
      console.log(`   URL de retorno: ${config.default_return_url || 'Não configurado'}`);
      console.log('\n🎯 Funcionalidades:');
      console.log(`   ${config.features.subscription_cancel?.enabled ? '✓' : '✗'} Cancelar assinatura`);
      console.log(`   ${config.features.payment_method_update?.enabled ? '✓' : '✗'} Gerenciar métodos de pagamento`);
      console.log(`   ${config.features.invoice_history?.enabled ? '✓' : '✗'} Ver histórico de faturas`);
      console.log(`   ${config.features.customer_update?.enabled ? '✓' : '✗'} Atualizar informações`);
      console.log('\n💡 Para personalizar o portal, acesse:');
      console.log('   https://dashboard.stripe.com/settings/billing/portal');
      console.log('\n📚 Documentação completa:');
      console.log('   /docs/PORTAL_CLIENTE_STRIPE.md\n');
      
      return config;
    }
    
    // Se não houver configuração, criar uma básica
    console.log('⚠️  Nenhuma configuração encontrada. Criando configuração básica...\n');
    
    const configuration = await stripe.billingPortal.configurations.create({
      features: {
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'customer_service',
              'too_complex',
              'low_quality',
              'other',
            ],
          },
        },
        payment_method_update: {
          enabled: true,
        },
        invoice_history: {
          enabled: true,
        },
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address', 'phone', 'tax_id'],
        },
      },
      default_return_url: process.env.APP_URL 
        ? `${process.env.APP_URL}/account/subscription`
        : 'http://localhost:5173/account/subscription',
    });

    console.log('✅ Portal do Cliente configurado com sucesso!');
    console.log('\n📋 Detalhes da configuração:');
    console.log(`   ID: ${configuration.id}`);
    console.log(`   URL de retorno padrão: ${configuration.default_return_url}`);
    console.log('\n🎯 Funcionalidades habilitadas:');
    console.log('   ✓ Cancelar assinatura (ao final do período)');
    console.log('   ✓ Gerenciar métodos de pagamento');
    console.log('   ✓ Ver histórico de faturas');
    console.log('   ✓ Atualizar informações de faturamento');
    console.log('   ✓ Adicionar IDs fiscais');
    console.log('\n⚠️  IMPORTANTE: Para habilitar upgrade/downgrade de planos:');
    console.log('   1. Acesse: https://dashboard.stripe.com/settings/billing/portal');
    console.log('   2. Vá em "Subscription update"');
    console.log('   3. Habilite e selecione os produtos/preços permitidos');
    console.log('\n💡 Dica: Você pode personalizar ainda mais o portal no Dashboard do Stripe');
    console.log('\n📚 Documentação completa:');
    console.log('   /docs/PORTAL_CLIENTE_STRIPE.md\n');

    return configuration;
  } catch (error) {
    console.error('❌ Erro ao configurar portal:', error.message);
    console.error('\n💡 Solução:');
    console.error('   Configure o portal manualmente no Dashboard do Stripe:');
    console.error('   https://dashboard.stripe.com/settings/billing/portal\n');
    throw error;
  }
}

// Executar
configureCustomerPortal()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

