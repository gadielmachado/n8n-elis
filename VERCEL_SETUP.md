# 🚀 Configuração Vercel - Guia Completo

## ⚠️ PROBLEMA IDENTIFICADO

O erro "Network Error" na Vercel geralmente ocorre por **variáveis de ambiente não configuradas**. Este guia resolve isso.

## 📋 Passo a Passo - Vercel

### **1. Acessar Configurações**

1. Acesse seu projeto na [Vercel](https://vercel.com/dashboard)
2. Clique em **Settings** (Configurações)
3. Vá para **Environment Variables** (Variáveis de Ambiente)

### **2. Adicionar Variáveis Obrigatórias**

**COPIE E COLE** cada variável exatamente como mostrado:

#### **Evolution API**
```
EVOLUTION_API_URL
https://n8n-evolution-api.o5ynml.easypanel.host

EVOLUTION_API_TOKEN  
F802E5ABFA6E-417B-A05D-856C7CB32C41

EVOLUTION_INSTANCE_NAME
Elis.IA
```

#### **Supabase**
```
SUPABASE_URL
https://mudmrbtnppvjmyvgypst.supabase.co

SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZG1yYnRucHB2am15dmd5cHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5Njk3MzAsImV4cCI6MjA2NDU0NTczMH0.niP03h2lr5aHZWYXkWLv4Wnn70tLBsX_gTpYLhYmMB0

SUPABASE_SERVICE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZG1yYnRucHB2am15dmd5cHN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2OTczMCwiZXhwIjoyMDY0NTQ1NzMwfQ.gUjgPDLOQOjB8S_pYWWZmic_GyhZEFBpal8Nr6kv3lo
```

#### **n8n** 
```
N8N_WEBHOOK_URL
https://n8n.elisia.site/webhook/jump-sheets

N8N_API_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTc1MDE2NC02YjI5LTQ5M2YtYmFmZS04YWIxNzA5NDA3ZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUzMTE4NzA3LCJleHAiOjE3NTU2NTg4MDB9.gB6nmNbJVVm8Z_8I5oayIqkM2vrKqHO_OR0AQmctjgE
```

#### **Segurança**
```
NEXTAUTH_SECRET
elis-dashboard-secret-key-2025-very-secure-random-string-here

WEBHOOK_SECRET
webhook-validation-secret-key-for-security-purposes
```

#### **Ambiente**
```
NODE_ENV
production

NEXTAUTH_URL
https://seu-dominio.vercel.app

APP_URL
https://seu-dominio.vercel.app
```

### **3. Configurar Ambiente**

Para cada variável, configure:
- **Environment**: `Production`, `Preview`, `Development` (todas marcadas)
- **Value**: O valor da variável

### **4. Redeploy**

1. Vá para **Deployments**
2. Clique nos **3 pontinhos** do último deploy
3. Selecione **Redeploy**

## 🔧 Depois do Deploy

### **1. Testar Conexão**

Acesse: `https://seu-dominio.vercel.app/api/test-evolution`

### **2. Atualizar Webhooks**

Execute no terminal (substitua pela sua URL):

```bash
curl -X POST https://n8n-evolution-api.o5ynml.easypanel.host/webhook/set/Elis.IA \
-H "Content-Type: application/json" \
-H "apikey: F802E5ABFA6E-417B-A05D-856C7CB32C41" \
-d '{
  "url": "https://SEU-DOMINIO.vercel.app/api/webhooks/evolution",
  "events": ["messages.upsert", "connection.update"],
  "enabled": true
}'
```

### **3. Verificar Admin Panel**

1. Acesse: `https://seu-dominio.vercel.app/admin`
2. Clique em **⚡ Testar Evolution API**
3. Deve mostrar: **✅ Conexão estabelecida com sucesso!**

## 🚨 Problemas Comuns

### **Variáveis não aplicadas**
- Força um redeploy após adicionar variáveis
- Verifique se todas estão marcadas para "Production"

### **URL errada**
- Substitua `https://seu-dominio.vercel.app` pela URL real
- Verifique se não tem `/` no final

### **Token expirado**
- Verifique se o token da Evolution API não expirou
- Regenere se necessário

### **Supabase não conecta**
- Confirme se as chaves do Supabase estão corretas
- Teste no painel do Supabase

## ✅ Checklist Final

- [ ] Todas as variáveis adicionadas na Vercel
- [ ] Redeploy feito
- [ ] `/api/test-evolution` retorna sucesso
- [ ] Webhook atualizado com URL de produção
- [ ] Admin panel funciona
- [ ] Sincronização funciona
- [ ] Dashboard mostra dados

## 🎯 URLs Importantes

- **Dashboard**: `https://seu-dominio.vercel.app/`
- **Admin**: `https://seu-dominio.vercel.app/admin`
- **Teste API**: `https://seu-dominio.vercel.app/api/test-evolution`
- **Health Check**: `https://seu-dominio.vercel.app/api/health`

## 📞 Próximos Passos

1. ✅ **Configure as variáveis**
2. 🔄 **Faça redeploy**
3. ⚡ **Teste a conexão**
4. 🔗 **Atualize webhooks**
5. 📊 **Sincronize dados**

---

**🎉 Após seguir este guia, sua aplicação deve funcionar perfeitamente na Vercel!** 