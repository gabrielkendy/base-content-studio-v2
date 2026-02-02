CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  conteudo_id uuid REFERENCES conteudos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  platforms jsonb NOT NULL DEFAULT '[]',
  caption text,
  media_urls text[] DEFAULT '{}',
  hashtags text[] DEFAULT '{}',
  scheduled_at timestamptz NOT NULL,
  published_at timestamptz,
  status varchar(30) DEFAULT 'scheduled',
  upload_post_id varchar(255),
  upload_post_response jsonb,
  published_urls jsonb DEFAULT '[]',
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all" ON scheduled_posts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;