-- =====================================================
-- MIGRATION: Sistema de Notificações de Campanhas
-- Data: 12/02/2026
-- Descrição: Notificações automáticas para campanhas
-- =====================================================

-- =====================================================
-- TABELA: campanha_notificacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS campanha_notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tipo de notificação
  tipo varchar(50) NOT NULL,  -- inicio_proximo, prazo_vencendo, status_alterado, progresso_baixo
  
  -- Conteúdo
  titulo varchar(255) NOT NULL,
  mensagem text NOT NULL,
  
  -- Agendamento
  enviar_em timestamptz NOT NULL,
  enviada boolean DEFAULT false,
  enviada_em timestamptz,
  
  -- Configuração
  canal varchar(50) DEFAULT 'app',  -- app, email, push
  prioridade int DEFAULT 2,  -- 1=baixa, 2=média, 3=alta
  
  -- Metadados
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_campanha_notif_campanha ON campanha_notificacoes(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_notif_enviar ON campanha_notificacoes(enviar_em) WHERE enviada = false;
CREATE INDEX IF NOT EXISTS idx_campanha_notif_org ON campanha_notificacoes(org_id);

-- RLS
ALTER TABLE campanha_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campanha_notif_select" ON campanha_notificacoes;
CREATE POLICY "campanha_notif_select" ON campanha_notificacoes
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "campanha_notif_insert" ON campanha_notificacoes;
CREATE POLICY "campanha_notif_insert" ON campanha_notificacoes
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
  );

-- =====================================================
-- FUNÇÃO: Criar notificações para uma campanha
-- =====================================================

CREATE OR REPLACE FUNCTION criar_notificacoes_campanha(p_campanha_id uuid)
RETURNS void AS $$
DECLARE
  v_campanha RECORD;
  v_data_inicio date;
  v_data_fim date;
BEGIN
  -- Buscar dados da campanha
  SELECT * INTO v_campanha
  FROM campanhas
  WHERE id = p_campanha_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular datas aproximadas
  v_data_inicio := make_date(v_campanha.ano, v_campanha.mes_inicio, 1);
  v_data_fim := (make_date(v_campanha.ano, v_campanha.mes_fim, 1) + interval '1 month - 1 day')::date;
  
  -- Limpar notificações antigas não enviadas
  DELETE FROM campanha_notificacoes
  WHERE campanha_id = p_campanha_id
    AND enviada = false;
  
  -- 1. Notificação 7 dias antes do início
  IF v_data_inicio - interval '7 days' > CURRENT_DATE THEN
    INSERT INTO campanha_notificacoes (
      campanha_id, org_id, tipo, titulo, mensagem, enviar_em, prioridade
    ) VALUES (
      p_campanha_id,
      v_campanha.org_id,
      'inicio_proximo',
      'Campanha começa em 7 dias',
      format('A campanha "%s" começa em 7 dias. Verifique se tudo está preparado!', v_campanha.nome),
      v_data_inicio - interval '7 days',
      2
    );
  END IF;
  
  -- 2. Notificação no dia do início
  IF v_data_inicio >= CURRENT_DATE THEN
    INSERT INTO campanha_notificacoes (
      campanha_id, org_id, tipo, titulo, mensagem, enviar_em, prioridade
    ) VALUES (
      p_campanha_id,
      v_campanha.org_id,
      'inicio_proximo',
      'Campanha iniciou hoje!',
      format('A campanha "%s" começou hoje. Bora executar! 🚀', v_campanha.nome),
      v_data_inicio,
      3
    );
  END IF;
  
  -- 3. Notificação 7 dias antes do fim
  IF v_data_fim - interval '7 days' > CURRENT_DATE THEN
    INSERT INTO campanha_notificacoes (
      campanha_id, org_id, tipo, titulo, mensagem, enviar_em, prioridade
    ) VALUES (
      p_campanha_id,
      v_campanha.org_id,
      'prazo_vencendo',
      'Campanha termina em 7 dias',
      format('A campanha "%s" termina em 7 dias. Verifique o progresso!', v_campanha.nome),
      v_data_fim - interval '7 days',
      2
    );
  END IF;
  
  -- 4. Notificação no último dia
  IF v_data_fim >= CURRENT_DATE THEN
    INSERT INTO campanha_notificacoes (
      campanha_id, org_id, tipo, titulo, mensagem, enviar_em, prioridade
    ) VALUES (
      p_campanha_id,
      v_campanha.org_id,
      'prazo_vencendo',
      'Último dia da campanha!',
      format('Hoje é o último dia da campanha "%s". Finalize tudo!', v_campanha.nome),
      v_data_fim,
      3
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Criar notificações ao criar/atualizar campanha
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_criar_notificacoes_campanha()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar notificações se a campanha não estiver cancelada ou concluída
  IF NEW.status NOT IN ('cancelada', 'concluida') THEN
    PERFORM criar_notificacoes_campanha(NEW.id);
  ELSE
    -- Se cancelada/concluída, remover notificações pendentes
    DELETE FROM campanha_notificacoes
    WHERE campanha_id = NEW.id
      AND enviada = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS criar_notificacoes_on_campanha ON campanhas;
CREATE TRIGGER criar_notificacoes_on_campanha
  AFTER INSERT OR UPDATE OF mes_inicio, mes_fim, ano, status ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_criar_notificacoes_campanha();

-- =====================================================
-- VIEW: Notificações pendentes para envio
-- =====================================================

CREATE OR REPLACE VIEW v_notificacoes_pendentes AS
SELECT 
  n.*,
  c.nome as campanha_nome,
  c.tipo as campanha_tipo,
  c.cor as campanha_cor,
  cli.nome as cliente_nome,
  cli.slug as cliente_slug
FROM campanha_notificacoes n
JOIN campanhas c ON n.campanha_id = c.id
JOIN clientes cli ON c.cliente_id = cli.id
WHERE n.enviada = false
  AND n.enviar_em <= CURRENT_TIMESTAMP
ORDER BY n.prioridade DESC, n.enviar_em ASC;

-- =====================================================
-- FUNÇÃO: Marcar notificação como enviada
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_notificacao_enviada(p_notificacao_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE campanha_notificacoes
  SET enviada = true,
      enviada_em = now()
  WHERE id = p_notificacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON v_notificacoes_pendentes TO authenticated;
GRANT EXECUTE ON FUNCTION criar_notificacoes_campanha TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_notificacao_enviada TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
