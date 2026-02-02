CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  platform varchar(50) NOT NULL,
  profile_id varchar(255),
  profile_name varchar(255),
  profile_avatar varchar(500),
  upload_post_user_id varchar(255),
  status varchar(20) DEFAULT 'active',
  connected_at timestamptz DEFAULT now(),
  UNIQUE(cliente_id, platform, profile_id)
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all" ON social_accounts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;