-- =====================================================
-- MIGRATION: Módulo de Planejamento Anual (v3 CORRIGIDA)
-- Data: 12/02/2026
-- CORREÇÃO: Usa tabela "members" com campo "org_id"
-- =====================================================

-- =====================================================
-- TASK 1.1: TABELA campanhas
-- =====================================================

CREATE TABLE IF NOT EXISTS campanhas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Identificação
  nome varchar(255) NOT NULL,
  slug varchar(255),
  descricao text,
  objetivo text,
  acoes_planejadas text,
  
  -- Período
  ano int NOT NULL,
  mes_inicio int NOT NULL CHECK (mes_inicio >= 1 AND mes_inicio <= 12),
  mes_fim int NOT NULL CHECK (mes_fim >= 1 AND mes_fim <= 12),
  data_inicio date,
  data_fim date,
  
  -- Categorização
  tipo varchar(50) DEFAULT 'campanha',
  cor varchar(7) DEFAULT '#3B82F6',
  icone varchar(50),
  prioridade int DEFAULT 2 CHECK (prioridade >= 1 AND prioridade <= 3),
  
  -- Metas e Orçamento
  meta_principal text,
  meta_secundaria text,
  kpi_esperado jsonb,
  orcamento decimal(12,2),
  
  -- Status e Progresso
  status varchar(30) DEFAULT 'planejada',
  progresso int DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  
  -- Relacionamentos
  responsavel_id uuid REFERENCES auth.users(id),
  
  -- Metadados
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE campanhas IS 'Campanhas e ações planejadas por cliente/ano';

-- =====================================================
-- TASK 1.2: TABELA campanha_conteudos
-- =====================================================

CREATE TABLE IF NOT EXISTS campanha_conteudos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  conteudo_id uuid NOT NULL REFERENCES conteudos(id) ON DELETE CASCADE,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(campanha_id, conteudo_id)
);

-- =====================================================
-- TASK 1.3: TABELA campanha_historico
-- =====================================================

CREATE TABLE IF NOT EXISTS campanha_historico (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  acao varchar(50) NOT NULL,
  campo_alterado varchar(100),
  valor_anterior text,
  valor_novo text,
  user_id uuid REFERENCES auth.users(id),
  user_email varchar(255),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TASK 1.4: ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_campanhas_org ON campanhas(org_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_cliente ON campanhas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_ano ON campanhas(ano);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_tipo ON campanhas(tipo);
CREATE INDEX IF NOT EXISTS idx_campanhas_periodo ON campanhas(ano, mes_inicio, mes_fim);
CREATE INDEX IF NOT EXISTS idx_campanhas_cliente_ano ON campanhas(cliente_id, ano);
CREATE INDEX IF NOT EXISTS idx_campanhas_created ON campanhas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campanha_conteudos_campanha ON campanha_conteudos(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_conteudos_conteudo ON campanha_conteudos(conteudo_id);
CREATE INDEX IF NOT EXISTS idx_campanha_historico_campanha ON campanha_historico(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_historico_created ON campanha_historico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campanhas_nome_gin ON campanhas USING gin(to_tsvector('portuguese', nome));

-- =====================================================
-- TASK 1.5: RLS (Row Level Security)
-- =====================================================

ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para campanhas (usando tabela "members" com "org_id")
DROP POLICY IF EXISTS "campanhas_select_policy" ON campanhas;
CREATE POLICY "campanhas_select_policy" ON campanhas
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campanhas_insert_policy" ON campanhas;
CREATE POLICY "campanhas_insert_policy" ON campanhas
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campanhas_update_policy" ON campanhas;
CREATE POLICY "campanhas_update_policy" ON campanhas
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campanhas_delete_policy" ON campanhas;
CREATE POLICY "campanhas_delete_policy" ON campanhas
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

-- Políticas para campanha_conteudos
DROP POLICY IF EXISTS "campanha_conteudos_select_policy" ON campanha_conteudos;
CREATE POLICY "campanha_conteudos_select_policy" ON campanha_conteudos
  FOR SELECT USING (
    campanha_id IN (
      SELECT id FROM campanhas WHERE org_id IN (
        SELECT org_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "campanha_conteudos_all_policy" ON campanha_conteudos;
CREATE POLICY "campanha_conteudos_all_policy" ON campanha_conteudos
  FOR ALL USING (
    campanha_id IN (
      SELECT id FROM campanhas WHERE org_id IN (
        SELECT org_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas para campanha_historico
DROP POLICY IF EXISTS "campanha_historico_select_policy" ON campanha_historico;
CREATE POLICY "campanha_historico_select_policy" ON campanha_historico
  FOR SELECT USING (
    campanha_id IN (
      SELECT id FROM campanhas WHERE org_id IN (
        SELECT org_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "campanha_historico_insert_policy" ON campanha_historico;
CREATE POLICY "campanha_historico_insert_policy" ON campanha_historico
  FOR INSERT WITH CHECK (
    campanha_id IN (
      SELECT id FROM campanhas WHERE org_id IN (
        SELECT org_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- TASK 1.6: TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_campanhas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campanhas_updated_at ON campanhas;
CREATE TRIGGER campanhas_updated_at
  BEFORE UPDATE ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION update_campanhas_updated_at();

CREATE OR REPLACE FUNCTION generate_campanha_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(
      regexp_replace(
        translate(NEW.nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
        '[^a-zA-Z0-9]+', '-', 'g'
      )
    );
    NEW.slug = regexp_replace(NEW.slug, '-+', '-', 'g');
    NEW.slug = trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campanhas_generate_slug ON campanhas;
CREATE TRIGGER campanhas_generate_slug
  BEFORE INSERT OR UPDATE OF nome ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION generate_campanha_slug();

CREATE OR REPLACE FUNCTION log_campanha_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email varchar(255);
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO campanha_historico (campanha_id, acao, user_id, user_email)
    VALUES (NEW.id, 'created', auth.uid(), v_user_email);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO campanha_historico (campanha_id, acao, campo_alterado, valor_anterior, valor_novo, user_id, user_email)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, auth.uid(), v_user_email);
    END IF;
    
    IF OLD.nome IS DISTINCT FROM NEW.nome THEN
      INSERT INTO campanha_historico (campanha_id, acao, campo_alterado, valor_anterior, valor_novo, user_id, user_email)
      VALUES (NEW.id, 'updated', 'nome', OLD.nome, NEW.nome, auth.uid(), v_user_email);
    END IF;
    
    IF OLD.mes_inicio IS DISTINCT FROM NEW.mes_inicio OR OLD.mes_fim IS DISTINCT FROM NEW.mes_fim THEN
      INSERT INTO campanha_historico (campanha_id, acao, campo_alterado, valor_anterior, valor_novo, user_id, user_email)
      VALUES (NEW.id, 'updated', 'periodo', OLD.mes_inicio || '-' || OLD.mes_fim, NEW.mes_inicio || '-' || NEW.mes_fim, auth.uid(), v_user_email);
    END IF;
    
    IF OLD.progresso IS DISTINCT FROM NEW.progresso AND 
       (NEW.progresso = 0 OR NEW.progresso = 25 OR NEW.progresso = 50 OR NEW.progresso = 75 OR NEW.progresso = 100) THEN
      INSERT INTO campanha_historico (campanha_id, acao, campo_alterado, valor_anterior, valor_novo, user_id, user_email)
      VALUES (NEW.id, 'updated', 'progresso', OLD.progresso::text, NEW.progresso::text, auth.uid(), v_user_email);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS campanhas_audit_log ON campanhas;
CREATE TRIGGER campanhas_audit_log
  AFTER INSERT OR UPDATE ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION log_campanha_changes();

-- =====================================================
-- TASK 1.7: VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_campanhas_stats AS
SELECT 
  c.*,
  COALESCE(stats.total_conteudos, 0) as total_conteudos,
  COALESCE(stats.conteudos_publicados, 0) as conteudos_publicados,
  CASE 
    WHEN COALESCE(stats.total_conteudos, 0) = 0 THEN 0
    ELSE ROUND(COALESCE(stats.conteudos_publicados, 0)::numeric / stats.total_conteudos * 100, 0)
  END as percentual_publicado,
  cli.nome as cliente_nome,
  cli.slug as cliente_slug
FROM campanhas c
LEFT JOIN clientes cli ON c.cliente_id = cli.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(cc.id) as total_conteudos,
    COUNT(CASE WHEN cont.status = 'publicado' THEN 1 END) as conteudos_publicados
  FROM campanha_conteudos cc
  LEFT JOIN conteudos cont ON cc.conteudo_id = cont.id
  WHERE cc.campanha_id = c.id
) stats ON true;

CREATE OR REPLACE VIEW v_planejamento_anual AS
SELECT 
  cliente_id,
  ano,
  COUNT(*) as total_campanhas,
  COUNT(CASE WHEN status = 'planejada' THEN 1 END) as planejadas,
  COUNT(CASE WHEN status = 'em_andamento' THEN 1 END) as em_andamento,
  COUNT(CASE WHEN status = 'pausada' THEN 1 END) as pausadas,
  COUNT(CASE WHEN status = 'concluida' THEN 1 END) as concluidas,
  COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas,
  COALESCE(SUM(orcamento), 0) as orcamento_total,
  ROUND(AVG(progresso), 0) as progresso_medio
FROM campanhas
GROUP BY cliente_id, ano;

CREATE OR REPLACE VIEW v_campanhas_timeline AS
SELECT 
  c.id,
  c.cliente_id,
  c.nome,
  c.tipo,
  c.cor,
  c.icone,
  c.status,
  c.progresso,
  c.prioridade,
  c.ano,
  c.mes_inicio,
  c.mes_fim,
  (c.mes_fim - c.mes_inicio + 1) as duracao_meses,
  c.meta_principal,
  cli.nome as cliente_nome
FROM campanhas c
JOIN clientes cli ON c.cliente_id = cli.id
ORDER BY c.ano, c.mes_inicio, c.prioridade DESC;

-- =====================================================
-- TASK 1.8: FUNÇÕES
-- =====================================================

CREATE OR REPLACE FUNCTION get_campanhas_do_mes(
  p_cliente_id uuid,
  p_ano int,
  p_mes int
)
RETURNS TABLE (
  id uuid, 
  nome varchar, 
  tipo varchar,
  cor varchar,
  icone varchar,
  status varchar,
  mes_inicio int, 
  mes_fim int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.nome, c.tipo, c.cor, c.icone, c.status, c.mes_inicio, c.mes_fim
  FROM campanhas c
  WHERE c.cliente_id = p_cliente_id
    AND c.ano = p_ano
    AND p_mes BETWEEN c.mes_inicio AND c.mes_fim
  ORDER BY c.prioridade DESC, c.mes_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_campanhas_conflitantes(
  p_cliente_id uuid,
  p_ano int,
  p_mes_inicio int,
  p_mes_fim int,
  p_excluir_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid, 
  nome varchar, 
  mes_inicio int, 
  mes_fim int
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.nome, c.mes_inicio, c.mes_fim
  FROM campanhas c
  WHERE c.cliente_id = p_cliente_id
    AND c.ano = p_ano
    AND c.id IS DISTINCT FROM p_excluir_id
    AND (
      (p_mes_inicio BETWEEN c.mes_inicio AND c.mes_fim)
      OR (p_mes_fim BETWEEN c.mes_inicio AND c.mes_fim)
      OR (c.mes_inicio BETWEEN p_mes_inicio AND p_mes_fim)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON v_campanhas_stats TO authenticated;
GRANT SELECT ON v_planejamento_anual TO authenticated;
GRANT SELECT ON v_campanhas_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION get_campanhas_do_mes TO authenticated;
GRANT EXECUTE ON FUNCTION get_campanhas_conflitantes TO authenticated;

-- =====================================================
-- FIM DA MIGRATION v3
-- =====================================================
