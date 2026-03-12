-- Migration: add capa_url to conteudos table
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS capa_url TEXT DEFAULT NULL;
COMMENT ON COLUMN conteudos.capa_url IS 'URL da imagem de capa/thumbnail selecionada (upload ou frame extraído do vídeo)';
