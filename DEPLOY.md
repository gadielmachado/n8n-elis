# 🚀 Deploy do Elis Dashboard

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Conta no [GitHub](https://github.com)
- Supabase configurado
- Evolution API funcionando

## 🔧 Configuração das Variáveis de Ambiente

No Vercel, adicione todas as variáveis do arquivo `env-example.txt`:

### 🔑 Variáveis Obrigatórias:
```bash
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_TOKEN=seu-token
EVOLUTION_INSTANCE_NAME=sua-instancia
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-service
NEXTAUTH_SECRET=chave-secreta-muito-forte
WEBHOOK_SECRET=chave-webhook-secreta
NODE_ENV=production
```

### 🌐 URLs de Produção:
```bash
NEXTAUTH_URL=https://seu-dominio.vercel.app
APP_URL=https://seu-dominio.vercel.app
```

## 📡 Configuração do Webhook

Após o deploy, configure o webhook da Evolution API:

```bash
curl -X POST "https://sua-evolution-api.com/webhook/set/SUA_INSTANCIA" \
-H "Content-Type: application/json" \
-H "apikey: SEU_TOKEN" \
-d '{
  "url": "https://seu-dominio.vercel.app/api/webhooks/evolution",
  "events": ["messages.upsert", "connection.update"],
  "enabled": true
}'
```

## 🎯 Endpoints da API

- **Dashboard**: `/api/dashboard`
- **Conversas**: `/api/conversations`
- **Sync Manual**: `/api/evolution/sync`
- **Webhook Evolution**: `/api/webhooks/evolution`
- **Webhook n8n**: `/api/webhooks/n8n`

## 🔄 Deploy Automático

1. Push para main → Deploy automático
2. Pull Requests → Preview deploy
3. Logs em tempo real no painel Vercel

## 🐛 Troubleshooting

### Erro 500 nas APIs:
- Verificar variáveis de ambiente
- Verificar logs no Vercel
- Testar conexão com Supabase

### Webhook não funciona:
- Verificar URL pública
- Testar endpoint manualmente
- Verificar logs da Evolution API

### Build falha:
- Verificar TypeScript errors
- Limpar cache: `npm run clean`
- Verificar dependências 