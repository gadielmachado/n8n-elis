#!/usr/bin/env node

/**
 * Script para atualizar webhooks da Evolution API
 * Uso: node scripts/update-webhooks.js [URL_DA_APLICACAO]
 */

const axios = require('axios')

// Configurações da Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://n8n-evolution-api.o5ynml.easypanel.host'
const EVOLUTION_API_TOKEN = process.env.EVOLUTION_API_TOKEN || 'F802E5ABFA6E-417B-A05D-856C7CB32C41'
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'Elis.IA'

async function updateWebhooks(appUrl) {
  try {
    console.log('🔧 Atualizando webhooks da Evolution API...')
    console.log(`📡 URL da aplicação: ${appUrl}`)
    console.log(`🔗 Evolution API: ${EVOLUTION_API_URL}`)
    console.log(`📱 Instância: ${EVOLUTION_INSTANCE_NAME}`)
    
    // Configuração do webhook
    const webhookData = {
      url: `${appUrl}/api/webhooks/evolution`,
      events: ['messages.upsert', 'connection.update'],
      enabled: true
    }
    
    console.log('📤 Configuração do webhook:', JSON.stringify(webhookData, null, 2))
    
    // Fazer requisição para atualizar webhook
    const response = await axios.post(
      `${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE_NAME}`,
      webhookData,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 10000
      }
    )
    
    console.log('✅ Webhook atualizado com sucesso!')
    console.log('📋 Resposta:', JSON.stringify(response.data, null, 2))
    
    // Verificar se o webhook foi configurado corretamente
    console.log('\n🔍 Verificando configuração...')
    
    const checkResponse = await axios.get(
      `${EVOLUTION_API_URL}/webhook/find/${EVOLUTION_INSTANCE_NAME}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 10000
      }
    )
    
    console.log('📊 Status atual do webhook:')
    console.log(JSON.stringify(checkResponse.data, null, 2))
    
    // Sucesso
    console.log('\n🎉 Configuração concluída!')
    console.log('✅ Webhook da Evolution API atualizado')
    console.log(`🔗 Endpoint: ${appUrl}/api/webhooks/evolution`)
    console.log('📨 Eventos: messages.upsert, connection.update')
    
    return true
    
  } catch (error) {
    console.error('❌ Erro ao atualizar webhook:', error.message)
    
    if (error.response) {
      console.error('📄 Status:', error.response.status)
      console.error('📄 Dados:', JSON.stringify(error.response.data, null, 2))
      
      // Sugestões baseadas no erro
      if (error.response.status === 401) {
        console.log('\n💡 Sugestões:')
        console.log('- Verifique se o EVOLUTION_API_TOKEN está correto')
        console.log('- Verifique se o token não expirou')
      } else if (error.response.status === 404) {
        console.log('\n💡 Sugestões:')
        console.log('- Verifique se o EVOLUTION_INSTANCE_NAME está correto')
        console.log('- Verifique se a instância existe na Evolution API')
      }
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Sugestões:')
      console.log('- Verifique se a EVOLUTION_API_URL está correta')
      console.log('- Verifique se o servidor está online')
    }
    
    return false
  }
}

// Função principal
async function main() {
  console.log('🚀 Script de Atualização de Webhooks')
  console.log('=====================================')
  
  // Obter URL da aplicação
  let appUrl = process.argv[2]
  
  if (!appUrl) {
    // Tentar obter do ambiente
    appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL
  }
  
  if (!appUrl) {
    console.error('❌ URL da aplicação não fornecida!')
    console.log('\n📖 Uso:')
    console.log('node scripts/update-webhooks.js https://seu-dominio.vercel.app')
    console.log('ou configure NEXTAUTH_URL nas variáveis de ambiente')
    process.exit(1)
  }
  
  // Remover barra final se existir
  appUrl = appUrl.replace(/\/$/, '')
  
  // Validar URL
  try {
    new URL(appUrl)
  } catch (error) {
    console.error('❌ URL inválida:', appUrl)
    console.log('💡 Use uma URL completa: https://seu-dominio.vercel.app')
    process.exit(1)
  }
  
  // Verificar variáveis de ambiente
  if (!EVOLUTION_API_URL || !EVOLUTION_API_TOKEN || !EVOLUTION_INSTANCE_NAME) {
    console.error('❌ Variáveis de ambiente não configuradas!')
    console.log('\n📋 Necessário:')
    console.log('- EVOLUTION_API_URL')
    console.log('- EVOLUTION_API_TOKEN')
    console.log('- EVOLUTION_INSTANCE_NAME')
    process.exit(1)
  }
  
  // Executar atualização
  const success = await updateWebhooks(appUrl)
  
  if (success) {
    console.log('\n🎯 Próximos passos:')
    console.log('1. Teste o webhook enviando uma mensagem no WhatsApp')
    console.log('2. Verifique os logs em /admin')
    console.log('3. Execute sincronização se necessário')
    process.exit(0)
  } else {
    console.log('\n❌ Falha na configuração do webhook')
    console.log('🔧 Verifique as configurações e tente novamente')
    process.exit(1)
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { updateWebhooks } 