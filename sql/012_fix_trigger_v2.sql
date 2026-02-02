-- ============================================
-- FIX: handle_new_user trigger - robust version
-- Fixes:
-- 1. Apostrophe in org name causing SQL error
-- 2. Slug with special characters
-- 3. ON CONFLICT for duplicate member
-- 4. EXCEPTION handler to not block user creation
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  existing_invite record;
  safe_slug text;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Check if there is a pending invite for this email
  SELECT * INTO existing_invite FROM invites 
  WHERE email = NEW.email 
    AND accepted_at IS NULL 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF existing_invite IS NOT NULL THEN
    -- User was invited: add to EXISTING org
    INSERT INTO members (user_id, org_id, role, display_name, status)
    VALUES (NEW.id, existing_invite.org_id, existing_invite.role, user_name, 'active')
    ON CONFLICT (user_id, org_id) DO NOTHING;
    
    -- Mark invite as accepted
    UPDATE invites SET accepted_at = NOW() WHERE id = existing_invite.id;
  ELSE
    -- New standalone user: create default org
    -- Safe slug: only lowercase alphanumeric and hyphens
    safe_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    
    INSERT INTO organizations (name, slug)
    VALUES (
      user_name || ' Workspace', 
      safe_slug
    )
    RETURNING id INTO new_org_id;
    
    INSERT INTO members (user_id, org_id, role, display_name, status)
    VALUES (NEW.id, new_org_id, 'admin', user_name, 'active');
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RAISE WARNING 'handle_new_user error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
