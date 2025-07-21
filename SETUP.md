# 🚀 Guia de Configuração - Elis Dashboard

Este guia vai te ajudar a configurar completamente sua aplicação do zero.

## ✅ **Estrutura Criada**

Sua aplicação agora possui:

- ✅ **Frontend Next.js** completo com TypeScript
- ✅ **Backend APIs** para Evolution API e n8n
- ✅ **Banco Supabase** com schema completo
- ✅ **Webhooks** para receber dados em tempo real
- ✅ **Dashboard** com métricas e gráficos
- ✅ **Painel Admin** para monitoramento
- ✅ **Sistema de Sincronização** manual

## 📋 **Próximos Passos Obrigatórios**

### 1. **Criar arquivo .env.local**

Crie o arquivo `.env.local` na raiz do projeto com suas credenciais:

```bash
# Evolution API Configuration
EVOLUTION_API_URL=https://n8n-evolution-api.o5ynml.easypanel.host
EVOLUTION_API_TOKEN=F802E5ABFA6E-417B-A05D-856C7CB32C41
EVOLUTION_INSTANCE_NAME=Elis.IA

# n8n Configuration  
N8N_WEBHOOK_URL=https://n8n.elisia.site/webhook/jump-sheets
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTc1MDE2NC02YjI5LTQ5M2YtYmFmZS04YWIxNzA5NDA3ZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUzMTE4NzA3LCJleHAiOjE3NTU2NTg4MDB9.gB6nmNbJVVm8Z_8I5oayIqkM2vrKqHO_OR0AQmctjgE

# Supabase Configuration
SUPABASE_URL=https://mudmrbtnppvjmyvgypst.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZG1yYnRucHB2am15dmd5cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5Njk3MzAsImV4cCI6MjA2NDU0NTczMH0.niP03h2lr5aHZWYXkWLv4Wnn70tLBsX_gTpYLhYmMB0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZG1yYnRucHB2am15dmd5cHN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2OTczMCwiZXhwIjoyMDY0NTQ1NzMwfQ.gUjgPDLOQOjB8S_pYWWZmic_GyhZEFBpal8Nr6kv3lo

# Security Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=elis-dashboard-secret-key-2025-very-secure-random-string-here
WEBHOOK_SECRET=webhook-validation-secret-key-for-security-purposes

# App Configuration
NODE_ENV=development
APP_URL=http://localhost:3000
```

### 2. **Configurar Banco de Dados Supabase**

1. Acesse: https://mudmrbtnppvjmyvgypst.supabase.co
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `lib/database/schema.sql`
4. Verifique se as tabelas foram criadas

### 3. **Configurar Webhooks Evolution API**

Execute este comando para configurar o webhook:

```bash
curl -X POST https://n8n-evolution-api.o5ynml.easypanel.host/webhook/set/Elis.IA \
-H "Content-Type: application/json" \
-H "apikey: F802E5ABFA6E-417B-A05D-856C7CB32C41" \
-d '{
  "url": "http://localhost:3000/api/webhooks/evolution",
  "events": ["messages.upsert", "connection.update"],
  "enabled": true
}'
```

**⚠️ IMPORTANTE**: Quando fizer deploy, substitua `localhost:3000` pela sua URL de produção.

### 4. **Configurar n8n Webhook**

No seu workflow n8n:
1. Configure webhook para: `http://localhost:3000/api/webhooks/n8n`
2. Método: `POST`
3. Headers: `Content-Type: application/json`

## 🔧 **Como Usar**

### **Iniciar Aplicação**
```bash
npm run dev
```

Acesse: `http://localhost:3000`

### **Páginas Disponíveis**

- **Dashboard**: `/` - Métricas e gráficos
- **Conversas**: `/conversas` - Lista de conversas
- **Admin**: `/admin` - Painel administrativo

### **Primeiros Passos**

1. **Acesse `/admin`** para verificar status dos serviços
2. **Execute sincronização** para buscar dados históricos
3. **Configure webhooks** para dados em tempo real
4. **Acesse dashboard** para ver métricas

## 🔍 **Testando a Integração**

### **1. Verificar Saúde do Sistema**
```bash
curl http://localhost:3000/api/health
```

### **2. Testar Webhook Evolution**
```bash
curl -X POST http://localhost:3000/api/webhooks/evolution \
-H "Content-Type: application/json" \
-d '{
  "event": "messages.upsert",
  "instance": "Elis.IA",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "test123"
    },
    "pushName": "Teste",
    "message": {
      "conversation": "Olá, teste!"
    },
    "messageTimestamp": 1703073600
  },
  "date_time": "2024-01-01T12:00:00.000Z",
  "sender": "test",
  "server_url": "test",
  "apikey": "test",
  "webhookUrl": "test"
}'
```

### **3. Sincronizar Dados Manualmente**
```bash
curl -X POST http://localhost:3000/api/evolution/sync \
-H "Content-Type: application/json" \
-d '{
  "type": "all",
  "limit": 100
}'
```

## 📱 **URLs da Aplicação**

### **Frontend**
- Dashboard: `http://localhost:3000/`
- Conversas: `http://localhost:3000/conversas`
- Admin: `http://localhost:3000/admin`

### **APIs Backend**
- Health Check: `GET /api/health`
- Dashboard: `GET /api/dashboard`
- Conversas: `GET /api/conversations`
- Sync Evolution: `POST /api/evolution/sync`
- Webhook Evolution: `POST /api/webhooks/evolution`
- Webhook n8n: `POST /api/webhooks/n8n`

## 🚨 **Problemas Comuns**

### **1. Erro de Conexão Supabase**
- Verifique as chaves no `.env.local`
- Confirme se o projeto Supabase está ativo
- Execute o schema SQL novamente

### **2. Evolution API não conecta**
- Verifique URL e token
- Teste diretamente a API no browser
- Confirme se a instância está ativa

### **3. Webhooks não chegam**
- Configure URL correta nos webhooks
- Use ngrok para desenvolvimento local
- Verifique logs no painel admin

### **4. Dados não aparecem**
- Execute sincronização manual no `/admin`
- Verifique se há dados na Evolution API
- Confirme se as tabelas foram criadas

## 🎯 **Próximos Passos**

1. **Teste todos os endpoints** no painel admin
2. **Configure webhooks** para dados em tempo real
3. **Sincronize dados históricos** pela primeira vez
4. **Monitore logs** para verificar funcionamento
5. **Configure domínio** para produção

## 🔧 **Deploy para Produção**

### **Vercel (Recomendado)**
1. Conecte repositório ao Vercel
2. Configure variáveis de ambiente
3. Atualize webhooks com URL de produção
4. Teste todas as integrações

### **Outras Plataformas**
- Railway
- Netlify
- Heroku
- VPS própria

## ✅ **Checklist Final**

- [ ] Arquivo `.env.local` criado
- [ ] Schema SQL executado no Supabase
- [ ] Aplicação rodando (`npm run dev`)
- [ ] Health check passando (`/api/health`)
- [ ] Webhooks configurados
- [ ] Sincronização testada
- [ ] Dashboard com dados
- [ ] Conversas aparecendo

**🎉 Parabéns! Sua aplicação está pronta para uso!**

---

## 📞 **Suporte**

Se tiver problemas:
1. Verifique este guia novamente
2. Consulte logs no painel Admin
3. Teste endpoints individualmente
4. Verifique configurações no Supabase 