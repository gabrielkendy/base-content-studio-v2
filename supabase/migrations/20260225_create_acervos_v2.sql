-- Migration: Criar sistema de Acervo Digital (CORRIGIDO)
-- Data: 2026-02-25
-- Autor: Max (Agência BASE)

-- ============================================
-- FASE 1.1: Criar tabela acervos
-- ============================================
CREATE TABLE IF NOT EXISTS acervos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Identificação
  titulo VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(10) DEFAULT '📁',
  
  -- Origem dos arquivos
  tipo_origem VARCHAR(20) DEFAULT 'drive',
  drive_folder_id VARCHAR(255),
  drive_folder_url TEXT,
  
  -- Config
  visibilidade VARCHAR(20) DEFAULT 'publico',
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  
  -- Metadata
  total_arquivos INT DEFAULT 0,
  ultimo_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cliente_id, slug)
);

-- ============================================
-- FASE 1.2: Criar tabela acervo_arquivos
-- ============================================
CREATE TABLE IF NOT EXISTS acervo_arquivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  acervo_id UUID REFERENCES acervos(id) ON DELETE CASCADE,
  
  -- Arquivo
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  tamanho BIGINT,
  
  -- URLs
  url_original TEXT,
  url_thumbnail TEXT,
  url_download TEXT,
  
  -- Metadata
  drive_file_id VARCHAR(255),
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FASE 1.3: Criar índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_acervos_cliente_id ON acervos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_acervos_org_id ON acervos(org_id);
CREATE INDEX IF NOT EXISTS idx_acervos_slug ON acervos(slug);
CREATE INDEX IF NOT EXISTS idx_acervos_ativo ON acervos(ativo);
CREATE INDEX IF NOT EXISTS idx_acervo_arquivos_acervo_id ON acervo_arquivos(acervo_id);

-- ============================================
-- RLS Policies (CORRIGIDO - usa 'members' ao invés de 'organization_members')
-- ============================================

-- Habilitar RLS
ALTER TABLE acervos ENABLE ROW LEVEL SECURITY;
ALTER TABLE acervo_arquivos ENABLE ROW LEVEL SECURITY;

-- Políticas para acervos
CREATE POLICY "Acervos públicos visíveis para todos" ON acervos
  FOR SELECT
  USING (visibilidade = 'publico' AND ativo = true);

CREATE POLICY "Membros da org podem ver todos acervos" ON acervos
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Membros da org podem criar acervos" ON acervos
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Membros da org podem atualizar acervos" ON acervos
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Membros da org podem deletar acervos" ON acervos
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Políticas para acervo_arquivos
CREATE POLICY "Arquivos de acervos públicos visíveis" ON acervo_arquivos
  FOR SELECT
  USING (
    acervo_id IN (
      SELECT id FROM acervos WHERE visibilidade = 'publico' AND ativo = true
    )
  );

CREATE POLICY "Membros podem ver todos arquivos" ON acervo_arquivos
  FOR SELECT
  USING (
    acervo_id IN (
      SELECT a.id FROM acervos a
      JOIN members m ON a.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY "Membros podem gerenciar arquivos" ON acervo_arquivos
  FOR ALL
  USING (
    acervo_id IN (
      SELECT a.id FROM acervos a
      JOIN members m ON a.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

-- ============================================
-- Função para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_acervos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acervos_updated_at ON acervos;
CREATE TRIGGER acervos_updated_at
  BEFORE UPDATE ON acervos
  FOR EACH ROW
  EXECUTE FUNCTION update_acervos_updated_at();

-- ============================================
-- Função para atualizar total_arquivos
-- ============================================
CREATE OR REPLACE FUNCTION update_acervo_total_arquivos()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE acervos SET total_arquivos = total_arquivos + 1 WHERE id = NEW.acervo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE acervos SET total_arquivos = total_arquivos - 1 WHERE id = OLD.acervo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acervo_arquivos_count ON acervo_arquivos;
CREATE TRIGGER acervo_arquivos_count
  AFTER INSERT OR DELETE ON acervo_arquivos
  FOR EACH ROW
  EXECUTE FUNCTION update_acervo_total_arquivos();
