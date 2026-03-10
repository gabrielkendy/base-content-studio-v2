-- Migration: Canais de Notificação para Aprovadores
-- Data: 2026-03-10
-- Adiciona suporte a múltiplos canais (WhatsApp, Email, Telegram)

-- Adicionar coluna telegram_id
ALTER TABLE aprovadores 
ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(100);

-- Adicionar coluna canais_notificacao (array de strings)
-- Valores possíveis: 'whatsapp', 'email', 'telegram'
ALTER TABLE aprovadores 
ADD COLUMN IF NOT EXISTS canais_notificacao TEXT[] DEFAULT ARRAY['whatsapp']::TEXT[];

-- Comentários
COMMENT ON COLUMN aprovadores.telegram_id IS 'ID ou username do Telegram (ex: @usuario ou 957707348)';
COMMENT ON COLUMN aprovadores.canais_notificacao IS 'Canais de notificação ativos: whatsapp, email, telegram';

-- Índice para busca por canal
CREATE INDEX IF NOT EXISTS idx_aprovadores_canais ON aprovadores USING GIN (canais_notificacao);

-- Migrar dados existentes: se recebe_notificacao = true e tem whatsapp, definir ['whatsapp']
UPDATE aprovadores 
SET canais_notificacao = ARRAY['whatsapp']::TEXT[]
WHERE recebe_notificacao = true 
  AND whatsapp IS NOT NULL 
  AND whatsapp != ''
  AND canais_notificacao IS NULL;

-- Se tem email preenchido, adicionar email aos canais
UPDATE aprovadores 
SET canais_notificacao = array_append(canais_notificacao, 'email')
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT ('email' = ANY(canais_notificacao));
