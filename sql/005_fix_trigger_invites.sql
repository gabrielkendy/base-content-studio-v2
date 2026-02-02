-- ============================================
-- FIX: handle_new_user trigger com suporte a convites
-- Roda no Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Criar tabela member_clients (se não existe)
CREATE TABLE IF NOT EXISTS member_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, cliente_id)
);
ALTER TABLE member_clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON member_clients FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Adicionar coluna solicitacao_id em conteudos (link solicitação → conteúdo)
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS solicitacao_id uuid REFERENCES solicitacoes(id) ON DELETE SET NULL;

-- 3. Atualizar trigger para suportar convites
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  existing_invite record;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Check if there's a pending invite for this email
  SELECT * INTO existing_invite FROM invites 
  WHERE email = NEW.email 
    AND accepted_at IS NULL 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF existing_invite IS NOT NULL THEN
    -- User was invited: add to EXISTING org (don't create new one)
    INSERT INTO members (user_id, org_id, role, display_name, status)
    VALUES (NEW.id, existing_invite.org_id, existing_invite.role, user_name, 'active');
    
    -- Mark invite as accepted
    UPDATE invites SET accepted_at = NOW() WHERE id = existing_invite.id;
  ELSE
    -- New standalone user: create default org
    INSERT INTO organizations (name, slug)
    VALUES (
      user_name || '''s Workspace', 
      lower(replace(user_name, ' ', '-')) || '-' || substr(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;
    
    INSERT INTO members (user_id, org_id, role, display_name, status)
    VALUES (NEW.id, new_org_id, 'admin', user_name, 'active');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
