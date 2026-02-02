-- ============================================
-- BASE Content Studio v2 - Post Media Bucket
-- Fix: bucket 'post-media' was missing (code referenced it but only 'media' existed)
-- Applied manually via API on 2026-02-02
-- ============================================

-- Create post-media bucket (for scheduled posts uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-media
CREATE POLICY "post-media public read" ON storage.objects 
FOR SELECT USING (bucket_id = 'post-media');

CREATE POLICY "post-media authenticated upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');

CREATE POLICY "post-media authenticated update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'post-media' AND auth.role() = 'authenticated');

CREATE POLICY "post-media authenticated delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'post-media' AND auth.role() = 'authenticated');
