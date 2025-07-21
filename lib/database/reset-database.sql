-- ========================================
-- SCRIPT DE RESET COMPLETO DO BANCO ELIS DASHBOARD
-- ========================================
-- Este script irá:
-- 1. Remover todas as tabelas existentes
-- 2. Remover funções e triggers
-- 3. Recriar toda a estrutura do zero
-- ========================================

-- ATENÇÃO: Este script irá APAGAR TODOS OS DADOS!
-- Execute apenas se tiver certeza!

-- 1. REMOVER TRIGGERS
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS trigger_update_messages_count ON messages;

-- 2. REMOVER FUNÇÕES
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_messages_count();
DROP FUNCTION IF EXISTS calculate_daily_metrics(DATE);

-- 3. REMOVER TABELAS (na ordem correta devido às foreign keys)
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS dashboard_metrics CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- 4. REMOVER POLÍTICAS RLS (se existirem)
-- As políticas são removidas automaticamente com as tabelas

-- 5. REMOVER EXTENSÕES (se necessário)
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- ========================================
-- AGORA RECRIAR TODA A ESTRUTURA
-- ========================================

-- 1. Tabela de Contatos
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  push_name VARCHAR(255),
  avatar_url TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Conversas
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  remote_jid VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMP WITH TIME ZONE,
  messages_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Mensagens
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY, -- ID original da Evolution API
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT,
  message_type VARCHAR(50) DEFAULT 'conversation',
  from_me BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'received',
  timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Tabela de Métricas do Dashboard
CREATE TABLE dashboard_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  total_leads INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0.0,
  no_response_count INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  conversations_today INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0, -- em minutos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- 5. Tabela de Logs de Webhook
CREATE TABLE webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source VARCHAR(50) NOT NULL, -- 'evolution', 'n8n'
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ÍNDICES para Performance
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_remote_jid ON conversations(remote_jid);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_from_me ON messages(from_me);
CREATE INDEX idx_dashboard_metrics_date ON dashboard_metrics(date);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed);

-- 7. FUNÇÕES E TRIGGERS

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contador de mensagens
CREATE OR REPLACE FUNCTION update_messages_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations 
        SET 
            messages_count = messages_count + 1,
            last_message_at = NEW.timestamp
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET messages_count = messages_count - 1
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para contador de mensagens
CREATE TRIGGER trigger_update_messages_count
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_messages_count();

-- 8. Função para calcular métricas diárias
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    total_leads_count INTEGER;
    total_conversations_count INTEGER;
    conversations_today_count INTEGER;
    response_rate_calc DECIMAL(5,2);
    no_response_calc INTEGER;
    avg_response_calc INTEGER;
BEGIN
    -- Total de leads únicos (contatos que enviaram pelo menos 1 mensagem)
    SELECT COUNT(DISTINCT contact_id) INTO total_leads_count
    FROM messages 
    WHERE from_me = FALSE;
    
    -- Total de conversas
    SELECT COUNT(*) INTO total_conversations_count
    FROM conversations;
    
    -- Conversas criadas hoje
    SELECT COUNT(*) INTO conversations_today_count
    FROM conversations 
    WHERE DATE(created_at) = target_date;
    
    -- Contatos que não responderam (receberam mensagem nossa mas não responderam)
    SELECT COUNT(DISTINCT c.id) INTO no_response_calc
    FROM contacts c
    INNER JOIN conversations conv ON c.id = conv.contact_id
    WHERE EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = conv.id AND m.from_me = TRUE
    )
    AND NOT EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = conv.id AND m.from_me = FALSE
    );
    
    -- Taxa de resposta
    IF total_leads_count > 0 THEN
        response_rate_calc = ((total_leads_count - no_response_calc)::DECIMAL / total_leads_count::DECIMAL) * 100;
    ELSE
        response_rate_calc = 0;
    END IF;
    
    -- Tempo médio de resposta (em minutos) - simplificado
    avg_response_calc = 18; -- Placeholder - implementar lógica real depois
    
    -- Inserir ou atualizar métricas
    INSERT INTO dashboard_metrics (
        date, total_leads, response_rate, no_response_count, 
        total_conversations, conversations_today, avg_response_time
    ) VALUES (
        target_date, total_leads_count, response_rate_calc, no_response_calc,
        total_conversations_count, conversations_today_count, avg_response_calc
    )
    ON CONFLICT (date) 
    DO UPDATE SET
        total_leads = EXCLUDED.total_leads,
        response_rate = EXCLUDED.response_rate,
        no_response_count = EXCLUDED.no_response_count,
        total_conversations = EXCLUDED.total_conversations,
        conversations_today = EXCLUDED.conversations_today,
        avg_response_time = EXCLUDED.avg_response_time;
END;
$$ language 'plpgsql';

-- 9. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS RLS (permitir tudo por enquanto - ajustar depois conforme necessário)
CREATE POLICY "Allow all operations" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON dashboard_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON webhook_logs FOR ALL USING (true);

-- 11. INSERIR DADOS INICIAIS (opcional)
-- Inserir uma métrica inicial para hoje
INSERT INTO dashboard_metrics (date, total_leads, response_rate, no_response_count, total_conversations, conversations_today, avg_response_time)
VALUES (CURRENT_DATE, 0, 0.0, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- ========================================
-- RESET COMPLETO FINALIZADO!
-- ========================================

-- Verificar se tudo foi criado corretamente
SELECT 
    'contacts' as tabela,
    COUNT(*) as total_registros
FROM contacts
UNION ALL
SELECT 
    'conversations' as tabela,
    COUNT(*) as total_registros
FROM conversations
UNION ALL
SELECT 
    'messages' as tabela,
    COUNT(*) as total_registros
FROM messages
UNION ALL
SELECT 
    'dashboard_metrics' as tabela,
    COUNT(*) as total_registros
FROM dashboard_metrics
UNION ALL
SELECT 
    'webhook_logs' as tabela,
    COUNT(*) as total_registros
FROM webhook_logs;

-- Executar cálculo inicial das métricas
SELECT calculate_daily_metrics();

-- Mostrar resultado final
SELECT 'BANCO RESETADO E RECRIADO COM SUCESSO!' as status; 