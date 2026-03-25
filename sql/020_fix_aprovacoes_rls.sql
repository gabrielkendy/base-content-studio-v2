-- ============================================================
-- FIX: RLS para aprovacoes_links
-- Problema: políticas USING(true) permitiam qualquer usuário
-- autenticado ler/escrever aprovações de qualquer organização.
-- ============================================================

-- Remove políticas inseguras
DROP POLICY IF EXISTS "aprovacoes_public_read"  ON aprovacoes_links;
DROP POLICY IF EXISTS "aprovacoes_org_write"    ON aprovacoes_links;
DROP POLICY IF EXISTS "aprovacoes_update"       ON aprovacoes_links;

-- SELECT:
--   • Usuário anônimo pode ler (página de aprovação pública usa token único)
--   • Usuário autenticado só vê aprovações da própria org
CREATE POLICY "aprovacoes_select" ON aprovacoes_links
  FOR SELECT USING (
    auth.uid() IS NULL                          -- acesso público (link de aprovação)
    OR org_id IN (SELECT get_user_org_ids())    -- membro da org
  );

-- INSERT: apenas membros autenticados da org
CREATE POLICY "aprovacoes_insert" ON aprovacoes_links
  FOR INSERT WITH CHECK (
    org_id IN (SELECT get_user_org_ids())
  );

-- UPDATE:
--   • Anônimo pode atualizar (cliente aprova/rejeita via link público)
--   • Membro autenticado da org também pode atualizar
CREATE POLICY "aprovacoes_update" ON aprovacoes_links
  FOR UPDATE USING (
    auth.uid() IS NULL
    OR org_id IN (SELECT get_user_org_ids())
  );

-- DELETE: apenas admins/gestores da org
CREATE POLICY "aprovacoes_delete" ON aprovacoes_links
  FOR DELETE USING (
    is_org_manager(org_id)
  );
