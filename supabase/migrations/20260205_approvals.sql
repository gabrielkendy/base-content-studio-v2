-- ============================================
-- MÓDULO 2: Sistema de Aprovações
-- Data: 05/02/2026
-- ============================================

-- Tabela de histórico de aprovações (internas e externas)
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conteudo_id uuid NOT NULL REFERENCES conteudos(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('internal', 'external')),
  status varchar(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'adjustment')),
  reviewer_id uuid REFERENCES auth.users(id),
  reviewer_name varchar(255),
  comment text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  
  -- Metadata
  previous_status varchar(50),
  new_status varchar(50),
  link_token varchar(255) -- Para vincular com aprovacoes_links
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_approvals_conteudo ON approvals(conteudo_id);
CREATE INDEX IF NOT EXISTS idx_approvals_org ON approvals(org_id);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(type);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approvals(created_at DESC);

-- Adicionar campo sub_status na tabela conteudos (para controle granular)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conteudos' AND column_name = 'sub_status'
  ) THEN
    ALTER TABLE conteudos ADD COLUMN sub_status varchar(50);
  END IF;
END $$;

-- Adicionar campo internal_approved (aprovação interna já feita)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conteudos' AND column_name = 'internal_approved'
  ) THEN
    ALTER TABLE conteudos ADD COLUMN internal_approved boolean DEFAULT false;
  END IF;
END $$;

-- Adicionar campo internal_approved_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conteudos' AND column_name = 'internal_approved_by'
  ) THEN
    ALTER TABLE conteudos ADD COLUMN internal_approved_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Adicionar campo internal_approved_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conteudos' AND column_name = 'internal_approved_at'
  ) THEN
    ALTER TABLE conteudos ADD COLUMN internal_approved_at timestamptz;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Policy: membros podem ver aprovações da sua org
CREATE POLICY "Members can view org approvals" ON approvals
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: membros podem inserir aprovações na sua org
CREATE POLICY "Members can create org approvals" ON approvals
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: membros podem atualizar aprovações da sua org
CREATE POLICY "Members can update org approvals" ON approvals
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Comentário na tabela
COMMENT ON TABLE approvals IS 'Histórico completo de aprovações internas e externas';
COMMENT ON COLUMN approvals.type IS 'internal = aprovação da equipe, external = aprovação do cliente';
COMMENT ON COLUMN approvals.status IS 'pending = aguardando, approved = aprovado, rejected = rejeitado, adjustment = pediu ajuste';
