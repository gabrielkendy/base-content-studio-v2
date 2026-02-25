-- ============================================
-- Migration 016: Acervo Digital (Google Drive Sync)
-- Permite criar categorias de acervo por cliente
-- linkadas a pastas do Google Drive
-- ============================================

-- 1. ACERVO_CATEGORIAS (categorias de acervo por cliente)
CREATE TABLE IF NOT EXISTS acervo_categorias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  
  -- Metadados da categoria
  titulo varchar(255) NOT NULL,
  descricao text,
  icone varchar(50) DEFAULT 'folder', -- lucide icon name
  ordem int DEFAULT 0,
  
  -- Link do Google Drive
  drive_folder_id varchar(255), -- ID da pasta no Drive
  drive_folder_url text, -- URL completa (pra facilitar)
  
  -- Configurações de sync
  sync_enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_status varchar(50) DEFAULT 'pending', -- pending, syncing, success, error
  sync_error text,
  
  -- Visibilidade
  is_public boolean DEFAULT true, -- cliente pode ver
  requires_password boolean DEFAULT false,
  password_hash varchar(255),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(cliente_id, titulo)
);

-- 2. ACERVO_ARQUIVOS (arquivos sincronizados do Drive)
CREATE TABLE IF NOT EXISTS acervo_arquivos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id uuid REFERENCES acervo_categorias(id) ON DELETE CASCADE NOT NULL,
  
  -- Dados do arquivo
  filename varchar(500) NOT NULL,
  mime_type varchar(100),
  file_size bigint,
  
  -- Google Drive info
  drive_file_id varchar(255) NOT NULL,
  drive_web_view_link text,
  drive_download_link text,
  drive_thumbnail_link text,
  
  -- Cache local (opcional - pra preview rápido)
  cached_thumbnail_url text,
  
  -- Metadados
  description text,
  tags text[] DEFAULT '{}',
  ordem int DEFAULT 0,
  
  -- Tracking
  drive_modified_at timestamptz, -- última modificação no Drive
  synced_at timestamptz DEFAULT now(),
  download_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(categoria_id, drive_file_id)
);

-- 3. ACERVO_DOWNLOADS (log de downloads - analytics)
CREATE TABLE IF NOT EXISTS acervo_downloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_id uuid REFERENCES acervo_arquivos(id) ON DELETE CASCADE NOT NULL,
  
  -- Quem baixou
  ip_address varchar(45),
  user_agent text,
  referer text,
  
  -- Quando
  downloaded_at timestamptz DEFAULT now()
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE acervo_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE acervo_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE acervo_downloads ENABLE ROW LEVEL SECURITY;

-- Service role pode tudo
DO $policy$ BEGIN
  CREATE POLICY "service_role_all_categorias" ON acervo_categorias FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $policy$;

DO $policy$ BEGIN
  CREATE POLICY "service_role_all_arquivos" ON acervo_arquivos FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $policy$;

DO $policy$ BEGIN
  CREATE POLICY "service_role_all_downloads" ON acervo_downloads FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $policy$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_acervo_categorias_cliente ON acervo_categorias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_acervo_categorias_org ON acervo_categorias(org_id);
CREATE INDEX IF NOT EXISTS idx_acervo_arquivos_categoria ON acervo_arquivos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_acervo_arquivos_drive_id ON acervo_arquivos(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_acervo_downloads_arquivo ON acervo_downloads(arquivo_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Função pra atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_acervo_categoria_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_acervo_categoria ON acervo_categorias;
CREATE TRIGGER trigger_update_acervo_categoria
  BEFORE UPDATE ON acervo_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_acervo_categoria_timestamp();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE acervo_categorias IS 'Categorias de acervo digital por cliente, linkadas a pastas do Google Drive';
COMMENT ON TABLE acervo_arquivos IS 'Arquivos sincronizados do Google Drive';
COMMENT ON TABLE acervo_downloads IS 'Log de downloads para analytics';

COMMENT ON COLUMN acervo_categorias.drive_folder_id IS 'ID da pasta no Google Drive (extraído da URL)';
COMMENT ON COLUMN acervo_categorias.sync_status IS 'Status: pending, syncing, success, error';
COMMENT ON COLUMN acervo_arquivos.drive_file_id IS 'ID único do arquivo no Google Drive';
