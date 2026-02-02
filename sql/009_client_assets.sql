-- Sprint 11: Repositório de Arquivos por Cliente
-- Table for client file assets with folder organization

CREATE TABLE IF NOT EXISTS client_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  folder varchar(255) DEFAULT '/',
  filename varchar(500) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(100),
  file_size bigint,
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  description text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
  CREATE POLICY "service_role_all" ON client_assets FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $policy$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_assets_cliente ON client_assets(cliente_id, folder);
CREATE INDEX IF NOT EXISTS idx_client_assets_org ON client_assets(org_id);
