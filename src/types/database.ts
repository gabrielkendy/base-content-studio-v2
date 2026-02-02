export type UserRole = 'admin' | 'gestor' | 'designer' | 'cliente'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: string
  brand_color: string
  accent_color: string
  favicon_url: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  new_requests: boolean
  pending_approvals: boolean
  chat_messages: boolean
  upcoming_deadlines: boolean
}

export interface Member {
  id: string
  user_id: string
  org_id: string
  role: UserRole
  display_name: string
  avatar_url: string | null
  invited_by: string | null
  status: 'active' | 'pending' | 'inactive'
  created_at: string
}

export interface Invite {
  id: string
  org_id: string
  email: string
  role: UserRole
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Cliente {
  id: string
  org_id: string
  nome: string
  slug: string
  cores: { primaria?: string; secundaria?: string }
  logo_url: string | null
  contato: string | null
  notas: string | null
  created_at: string
}

export interface Conteudo {
  id: string
  org_id: string
  empresa_id: string
  mes: number
  ano: number
  data_publicacao: string | null
  titulo: string | null
  tipo: string
  badge: string | null
  descricao: string | null
  slides: string[]
  prompts_imagem: string[]
  prompts_video: string[]
  legenda: string | null
  status: string
  ordem: number
  midia_urls: string[]
  canais: string[]
  assigned_to: string | null
  solicitacao_id?: string
  created_at: string
  updated_at: string
  // Joined
  empresa?: Cliente
  assignee?: Member
}

export interface AprovacaoLink {
  id: string
  conteudo_id: string
  empresa_id: string
  token: string
  status: 'pendente' | 'aprovado' | 'ajuste'
  comentario_cliente: string | null
  cliente_nome: string | null
  created_at: string
  expires_at: string
  aprovado_em: string | null
}

export interface Message {
  id: string
  org_id: string
  conteudo_id: string | null
  cliente_id: string | null
  channel_type: 'conteudo' | 'cliente' | 'geral'
  sender_id: string
  text: string
  attachments: string[]
  created_at: string
  // Joined
  sender?: Member
}

export interface Notification {
  id: string
  user_id: string
  org_id: string
  type: string
  title: string
  body: string
  read: boolean
  reference_id: string | null
  reference_type: string | null
  created_at: string
}

export interface WebhookConfig {
  id: string
  org_id: string
  url: string
  events: string[]
  active: boolean
  secret: string | null
  created_at: string
}

export interface WebhookEvent {
  id: string
  org_id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  status: 'pending' | 'sent' | 'failed'
  response_code: number | null
  sent_at: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  org_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  created_at: string
  // Joined
  user?: Member
}

// Member-Client access mapping
export interface MemberClient {
  id: string
  member_id: string
  cliente_id: string
  org_id: string
  created_at: string
}

// Solicitações
export type SolicitacaoPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'
export type SolicitacaoStatus = 'nova' | 'em_analise' | 'aprovada' | 'em_producao' | 'entregue' | 'cancelada'

export interface Solicitacao {
  id: string
  org_id: string
  cliente_id: string
  titulo: string
  descricao: string | null
  referencias: string[]
  arquivos_ref: string[]
  prioridade: SolicitacaoPrioridade
  prazo_desejado: string | null
  status: SolicitacaoStatus
  respondido_por: string | null
  resposta: string | null
  created_at: string
  updated_at: string
  // Joined
  cliente?: Cliente
}
