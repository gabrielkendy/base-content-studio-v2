-- ============================================================
-- PERFORMANCE: Índices críticos para queries de alta frequência
-- Execute no Supabase SQL Editor
-- ============================================================

-- scheduled_posts: cron + calendário fazem full table scan sem isso
CREATE INDEX IF NOT EXISTS ix_scheduled_posts_org_scheduled
  ON scheduled_posts(org_id, scheduled_at);

CREATE INDEX IF NOT EXISTS ix_scheduled_posts_status_scheduled
  ON scheduled_posts(status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS ix_scheduled_posts_cliente
  ON scheduled_posts(cliente_id);

-- conteudos: queries por mês/ano e empresa são muito comuns
CREATE INDEX IF NOT EXISTS ix_conteudos_org_mes_ano
  ON conteudos(org_id, mes, ano);

CREATE INDEX IF NOT EXISTS ix_conteudos_empresa_status
  ON conteudos(empresa_id, status);

CREATE INDEX IF NOT EXISTS ix_conteudos_data_publicacao
  ON conteudos(data_publicacao)
  WHERE data_publicacao IS NOT NULL;

-- notifications: realtime subscription filtra por user_id
CREATE INDEX IF NOT EXISTS ix_notifications_user_read
  ON notifications(user_id, read, created_at DESC);

-- aprovacoes_links: lookup por token (página pública)
CREATE INDEX IF NOT EXISTS ix_aprovacoes_links_token
  ON aprovacoes_links(token);

CREATE INDEX IF NOT EXISTS ix_aprovacoes_links_conteudo
  ON aprovacoes_links(conteudo_id);

-- activity_log: consultas por org + created_at descendente
CREATE INDEX IF NOT EXISTS ix_activity_log_org_created
  ON activity_log(org_id, created_at DESC);

-- members: lookup frequente por user_id
CREATE INDEX IF NOT EXISTS ix_members_user_status
  ON members(user_id, status);

-- messages: chat por cliente
CREATE INDEX IF NOT EXISTS ix_messages_cliente_created
  ON messages(cliente_id, created_at DESC);

-- Add check constraint: scheduled_at não pode ser no passado ao criar
-- (soft validation — não bloqueia updates de status como 'published')
-- ALTER TABLE scheduled_posts
--   ADD CONSTRAINT chk_scheduled_at_future
--   CHECK (status != 'scheduled' OR scheduled_at > now() - interval '1 minute');
