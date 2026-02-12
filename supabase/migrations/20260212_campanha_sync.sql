-- =====================================================
-- MIGRATION: Sincronização Campanhas <-> Conteúdos
-- Data: 12/02/2026
-- Descrição: Funções para sincronizar progresso
-- =====================================================

-- =====================================================
-- FUNÇÃO: Calcular progresso da campanha
-- Baseado nos conteúdos vinculados
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_progresso_campanha(p_campanha_id uuid)
RETURNS int AS $$
DECLARE
  v_total int;
  v_publicados int;
  v_progresso int;
BEGIN
  -- Contar total de conteúdos vinculados
  SELECT COUNT(*) INTO v_total
  FROM campanha_conteudos
  WHERE campanha_id = p_campanha_id;
  
  -- Se não há conteúdos, retorna 0
  IF v_total = 0 THEN
    RETURN 0;
  END IF;
  
  -- Contar conteúdos publicados
  SELECT COUNT(*) INTO v_publicados
  FROM campanha_conteudos cc
  JOIN conteudos c ON cc.conteudo_id = c.id
  WHERE cc.campanha_id = p_campanha_id
    AND c.status = 'publicado';
  
  -- Calcular percentual
  v_progresso := ROUND((v_publicados::numeric / v_total) * 100);
  
  RETURN v_progresso;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Atualizar progresso da campanha
-- Chamada manualmente ou por trigger
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_progresso_campanha(p_campanha_id uuid)
RETURNS void AS $$
DECLARE
  v_progresso int;
  v_status varchar(30);
BEGIN
  -- Calcular novo progresso
  v_progresso := calcular_progresso_campanha(p_campanha_id);
  
  -- Determinar status baseado no progresso
  SELECT status INTO v_status
  FROM campanhas
  WHERE id = p_campanha_id;
  
  -- Se progresso é 100% e status é em_andamento, marcar como concluída
  IF v_progresso = 100 AND v_status = 'em_andamento' THEN
    UPDATE campanhas
    SET progresso = v_progresso, 
        status = 'concluida',
        updated_at = now()
    WHERE id = p_campanha_id;
  ELSE
    UPDATE campanhas
    SET progresso = v_progresso,
        updated_at = now()
    WHERE id = p_campanha_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Atualizar progresso quando conteúdo muda
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_sync_campanha_progresso()
RETURNS TRIGGER AS $$
DECLARE
  v_campanha_id uuid;
BEGIN
  -- Encontrar campanhas vinculadas ao conteúdo
  FOR v_campanha_id IN 
    SELECT DISTINCT campanha_id 
    FROM campanha_conteudos 
    WHERE conteudo_id = COALESCE(NEW.id, OLD.id)
  LOOP
    PERFORM atualizar_progresso_campanha(v_campanha_id);
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger na tabela conteudos (se status mudar)
DROP TRIGGER IF EXISTS sync_campanha_on_conteudo_change ON conteudos;
CREATE TRIGGER sync_campanha_on_conteudo_change
  AFTER UPDATE OF status ON conteudos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_sync_campanha_progresso();

-- =====================================================
-- TRIGGER: Atualizar progresso quando vínculo muda
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_sync_campanha_on_vinculo()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM atualizar_progresso_campanha(NEW.campanha_id);
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.campanha_id IS DISTINCT FROM NEW.campanha_id THEN
      PERFORM atualizar_progresso_campanha(OLD.campanha_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_campanha_on_vinculo_change ON campanha_conteudos;
CREATE TRIGGER sync_campanha_on_vinculo_change
  AFTER INSERT OR UPDATE OR DELETE ON campanha_conteudos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_campanha_on_vinculo();

-- =====================================================
-- VIEW: Campanhas ativas do mês atual
-- Para uso no dashboard
-- =====================================================

CREATE OR REPLACE VIEW v_campanhas_ativas AS
SELECT 
  c.*,
  cli.nome as cliente_nome,
  cli.slug as cliente_slug,
  cli.logo_url as cliente_logo,
  COALESCE(stats.total_conteudos, 0) as total_conteudos,
  COALESCE(stats.conteudos_publicados, 0) as conteudos_publicados
FROM campanhas c
JOIN clientes cli ON c.cliente_id = cli.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(cc.id) as total_conteudos,
    COUNT(CASE WHEN cont.status = 'publicado' THEN 1 END) as conteudos_publicados
  FROM campanha_conteudos cc
  LEFT JOIN conteudos cont ON cc.conteudo_id = cont.id
  WHERE cc.campanha_id = c.id
) stats ON true
WHERE c.status IN ('planejada', 'em_andamento')
  AND c.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM CURRENT_DATE) BETWEEN c.mes_inicio AND c.mes_fim;

-- =====================================================
-- VIEW: Próximas campanhas (próximo mês)
-- =====================================================

CREATE OR REPLACE VIEW v_campanhas_proximas AS
SELECT 
  c.*,
  cli.nome as cliente_nome,
  cli.slug as cliente_slug,
  cli.logo_url as cliente_logo
FROM campanhas c
JOIN clientes cli ON c.cliente_id = cli.id
WHERE c.status = 'planejada'
  AND c.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND c.mes_inicio = EXTRACT(MONTH FROM CURRENT_DATE) + 1;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION calcular_progresso_campanha TO authenticated;
GRANT EXECUTE ON FUNCTION atualizar_progresso_campanha TO authenticated;
GRANT SELECT ON v_campanhas_ativas TO authenticated;
GRANT SELECT ON v_campanhas_proximas TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
