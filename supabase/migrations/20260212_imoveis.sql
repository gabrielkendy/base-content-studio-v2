-- =====================================================
-- MIGRATION: Módulo de Imóveis para Portella
-- Data: 12/02/2026
-- Descrição: Sistema de cadastro de imóveis com automação
-- =====================================================

-- =====================================================
-- TABELA: imoveis
-- =====================================================

CREATE TABLE IF NOT EXISTS imoveis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Identificação
  codigo varchar(50),
  titulo varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL DEFAULT 'apartamento', -- apartamento, casa, terreno, comercial, cobertura, studio
  
  -- Localização
  endereco varchar(255),
  numero varchar(20),
  complemento varchar(100),
  bairro varchar(100),
  cidade varchar(100),
  estado varchar(2),
  cep varchar(10),
  
  -- Características
  area_total decimal(10,2),
  area_construida decimal(10,2),
  quartos int DEFAULT 0,
  suites int DEFAULT 0,
  banheiros int DEFAULT 0,
  vagas int DEFAULT 0,
  
  -- Valores
  preco decimal(15,2),
  preco_condominio decimal(10,2),
  preco_iptu decimal(10,2),
  tipo_negocio varchar(20) DEFAULT 'venda', -- venda, aluguel, venda_aluguel
  
  -- Descrição
  descricao text,
  diferenciais text[], -- array de diferenciais
  
  -- Mídia
  fotos text[], -- array de URLs
  video_url text,
  tour_virtual_url text,
  
  -- Conteúdo gerado
  carrossel_gerado jsonb, -- estrutura do carrossel
  legenda_gerada text,
  roteiro_video text,
  
  -- Status do fluxo
  status varchar(30) DEFAULT 'novo', -- novo, conteudo_criado, aguardando_gravacao, em_producao, publicado
  email_kendy_enviado boolean DEFAULT false,
  email_equipe_enviado boolean DEFAULT false,
  resposta_gravacao varchar(20), -- sim, nao, depois
  respondido_por varchar(255),
  respondido_em timestamptz,
  
  -- Vínculo com conteúdo
  solicitacao_id uuid REFERENCES solicitacoes(id),
  conteudo_id uuid REFERENCES conteudos(id),
  
  -- Metadados
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comentários
COMMENT ON TABLE imoveis IS 'Cadastro de imóveis para geração automática de conteúdo';
COMMENT ON COLUMN imoveis.carrossel_gerado IS 'JSON com estrutura dos slides do carrossel';
COMMENT ON COLUMN imoveis.diferenciais IS 'Lista de diferenciais do imóvel';

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_imoveis_org ON imoveis(org_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_cliente ON imoveis(cliente_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_status ON imoveis(status);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo);
CREATE INDEX IF NOT EXISTS idx_imoveis_created ON imoveis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imoveis_codigo ON imoveis(codigo) WHERE codigo IS NOT NULL;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imoveis_select_policy" ON imoveis;
CREATE POLICY "imoveis_select_policy" ON imoveis
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "imoveis_insert_policy" ON imoveis;
CREATE POLICY "imoveis_insert_policy" ON imoveis
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "imoveis_update_policy" ON imoveis;
CREATE POLICY "imoveis_update_policy" ON imoveis
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "imoveis_delete_policy" ON imoveis;
CREATE POLICY "imoveis_delete_policy" ON imoveis
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_imoveis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS imoveis_updated_at ON imoveis;
CREATE TRIGGER imoveis_updated_at
  BEFORE UPDATE ON imoveis
  FOR EACH ROW
  EXECUTE FUNCTION update_imoveis_updated_at();

-- =====================================================
-- TABELA: imoveis_config (configurações por cliente)
-- =====================================================

CREATE TABLE IF NOT EXISTS imoveis_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Emails
  email_gestor varchar(255), -- email do Kendy
  emails_equipe text[], -- emails da equipe de gravação
  
  -- Templates
  template_carrossel jsonb, -- template padrão do carrossel
  template_legenda text, -- template da legenda
  template_roteiro text, -- template do roteiro de vídeo
  
  -- Configurações
  auto_criar_solicitacao boolean DEFAULT true,
  auto_enviar_emails boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(cliente_id)
);

-- RLS para config
ALTER TABLE imoveis_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imoveis_config_all_policy" ON imoveis_config;
CREATE POLICY "imoveis_config_all_policy" ON imoveis_config
  FOR ALL USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
