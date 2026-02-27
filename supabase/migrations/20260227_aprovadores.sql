-- Migration: Sistema de Aprovadores
-- Data: 2026-02-27
-- Baseado no modelo "Aprova Aí"

-- Tabela de aprovadores (internos e clientes)
CREATE TABLE IF NOT EXISTS aprovadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Dados do aprovador
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  whatsapp VARCHAR(20) NOT NULL, -- formato: 5531999999999
  pais VARCHAR(5) DEFAULT '+55',
  
  -- Tipo e nível
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('interno', 'cliente', 'designer')),
  nivel INTEGER NOT NULL DEFAULT 1, -- ordem de aprovação (1 = primeiro, 2 = segundo...)
  
  -- Permissões
  pode_editar_legenda BOOLEAN DEFAULT false,
  recebe_notificacao BOOLEAN DEFAULT true,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aprovadores_empresa ON aprovadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_aprovadores_tipo ON aprovadores(tipo);
CREATE INDEX IF NOT EXISTS idx_aprovadores_nivel ON aprovadores(nivel);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_aprovadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_aprovadores_updated_at ON aprovadores;
CREATE TRIGGER trigger_aprovadores_updated_at
  BEFORE UPDATE ON aprovadores
  FOR EACH ROW
  EXECUTE FUNCTION update_aprovadores_updated_at();

-- Tabela de histórico de aprovações
CREATE TABLE IF NOT EXISTS aprovacoes_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conteudo_id UUID NOT NULL REFERENCES conteudos(id) ON DELETE CASCADE,
  aprovador_id UUID REFERENCES aprovadores(id) ON DELETE SET NULL,
  
  -- Dados da aprovação
  status VARCHAR(20) NOT NULL CHECK (status IN ('aprovado', 'reprovado', 'pendente')),
  nivel INTEGER NOT NULL,
  comentario TEXT,
  
  -- Dados extras
  whatsapp_usado VARCHAR(20),
  respondido_em TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aprovacoes_conteudo ON aprovacoes_historico(conteudo_id);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_status ON aprovacoes_historico(status);

-- RLS (Row Level Security)
ALTER TABLE aprovadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprovacoes_historico ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessidade)
CREATE POLICY "Aprovadores visíveis para todos autenticados" ON aprovadores
  FOR SELECT USING (true);

CREATE POLICY "Aprovadores editáveis por admins" ON aprovadores
  FOR ALL USING (true);

CREATE POLICY "Histórico visível para todos" ON aprovacoes_historico
  FOR SELECT USING (true);

CREATE POLICY "Histórico inserível" ON aprovacoes_historico
  FOR INSERT WITH CHECK (true);

-- Comentários
COMMENT ON TABLE aprovadores IS 'Aprovadores de conteúdo (internos e clientes)';
COMMENT ON TABLE aprovacoes_historico IS 'Histórico de aprovações por conteúdo';
COMMENT ON COLUMN aprovadores.tipo IS 'interno = equipe interna, cliente = aprovador do cliente, designer = quem cria';
COMMENT ON COLUMN aprovadores.nivel IS 'Ordem de aprovação: 1 = primeiro a aprovar, 2 = segundo, etc';
