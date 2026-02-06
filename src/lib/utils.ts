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

// Status principal do workflow (10 status - estilo mLabs)
export const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string; description: string }> = {
  rascunho:               { emoji: '📝', label: 'Rascunho', color: '#6B7280', description: 'Briefing e ideia registrada' },
  conteudo:               { emoji: '⚙️', label: 'Conteúdo', color: '#3B82F6', description: 'Copy + Design em andamento' },
  aprovacao_interna:      { emoji: '👁️', label: 'Aprov. Interna', color: '#8B5CF6', description: 'Revisão da equipe' },
  aprovacao_cliente:      { emoji: '📤', label: 'Aprov. Cliente', color: '#F59E0B', description: 'Aguardando aprovação do cliente' },
  ajuste:                 { emoji: '🔄', label: 'Ajustes', color: '#F97316', description: 'Cliente pediu alterações' },
  aguardando_agendamento: { emoji: '⏳', label: 'Ag. Agendamento', color: '#06B6D4', description: 'Aprovado, aguardando agendar' },
  agendado:               { emoji: '📅', label: 'Agendado', color: '#6366F1', description: 'Data e hora definidos' },
  publicado:              { emoji: '🚀', label: 'Publicado', color: '#059669', description: 'Publicado nas redes' },
  cancelado:              { emoji: '❌', label: 'Cancelado', color: '#EF4444', description: 'Demanda cancelada' },
  arquivado:              { emoji: '📦', label: 'Arquivado', color: '#9CA3AF', description: 'Arquivado para referência' },
}

export type StatusConteudo = 'rascunho' | 'conteudo' | 'aprovacao_interna' | 'aprovacao_cliente' | 'ajuste' | 'aguardando_agendamento' | 'agendado' | 'publicado' | 'cancelado' | 'arquivado'

// Sub-status para a coluna "Conteúdo" (produção)
export const SUB_STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  aguardando_texto:   { emoji: '✏️', label: 'Aguardando Texto', color: '#F59E0B' },
  texto_concluido:    { emoji: '✅', label: 'Texto OK', color: '#22C55E' },
  aguardando_design:  { emoji: '🎨', label: 'Aguardando Design', color: '#F59E0B' },
  design_concluido:   { emoji: '✅', label: 'Design OK', color: '#22C55E' },
}

export type SubStatusConteudo = 'aguardando_texto' | 'texto_concluido' | 'aguardando_design' | 'design_concluido'

// Map ALL legacy/old status values to the new pipeline
export const LEGACY_STATUS_MAP: Record<string, string> = {
  // Status antigos → novos
  nova_solicitacao: 'rascunho',
  producao: 'conteudo',
  revisao: 'conteudo',
  design: 'conteudo',
  aprovacao: 'aprovacao_cliente',
  ajustes: 'ajuste',
  aprovado: 'aguardando_agendamento',
  aprovado_agendado: 'agendado',
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
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatDateFull(dateStr: string | null) {
  if (!dateStr) return '-'
  // Suporta ISO completo (2026-02-07T21:00:00.000Z) ou só data (2026-02-07)
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return 'Invalid Date'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
