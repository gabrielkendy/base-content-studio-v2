-- ============================================
-- Migration: Adicionar colunas de feedback do cliente
-- Data: 2026-02-19
-- Problema: Comentários de ajuste não estavam sendo salvos no conteúdo
-- ============================================

-- 1. Adicionar coluna para comentário do cliente
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS comentario_cliente TEXT;

-- 2. Adicionar coluna para nome do cliente que fez o feedback
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS cliente_nome_feedback VARCHAR(255);

-- 3. Migrar comentários existentes de aprovacoes_links para conteudos
UPDATE conteudos c
SET 
  comentario_cliente = a.comentario_cliente,
  cliente_nome_feedback = a.cliente_nome
FROM aprovacoes_links a
WHERE c.id = a.conteudo_id 
  AND a.status = 'ajuste'
  AND a.comentario_cliente IS NOT NULL
  AND c.comentario_cliente IS NULL;

-- 4. Criar índice para buscar conteúdos que precisam de ajuste
CREATE INDEX IF NOT EXISTS idx_conteudos_comentario ON conteudos(comentario_cliente) WHERE comentario_cliente IS NOT NULL;

-- ============================================
-- RESULTADO ESPERADO:
-- - 2 colunas novas em conteudos
-- - ~16 comentários migrados de aprovacoes_links
-- ============================================
