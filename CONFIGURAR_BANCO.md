# 🗄️ Configuração do Banco Supabase

## ⚠️ **ATENÇÃO IMPORTANTE**

Este processo irá **APAGAR TODOS OS DADOS** existentes no seu banco Supabase e criar uma estrutura nova. **Só execute se tiver certeza!**

## 📋 **Passo a Passo**

### **1. Acessar o Supabase**

1. Acesse: https://mudmrbtnppvjmyvgypst.supabase.co
2. Faça login com sua conta
3. Vá para **SQL Editor** (ícone de código `</>`)

### **2. Executar Reset Completo**

1. No **SQL Editor**, clique em **+ New query**
2. **COPIE TODO** o conteúdo do arquivo `lib/database/reset-database.sql`
3. **COLE** no editor do Supabase
4. Clique em **RUN** ou **Ctrl+Enter**

### **3. Verificar Execução**

Você deve ver no final:

```
BANCO RESETADO E RECRIADO COM SUCESSO!
```

E uma tabela mostrando:
- contacts: 0 registros
- conversations: 0 registros  
- messages: 0 registros
- dashboard_metrics: 1 registro (métrica inicial)
- webhook_logs: 0 registros

### **4. Confirmar Estrutura**

No painel esquerdo do Supabase, vá em **Table Editor** e confirme que existem estas tabelas:

- ✅ **contacts** - Contatos do WhatsApp
- ✅ **conversations** - Conversas/chats
- ✅ **messages** - Mensagens individuais
- ✅ **dashboard_metrics** - Métricas calculadas
- ✅ **webhook_logs** - Logs de webhooks

## 🔧 **O que foi Criado**

### **Tabelas**
- **contacts** - Armazena contatos do WhatsApp
- **conversations** - Conversas com status e contadores
- **messages** - Mensagens individuais com metadata
- **dashboard_metrics** - Métricas diárias calculadas
- **webhook_logs** - Logs de todos os webhooks recebidos

### **Funções SQL**
- `calculate_daily_metrics()` - Calcula métricas do dashboard
- `update_updated_at_column()` - Atualiza timestamps automaticamente
- `update_messages_count()` - Conta mensagens por conversa

### **Triggers**
- Atualização automática de `updated_at`
- Contador automático de mensagens por conversa
- Atualização de `last_message_at` nas conversas

### **Índices**
- Otimizações para buscas por telefone, data, etc.
- Performance otimizada para queries frequentes

### **RLS (Row Level Security)**
- Habilitado em todas as tabelas
- Políticas permissivas para desenvolvimento

## 🚨 **Problemas Comuns**

### **Erro de Permissão**
Se aparecer erro de permissão:
1. Confirme que está logado como proprietário do projeto
2. Tente executar o script em partes menores

### **Erro de Foreign Key**
Se aparecer erro de chave estrangeira:
1. Execute primeiro a parte de `DROP TABLE`
2. Depois execute a parte de `CREATE TABLE`

### **Tabela não aparece**
Se alguma tabela não aparecer:
1. Recarregue a página do Supabase
2. Vá em **Table Editor** e clique em **Refresh**

## ✅ **Verificação Final**

Execute esta query no SQL Editor para confirmar:

```sql
-- Verificar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar dados iniciais
SELECT * FROM dashboard_metrics;
```

## 🎯 **Próximo Passo**

Após configurar o banco:

1. ✅ **Banco configurado**
2. 🔄 **Criar arquivo .env.local** (se ainda não criou)
3. 🚀 **Testar aplicação** em http://localhost:3000
4. ⚙️ **Configurar webhooks** conforme SETUP.md

## 📞 **Suporte**

Se tiver problemas:
1. Verifique se está no projeto correto no Supabase
2. Confirme permissões de admin
3. Tente executar o script em etapas menores
4. Recarregue a página e tente novamente

---

**🎉 Após executar, seu banco estará pronto para a aplicação!** 