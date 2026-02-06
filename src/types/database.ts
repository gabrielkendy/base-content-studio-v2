export type UserRole = 'admin' | 'gestor' | 'designer' | 'cliente'

// ============== SISTEMA DE PERMISSÕES GRANULARES (estilo mLabs) ==============

export type PermissionLevel = 'full' | 'read' | 'none'
export type WorkflowPermission = 'full' | 'creator' | 'approver_internal' | 'approver_external' | 'none'

export interface MemberPermissions {
  // Conexão de Canais (Redes Sociais)
  canais: {
    enabled: boolean
    level: PermissionLevel // full = conectar/desconectar, read = ver apenas
  }
  // Agendar Post e Calendário
  calendario: {
    enabled: boolean
    level: PermissionLevel // full = criar/editar/remover, read = visualizar
  }
  // Relatórios e Analytics
  relatorios: {
    enabled: boolean
    level: PermissionLevel
  }
  // Workflow (mais granular)
  workflow: {
    enabled: boolean
    level: WorkflowPermission
    // full = tudo
    // creator = criar conteúdo, ver refações
    // approver_internal = aprovar/reprovar internamente
    // approver_external = aprovar/reprovar como cliente
  }
  // Repositório de Mídia
  repositorio: {
    enabled: boolean
    level: PermissionLevel
  }
  // Brand Book
  brand: {
    enabled: boolean
    level: PermissionLevel
  }
  // Chat
  chat: {
    enabled: boolean
    level: PermissionLevel
  }
  // Equipe (gerenciar membros)
  equipe: {
    enabled: boolean
    level: PermissionLevel
  }
  // Configurações
  configuracoes: {
    enabled: boolean
    level: PermissionLevel
  }
  // Clientes (criar/editar clientes)
  clientes: {
    enabled: boolean
    level: PermissionLevel
  }
  // Ads (impulsionar postagens)
  ads: {
    enabled: boolean
    level: PermissionLevel
  }
  // Solicitações (gerenciar solicitações de clientes)
  solicitacoes: {
    enabled: boolean
    level: PermissionLevel
  }
  // Webhooks e Integrações
  webhooks: {
    enabled: boolean
    level: PermissionLevel
  }
}

// Permissões padrão por role
export const DEFAULT_PERMISSIONS: Record<UserRole, MemberPermissions> = {
  admin: {
    canais: { enabled: true, level: 'full' },
    calendario: { enabled: true, level: 'full' },
    relatorios: { enabled: true, level: 'full' },
    workflow: { enabled: true, level: 'full' },
    repositorio: { enabled: true, level: 'full' },
    brand: { enabled: true, level: 'full' },
    chat: { enabled: true, level: 'full' },
    equipe: { enabled: true, level: 'full' },
    configuracoes: { enabled: true, level: 'full' },
    clientes: { enabled: true, level: 'full' },
    ads: { enabled: true, level: 'full' },
    solicitacoes: { enabled: true, level: 'full' },
    webhooks: { enabled: true, level: 'full' },
  },
  gestor: {
    canais: { enabled: true, level: 'full' },
    calendario: { enabled: true, level: 'full' },
    relatorios: { enabled: true, level: 'full' },
    workflow: { enabled: true, level: 'full' },
    repositorio: { enabled: true, level: 'full' },
    brand: { enabled: true, level: 'full' },
    chat: { enabled: true, level: 'full' },
    equipe: { enabled: true, level: 'read' },
    configuracoes: { enabled: true, level: 'read' },
    clientes: { enabled: true, level: 'full' },
    ads: { enabled: true, level: 'full' },
    solicitacoes: { enabled: true, level: 'full' },
    webhooks: { enabled: true, level: 'read' },
  },
  designer: {
    canais: { enabled: false, level: 'none' },
    calendario: { enabled: true, level: 'read' },
    relatorios: { enabled: false, level: 'none' },
    workflow: { enabled: true, level: 'creator' },
    repositorio: { enabled: true, level: 'full' },
    brand: { enabled: true, level: 'read' },
    chat: { enabled: true, level: 'full' },
    equipe: { enabled: false, level: 'none' },
    configuracoes: { enabled: false, level: 'none' },
    clientes: { enabled: true, level: 'read' },
    ads: { enabled: false, level: 'none' },
    solicitacoes: { enabled: true, level: 'read' },
    webhooks: { enabled: false, level: 'none' },
  },
  cliente: {
    canais: { enabled: false, level: 'none' },
    calendario: { enabled: true, level: 'read' },
    relatorios: { enabled: true, level: 'read' },
    workflow: { enabled: true, level: 'approver_external' },
    repositorio: { enabled: true, level: 'read' },
    brand: { enabled: true, level: 'read' },
    chat: { enabled: true, level: 'full' },
    equipe: { enabled: false, level: 'none' },
    configuracoes: { enabled: false, level: 'none' },
    clientes: { enabled: false, level: 'none' },
    ads: { enabled: false, level: 'none' },
    solicitacoes: { enabled: true, level: 'full' },
    webhooks: { enabled: false, level: 'none' },
  },
}

// Preferências de notificação por email
export interface EmailNotificationPrefs {
  new_content: boolean // Novo conteúdo criado
  approval_request: boolean // Solicitação de aprovação
  approval_response: boolean // Resposta de aprovação
  content_published: boolean // Conteúdo publicado
  deadline_reminder: boolean // Lembrete de prazo
  weekly_digest: boolean // Resumo semanal
  chat_messages: boolean // Mensagens no chat
}

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
  // Permissões personalizadas (se null, usa DEFAULT_PERMISSIONS[role])
  custom_permissions: MemberPermissions | null
  // Preferências de notificação por email
  email_notifications: EmailNotificationPrefs | null
  // Info adicional
  email?: string
  last_login_at?: string
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
  sub_status: string | null
  ordem: number
  midia_urls: string[]
  canais: string[]
  assigned_to: string | null
  solicitacao_id?: string
  // Campos de aprovação interna
  internal_approved: boolean
  internal_approved_by: string | null
  internal_approved_at: string | null
  created_at: string
  updated_at: string
  // Joined
  empresa?: Cliente
  assignee?: Member
  approvals?: Approval[]
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

// Sistema de Aprovações (Módulo 2)
export type ApprovalType = 'internal' | 'external'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'adjustment'

export interface Approval {
  id: string
  org_id: string
  conteudo_id: string
  type: ApprovalType
  status: ApprovalStatus
  reviewer_id: string | null
  reviewer_name: string | null
  comment: string | null
  created_at: string
  reviewed_at: string | null
  previous_status: string | null
  new_status: string | null
  link_token: string | null
  // Joined
  reviewer?: Member
  conteudo?: Conteudo
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
