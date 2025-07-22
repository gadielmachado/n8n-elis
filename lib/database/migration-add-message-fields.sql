-- Migração: Adicionar campos faltantes na tabela messages
-- Execute no Supabase Query Editor

-- Adicionar colunas que podem estar faltando na tabela messages
DO $$ 
BEGIN
    -- Adicionar media_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'media_url') THEN
        ALTER TABLE messages ADD COLUMN media_url TEXT;
        RAISE NOTICE 'Coluna media_url adicionada à tabela messages';
    ELSE
        RAISE NOTICE 'Coluna media_url já existe na tabela messages';
    END IF;
    
    -- Adicionar quoted_message_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'quoted_message_id') THEN
        ALTER TABLE messages ADD COLUMN quoted_message_id VARCHAR(255);
        RAISE NOTICE 'Coluna quoted_message_id adicionada à tabela messages';
    ELSE
        RAISE NOTICE 'Coluna quoted_message_id já existe na tabela messages';
    END IF;
END $$; 