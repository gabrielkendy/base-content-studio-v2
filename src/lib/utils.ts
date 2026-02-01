import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const TIPOS_CONTEUDO = ['carrossel', 'reels', 'stories', 'estático', 'vídeo'] as const
export type TipoConteudo = typeof TIPOS_CONTEUDO[number]

export const TIPO_EMOJI: Record<string, string> = {
  'carrossel': '📑',
  'reels': '🎬',
  'stories': '📱',
  'estático': '🖼️',
  'vídeo': '🎥'
}

export const STATUS_CONFIG = {
  rascunho: { emoji: '📝', label: 'Rascunho', color: '#6B7280' },
  conteudo: { emoji: '🎨', label: 'Conteúdo', color: '#10B981' },
  aprovacao_cliente: { emoji: '👁️', label: 'Aprovação do cliente', color: '#F59E0B' },
  ajustes: { emoji: '🔧', label: 'Ajustes', color: '#EAB308' },
  aguardando: { emoji: '⏳', label: 'Aguardando', color: '#F97316' },
  aprovado_agendado: { emoji: '✅', label: 'Aprovado e agendado', color: '#3B82F6' },
  concluido: { emoji: '✔️', label: 'Concluídos', color: '#22C55E' }
} as const

export type StatusConteudo = keyof typeof STATUS_CONFIG

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
