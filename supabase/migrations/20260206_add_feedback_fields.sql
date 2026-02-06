-- Adicionar campos para feedback do cliente diretamente no conteúdo
ALTER TABLE conteudos 
ADD COLUMN IF NOT EXISTS comentario_cliente TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome_feedback TEXT;

-- Migrar feedbacks existentes da tabela approvals para conteudos
UPDATE conteudos c
SET 
  comentario_cliente = a.comment,
  cliente_nome_feedback = a.reviewer_name
FROM approvals a
WHERE a.conteudo_id = c.id 
  AND a.type = 'external' 
  AND a.status = 'adjustment'
  AND c.comentario_cliente IS NULL
  AND a.comment IS NOT NULL;

-- Índice para busca por conteúdos com feedback pendente
CREATE INDEX IF NOT EXISTS idx_conteudos_feedback ON conteudos(status) WHERE comentario_cliente IS NOT NULL;
