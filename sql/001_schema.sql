-- ============================================
-- BASE Content Studio 2.0 - Schema Completo
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. ORGANIZATIONS (multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(255) NOT NULL,
  slug varchar(100) UNIQUE NOT NULL,
  logo_url text,
  plan varchar(50) DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. MEMBERS (equipe)
CREATE TABLE IF NOT EXISTS members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role varchar(20) DEFAULT 'designer' CHECK (role IN ('admin', 'gestor', 'designer', 'cliente')),
  display_name varchar(255),
  avatar_url text,
  invited_by uuid,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- 3. INVITES
CREATE TABLE IF NOT EXISTS invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email varchar(255) NOT NULL,
  role varchar(20) DEFAULT 'designer',
  token varchar(64) UNIQUE NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. CLIENTES (empresas com org_id)
CREATE TABLE IF NOT EXISTS clientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  nome varchar(255) NOT NULL,
  slug varchar(100) NOT NULL,
  cores jsonb DEFAULT '{"primaria": "#6366F1", "secundaria": "#818CF8"}'::jsonb,
  logo_url text,
  contato text,
  notas text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- 5. CONTEUDOS (planejamento)
CREATE TABLE IF NOT EXISTS conteudos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  mes int NOT NULL,
  ano int NOT NULL,
  data_publicacao date,
  titulo varchar(500),
  tipo varchar(50) DEFAULT 'carrossel',
  badge varchar(255),
  descricao text,
  slides jsonb DEFAULT '[]'::jsonb,
  prompts_imagem jsonb DEFAULT '[]'::jsonb,
  prompts_video jsonb DEFAULT '[]'::jsonb,
  legenda text,
  status varchar(50) DEFAULT 'rascunho',
  ordem int DEFAULT 1,
  midia_urls jsonb DEFAULT '[]'::jsonb,
  canais jsonb DEFAULT '[]'::jsonb,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. APROVAÇÕES
CREATE TABLE IF NOT EXISTS aprovacoes_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conteudo_id uuid REFERENCES conteudos(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  token varchar(64) UNIQUE NOT NULL,
  status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'ajuste')),
  comentario_cliente text,
  cliente_nome varchar(255),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  aprovado_em timestamptz
);

-- 7. MESSAGES (chat)
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  conteudo_id uuid REFERENCES conteudos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  channel_type varchar(20) DEFAULT 'geral' CHECK (channel_type IN ('conteudo', 'cliente', 'geral')),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  text text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  body text,
  read boolean DEFAULT false,
  reference_id uuid,
  reference_type varchar(50),
  created_at timestamptz DEFAULT now()
);

-- 9. WEBHOOK CONFIGS
CREATE TABLE IF NOT EXISTS webhook_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  secret varchar(255),
  created_at timestamptz DEFAULT now()
);

-- 10. WEBHOOK EVENTS LOG
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  webhook_id uuid REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event_type varchar(100) NOT NULL,
  payload jsonb,
  status varchar(20) DEFAULT 'pending',
  response_code int,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 11. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(50),
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_members_org ON members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_org ON clientes(org_id);
CREATE INDEX IF NOT EXISTS idx_conteudos_org ON conteudos(org_id);
CREATE INDEX IF NOT EXISTS idx_conteudos_empresa ON conteudos(empresa_id, mes, ano);
CREATE INDEX IF NOT EXISTS idx_conteudos_status ON conteudos(org_id, status);
CREATE INDEX IF NOT EXISTS idx_conteudos_assigned ON conteudos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_token ON aprovacoes_links(token);
CREATE INDEX IF NOT EXISTS idx_messages_conteudo ON messages(conteudo_id);
CREATE INDEX IF NOT EXISTS idx_messages_cliente ON messages(cliente_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_log(org_id, created_at DESC);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Organizations: members can see their org
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON organizations FOR SELECT USING (
  id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (
  id IN (SELECT org_id FROM members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Members: see members of your org
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON members FOR SELECT USING (
  org_id IN (SELECT org_id FROM members m WHERE m.user_id = auth.uid())
);
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM members m WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'gestor'))
  OR NOT EXISTS (SELECT 1 FROM members m WHERE m.org_id = org_id)
);
CREATE POLICY "members_update" ON members FOR UPDATE USING (
  org_id IN (SELECT org_id FROM members m WHERE m.user_id = auth.uid() AND m.role = 'admin')
  OR user_id = auth.uid()
);

-- Invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites_select" ON invites FOR SELECT USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "invites_insert" ON invites FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid() AND role IN ('admin', 'gestor'))
);
CREATE POLICY "invites_public_token" ON invites FOR SELECT USING (true);

-- Clientes: org members
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_all" ON clientes FOR ALL USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- Conteudos: org members
ALTER TABLE conteudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conteudos_all" ON conteudos FOR ALL USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- Aprovações: public read by token, org members full
ALTER TABLE aprovacoes_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aprovacoes_public_read" ON aprovacoes_links FOR SELECT USING (true);
CREATE POLICY "aprovacoes_org_write" ON aprovacoes_links FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM clientes WHERE org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid()))
);
CREATE POLICY "aprovacoes_update" ON aprovacoes_links FOR UPDATE USING (true);

-- Messages: org members
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all" ON messages FOR ALL USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- Notifications: own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Webhook configs: admin only
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_admin" ON webhook_configs FOR ALL USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Webhook events: admin read
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_events_read" ON webhook_events FOR SELECT USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Activity log: org members read
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_read" ON activity_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
);

-- ============================================
-- REALTIME (para chat e notificações)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE conteudos;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create org + member on first signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  user_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Create default organization
  INSERT INTO organizations (name, slug)
  VALUES (user_name || '''s Workspace', lower(replace(user_name, ' ', '-')) || '-' || substr(NEW.id::text, 1, 8))
  RETURNING id INTO new_org_id;
  
  -- Add as admin member
  INSERT INTO members (user_id, org_id, role, display_name, status)
  VALUES (NEW.id, new_org_id, 'admin', user_name, 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Log activity function
CREATE OR REPLACE FUNCTION log_activity(
  p_org_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_log (org_id, user_id, action, entity_type, entity_id, details)
  VALUES (p_org_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_org_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, org_id, type, title, body, reference_id, reference_type)
  VALUES (p_user_id, p_org_id, p_type, p_title, p_body, p_reference_id, p_reference_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
