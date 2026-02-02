-- ============================================
-- FIX RLS: Resolve infinite recursion on members table
-- Execute this in the Supabase SQL Editor
-- ============================================

-- 1. SECURITY DEFINER functions (break the recursion cycle)
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION is_org_admin(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM members 
    WHERE user_id = auth.uid() 
    AND org_id = check_org_id 
    AND role = 'admin' 
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_org_manager(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM members 
    WHERE user_id = auth.uid() 
    AND org_id = check_org_id 
    AND role IN ('admin', 'gestor') 
    AND status = 'active'
  );
$$;

-- 2. Drop ALL old policies
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "members_select" ON members;
DROP POLICY IF EXISTS "members_insert" ON members;
DROP POLICY IF EXISTS "members_update" ON members;
DROP POLICY IF EXISTS "clientes_all" ON clientes;
DROP POLICY IF EXISTS "clientes_select" ON clientes;
DROP POLICY IF EXISTS "clientes_insert" ON clientes;
DROP POLICY IF EXISTS "clientes_update" ON clientes;
DROP POLICY IF EXISTS "clientes_delete" ON clientes;
DROP POLICY IF EXISTS "conteudos_all" ON conteudos;
DROP POLICY IF EXISTS "conteudos_select" ON conteudos;
DROP POLICY IF EXISTS "conteudos_insert" ON conteudos;
DROP POLICY IF EXISTS "conteudos_update" ON conteudos;
DROP POLICY IF EXISTS "conteudos_delete" ON conteudos;
DROP POLICY IF EXISTS "messages_all" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "webhooks_admin" ON webhook_configs;
DROP POLICY IF EXISTS "webhook_events_read" ON webhook_events;
DROP POLICY IF EXISTS "activity_read" ON activity_log;
DROP POLICY IF EXISTS "activity_insert" ON activity_log;
DROP POLICY IF EXISTS "invites_select" ON invites;
DROP POLICY IF EXISTS "invites_insert" ON invites;
DROP POLICY IF EXISTS "invites_public_token" ON invites;
DROP POLICY IF EXISTS "aprovacoes_public_read" ON aprovacoes_links;
DROP POLICY IF EXISTS "aprovacoes_org_write" ON aprovacoes_links;
DROP POLICY IF EXISTS "aprovacoes_update" ON aprovacoes_links;
DROP POLICY IF EXISTS "solicitacoes_org_select" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_org_insert" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_org_update" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_org_delete" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_select" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_insert" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_update" ON solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_delete" ON solicitacoes;

-- 3. New policies using SECURITY DEFINER functions

-- MEMBERS
CREATE POLICY "members_select" ON members FOR SELECT USING (
  org_id IN (SELECT get_user_org_ids())
);
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (
  is_org_manager(org_id) OR NOT EXISTS (SELECT 1 FROM members m2 WHERE m2.org_id = org_id)
);
CREATE POLICY "members_update" ON members FOR UPDATE USING (
  is_org_admin(org_id) OR user_id = auth.uid()
);

-- ORGANIZATIONS
CREATE POLICY "org_select" ON organizations FOR SELECT USING (
  id IN (SELECT get_user_org_ids())
);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (
  is_org_admin(id)
);
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);

-- CLIENTES
CREATE POLICY "clientes_select" ON clientes FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "clientes_insert" ON clientes FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "clientes_update" ON clientes FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "clientes_delete" ON clientes FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));

-- CONTEUDOS
CREATE POLICY "conteudos_select" ON conteudos FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "conteudos_insert" ON conteudos FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "conteudos_update" ON conteudos FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "conteudos_delete" ON conteudos FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));

-- MESSAGES
CREATE POLICY "messages_select" ON messages FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (org_id IN (SELECT get_user_org_ids()));

-- NOTIFICATIONS
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- WEBHOOK CONFIGS
CREATE POLICY "webhooks_admin" ON webhook_configs FOR ALL USING (is_org_admin(org_id));

-- WEBHOOK EVENTS
CREATE POLICY "webhook_events_read" ON webhook_events FOR SELECT USING (is_org_admin(org_id));

-- ACTIVITY LOG
CREATE POLICY "activity_read" ON activity_log FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- INVITES
CREATE POLICY "invites_public_token" ON invites FOR SELECT USING (true);
CREATE POLICY "invites_insert" ON invites FOR INSERT WITH CHECK (is_org_manager(org_id));

-- APROVACOES
CREATE POLICY "aprovacoes_public_read" ON aprovacoes_links FOR SELECT USING (true);
CREATE POLICY "aprovacoes_org_write" ON aprovacoes_links FOR INSERT WITH CHECK (true);
CREATE POLICY "aprovacoes_update" ON aprovacoes_links FOR UPDATE USING (true);

-- SOLICITACOES
CREATE POLICY "solicitacoes_select" ON solicitacoes FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "solicitacoes_insert" ON solicitacoes FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "solicitacoes_update" ON solicitacoes FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));
CREATE POLICY "solicitacoes_delete" ON solicitacoes FOR DELETE USING (is_org_manager(org_id));
