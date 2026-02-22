-- 015_campaigns_integration.sql
-- Dashboard de Campanhas Facebook Ads

-- 1. Campo ad_account_id no cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ad_account_id TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ad_account_name TEXT;

-- 2. Cache de campanhas (atualiza a cada request)
CREATE TABLE IF NOT EXISTS campaigns_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT, -- ACTIVE, PAUSED, DELETED
  objective TEXT,
  daily_budget DECIMAL,
  lifetime_budget DECIMAL,
  spend DECIMAL DEFAULT 0,
  results INTEGER DEFAULT 0,
  cost_per_result DECIMAL,
  roas DECIMAL,
  raw_data JSONB,
  date_start DATE,
  date_stop DATE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, campaign_id, date_start, date_stop)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaigns_cache_cliente ON campaigns_cache(cliente_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_cache_fetched ON campaigns_cache(fetched_at);

-- 4. RLS Policies
ALTER TABLE campaigns_cache ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê campanhas da sua org
DROP POLICY IF EXISTS "Users can view own org campaigns" ON campaigns_cache;
CREATE POLICY "Users can view own org campaigns" ON campaigns_cache
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active')
  );

-- Política: service role pode tudo
DROP POLICY IF EXISTS "Service role full access campaigns" ON campaigns_cache;
CREATE POLICY "Service role full access campaigns" ON campaigns_cache
  FOR ALL USING (true);
