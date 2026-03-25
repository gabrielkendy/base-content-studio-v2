-- ============================================
-- FIX: Adiciona client_ids na tabela invites
-- Substitui o uso incorreto de member_clients com invite.id como FK placeholder
-- Roda no Supabase Dashboard > SQL Editor
-- ============================================

ALTER TABLE invites ADD COLUMN IF NOT EXISTS client_ids uuid[] DEFAULT '{}';
