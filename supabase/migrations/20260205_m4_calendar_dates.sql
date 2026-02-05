-- M4: Calendário de Datas Importantes por Cliente
-- Data: 2026-02-05

-- Tabela de datas importantes por cliente
CREATE TABLE IF NOT EXISTS client_calendar_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  priority varchar(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  category varchar(50) DEFAULT 'geral',
  recurring boolean DEFAULT false,
  recurring_type varchar(20), -- 'yearly', 'monthly'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_calendar_dates_cliente ON client_calendar_dates(cliente_id);
CREATE INDEX IF NOT EXISTS idx_calendar_dates_date ON client_calendar_dates(date);
CREATE INDEX IF NOT EXISTS idx_calendar_dates_org ON client_calendar_dates(org_id);

-- RLS
ALTER TABLE client_calendar_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calendar dates of their org"
  ON client_calendar_dates FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can insert calendar dates in their org"
  ON client_calendar_dates FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can update calendar dates in their org"
  ON client_calendar_dates FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can delete calendar dates in their org"
  ON client_calendar_dates FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid() AND status = 'active'
  ));

-- Comentários
COMMENT ON TABLE client_calendar_dates IS 'Datas importantes do calendário por cliente (feriados, datas comerciais, etc)';
COMMENT ON COLUMN client_calendar_dates.priority IS 'Prioridade: critical (vermelho), high (laranja), medium (azul), low (cinza)';
COMMENT ON COLUMN client_calendar_dates.category IS 'Categoria: feriado, comercial, institucional, campanha, etc';
