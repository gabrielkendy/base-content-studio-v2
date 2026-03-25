-- ============================================
-- FIX: Adiciona is_personal nos members
-- Permite priorizar orgs compartilhadas sobre orgs pessoais
-- Roda no Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Adiciona coluna
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false;

-- 2. Marca orgs com apenas 1 membro ativo como pessoais (auto-criadas pelo trigger)
UPDATE members SET is_personal = true
WHERE org_id IN (
  SELECT org_id FROM members
  WHERE status = 'active'
  GROUP BY org_id
  HAVING COUNT(*) = 1
);

-- 3. Atualiza o trigger para marcar corretamente
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
    -- User was invited: add to EXISTING org (not personal)
    INSERT INTO members (user_id, org_id, role, display_name, status, is_personal)
    VALUES (NEW.id, existing_invite.org_id, existing_invite.role, user_name, 'active', false);

    UPDATE invites SET accepted_at = NOW() WHERE id = existing_invite.id;
  ELSE
    -- New standalone user: create personal org
    INSERT INTO organizations (name, slug)
    VALUES (
      user_name || '''s Workspace',
      lower(replace(user_name, ' ', '-')) || '-' || substr(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;

    INSERT INTO members (user_id, org_id, role, display_name, status, is_personal)
    VALUES (NEW.id, new_org_id, 'admin', user_name, 'active', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
