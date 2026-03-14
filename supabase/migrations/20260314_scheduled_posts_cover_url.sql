-- Migration: add cover_url to scheduled_posts table
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;
COMMENT ON COLUMN scheduled_posts.cover_url IS 'URL da imagem de capa/thumbnail do vídeo selecionada pelo usuário';
