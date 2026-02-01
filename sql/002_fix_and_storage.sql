-- ============================================
-- BASE Content Studio v2 - Fixes and Storage
-- ============================================

-- 1. TABELA SOLICITACOES
CREATE TABLE IF NOT EXISTS solicitacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  titulo varchar(500) NOT NULL,
  descricao text,
  referencias jsonb DEFAULT '[]',
  arquivos_ref jsonb DEFAULT '[]',
  prioridade varchar(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  prazo_desejado date,
  status varchar(30) DEFAULT 'nova' CHECK (status IN ('nova', 'em_analise', 'aprovada', 'em_producao', 'entregue', 'cancelada')),
  respondido_por uuid REFERENCES auth.users(id),
  resposta text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes para solicitacoes
CREATE INDEX IF NOT EXISTS idx_solicitacoes_org ON solicitacoes(org_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cliente ON solicitacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(org_id, status);

-- RLS para solicitacoes
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Membros da org podem ver todas as solicitações
CREATE POLICY "solicitacoes_org_select" ON solicitacoes FOR SELECT USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- Membros podem criar solicitações
CREATE POLICY "solicitacoes_org_insert" ON solicitacoes FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- Membros podem atualizar solicitações
CREATE POLICY "solicitacoes_org_update" ON solicitacoes FOR UPDATE USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- Membros podem deletar solicitações (admin/gestor)
CREATE POLICY "solicitacoes_org_delete" ON solicitacoes FOR DELETE USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'gestor'))
);

-- 2. STORAGE BUCKET para mídia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy - public read
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'media');

-- Storage policy - authenticated users can upload
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Storage policy - users can update their org's files
CREATE POLICY "Users can update org files" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'media' AND 
  auth.uid()::text IN (
    SELECT user_id::text FROM members 
    WHERE org_id::text = (storage.foldername(name))[1]
  )
);

-- Storage policy - users can delete their org's files
CREATE POLICY "Users can delete org files" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'media' AND 
  auth.uid()::text IN (
    SELECT user_id::text FROM members 
    WHERE org_id::text = (storage.foldername(name))[1]
  )
);

-- 3. LIMPAR ORGANIZAÇÕES DUPLICADAS
-- Identificar e limpar duplicatas para gabriel.kend@gmail.com
DO $$
DECLARE
    user_uuid uuid;
    base_org_id uuid;
    duplicate_org_ids uuid[];
    org_record record;
BEGIN
    -- Buscar o UUID do usuário gabriel.kend@gmail.com
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'gabriel.kend@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'Usuário gabriel.kend@gmail.com não encontrado';
        RETURN;
    END IF;
    
    -- Buscar a org "Agência BASE" (manter esta)
    SELECT org_id INTO base_org_id 
    FROM members m
    JOIN organizations o ON m.org_id = o.id
    WHERE m.user_id = user_uuid 
    AND (o.name ILIKE '%agência base%' OR o.name ILIKE '%agencia base%' OR o.slug ILIKE '%agencia-base%')
    LIMIT 1;
    
    -- Se não encontrou a Agência BASE, pegar a primeira org do usuário
    IF base_org_id IS NULL THEN
        SELECT org_id INTO base_org_id 
        FROM members 
        WHERE user_id = user_uuid
        LIMIT 1;
        
        -- Renomear para Agência BASE
        UPDATE organizations 
        SET name = 'Agência BASE', 
            slug = 'agencia-base',
            updated_at = now()
        WHERE id = base_org_id;
    END IF;
    
    -- Buscar todas as outras orgs do usuário (duplicatas)
    SELECT ARRAY(
        SELECT m.org_id 
        FROM members m
        WHERE m.user_id = user_uuid 
        AND m.org_id != base_org_id
    ) INTO duplicate_org_ids;
    
    -- Mover dados das orgs duplicatas para a org base
    IF array_length(duplicate_org_ids, 1) > 0 THEN
        RAISE NOTICE 'Movendo dados de % organizações duplicadas para org base %', array_length(duplicate_org_ids, 1), base_org_id;
        
        -- Mover clientes
        UPDATE clientes SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Mover conteúdos
        UPDATE conteudos SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Mover mensagens
        UPDATE messages SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Mover notificações
        UPDATE notifications SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Mover activity_log
        UPDATE activity_log SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Mover webhook_configs
        UPDATE webhook_configs SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Mover webhook_events
        UPDATE webhook_events SET org_id = base_org_id 
        WHERE org_id = ANY(duplicate_org_ids);
        
        -- Remover memberships das orgs duplicadas
        DELETE FROM members WHERE org_id = ANY(duplicate_org_ids);
        
        -- Remover orgs duplicadas
        DELETE FROM organizations WHERE id = ANY(duplicate_org_ids);
        
        RAISE NOTICE 'Limpeza concluída. Org base: %', base_org_id;
    ELSE
        RAISE NOTICE 'Nenhuma duplicata encontrada para o usuário';
    END IF;
END $$;

-- 4. ATUALIZAR CAMPOS DE STATUS DOS CONTEÚDOS
ALTER TABLE conteudos 
ALTER COLUMN status TYPE varchar(50),
DROP CONSTRAINT IF EXISTS conteudos_status_check;

ALTER TABLE conteudos 
ADD CONSTRAINT conteudos_status_check 
CHECK (status IN ('rascunho', 'conteudo', 'design', 'aprovacao_cliente', 'ajustes', 'aprovado_agendado', 'concluido'));

-- 5. FUNÇÃO PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para solicitacoes
CREATE TRIGGER update_solicitacoes_updated_at 
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. ADICIONAR SOLICITACOES AO REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes;

-- 7. FUNÇÃO PARA GERAR TOKEN DE APROVAÇÃO
CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS text AS $$
BEGIN
  RETURN encode(digest(gen_random_uuid()::text || extract(epoch from now())::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Log de conclusão
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration 002_fix_and_storage.sql executada com sucesso em %', now();
END $$;