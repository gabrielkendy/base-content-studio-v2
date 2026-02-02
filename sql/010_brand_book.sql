-- Sprint 12: Brand Book por Cliente
-- Adiciona campos de brand book na tabela clientes

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS brand_guidelines jsonb DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS color_palette jsonb DEFAULT '[]';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fonts jsonb DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS personas jsonb DEFAULT '[]';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
