-- Sprint 10: Analytics snapshots table
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  platform varchar(50) NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  followers integer DEFAULT 0,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  profile_views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  engagement_rate decimal(5,2) DEFAULT 0,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cliente_id, platform, snapshot_date)
);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
  CREATE POLICY "service_role_all" ON analytics_snapshots FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $policy$;
