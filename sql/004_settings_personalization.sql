-- ============================================
-- BASE Content Studio v2 - Sprint 3
-- Settings & Personalization
-- ============================================

-- 1. Add brand/accent colors to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#6366F1';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#3B82F6';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url text;

-- 2. Add notification preferences to members (JSON field)
ALTER TABLE members ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{"new_requests":true,"pending_approvals":true,"chat_messages":true,"upcoming_deadlines":true}'::jsonb;

-- 3. Ensure media bucket exists with proper policies for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 5242880, '{image/png,image/jpeg,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- Storage policy: service role can do everything (already handled by default)
-- Public read access
DO $$ BEGIN
  CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role upload (handled by default service_role bypass)
