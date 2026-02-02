import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const TIPOS_CONTEUDO = ['carrossel', 'post', 'stories', 'reels', 'feed', 'vídeo'] as const
export type TipoConteudo = typeof TIPOS_CONTEUDO[number]

export const TIPO_EMOJI: Record<string, string> = {
  'carrossel': '📑',
  'post': '📝',
  'stories': '📱',
  'reels': '🎬',
  'feed': '🏠',
  'vídeo': '🎥',
}

export const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string; description: string }> = {
  nova_solicitacao: { emoji: '📩', label: 'Solicitação', color: '#8B5CF6', description: 'Demanda recebida do cliente ou equipe' },
  rascunho:         { emoji: '📝', label: 'Rascunho', color: '#6B7280', description: 'Briefing e ideia registrada' },
  producao:         { emoji: '⚙️', label: 'Produção', color: '#3B82F6', description: 'Copy + Design em andamento' },
  aprovacao:        { emoji: '👁️', label: 'Aprovação', color: '#F59E0B', description: 'Aguardando aprovação do cliente' },
  ajuste:           { emoji: '🔄', label: 'Ajuste', color: '#F97316', description: 'Cliente pediu alterações' },
  aprovado:         { emoji: '✅', label: 'Aprovado', color: '#22C55E', description: 'Material aprovado pelo cliente' },
  agendado:         { emoji: '📅', label: 'Agendado', color: '#6366F1', description: 'Data e hora de publicação definidos' },
  publicado:        { emoji: '🚀', label: 'Publicado', color: '#059669', description: 'Conteúdo publicado nas redes' },
}

export type StatusConteudo = 'nova_solicitacao' | 'rascunho' | 'producao' | 'aprovacao' | 'ajuste' | 'aprovado' | 'agendado' | 'publicado'

// Map ALL legacy/old status values to the new pipeline
export const LEGACY_STATUS_MAP: Record<string, string> = {
  conteudo: 'producao',
  revisao: 'producao',
  design: 'producao',
  aprovacao_cliente: 'aprovacao',
  ajustes: 'ajuste',
  aprovado_agendado: 'aprovado',
  concluido: 'publicado',
}

export function normalizeStatus(status: string): string {
  return LEGACY_STATUS_MAP[status] || status
}

export const KANBAN_COLUMNS = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
  key: key as StatusConteudo,
  ...cfg
}))

export const CANAIS = [
  { id: 'instagram', icon: '📷', label: 'Instagram', color: '#E4405F' },
  { id: 'tiktok', icon: '🎵', label: 'TikTok', color: '#000000' },
  { id: 'facebook', icon: '👤', label: 'Facebook', color: '#1877F2' },
  { id: 'youtube', icon: '▶️', label: 'YouTube', color: '#FF0000' },
  { id: 'twitter', icon: '𝕏', label: 'X / Twitter', color: '#1DA1F2' },
  { id: 'linkedin', icon: '💼', label: 'LinkedIn', color: '#0A66C2' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp', color: '#25D366' },
  { id: 'telegram', icon: '✈️', label: 'Telegram', color: '#0088CC' },
] as const

export function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatDateFull(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
