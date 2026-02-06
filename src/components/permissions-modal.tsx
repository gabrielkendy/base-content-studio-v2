'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { 
  MemberPermissions, 
  DEFAULT_PERMISSIONS, 
  UserRole,
  PermissionLevel,
  WorkflowPermission 
} from '@/types/database'
import { 
  Share2, 
  Calendar, 
  BarChart3, 
  GitBranch, 
  FolderOpen, 
  Palette, 
  MessageSquare,
  Users,
  Settings,
  Building2,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react'

interface PermissionSection {
  id: keyof MemberPermissions
  label: string
  icon: any
  description: string
  levels: { value: string; label: string; desc: string }[]
  isWorkflow?: boolean
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: 'canais',
    label: 'Conexão dos Canais',
    icon: Share2,
    description: 'Permite conectar/desconectar redes sociais (Instagram, TikTok, etc)',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode conectar e desconectar canais' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar canais conectados' },
    ]
  },
  {
    id: 'calendario',
    label: 'Agendar Post e Calendário',
    icon: Calendar,
    description: 'Gerenciar agendamentos e visualizar calendário de conteúdos',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode criar, editar e remover agendamentos' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar calendário, mas não editar' },
    ]
  },
  {
    id: 'relatorios',
    label: 'Relatórios e Acompanhamento',
    icon: BarChart3,
    description: 'Acessar analytics e relatórios de desempenho',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode criar, editar ou remover relatórios' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar relatórios existentes' },
    ]
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: GitBranch,
    description: 'Gerenciar fluxo de criação e aprovação de conteúdos',
    isWorkflow: true,
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Acesso completo: criar, aprovar, reprovar, agendar e gerenciar equipe' },
      { value: 'creator', label: 'Equipe de criação', desc: 'Pode criar conteúdo e visualizar refações solicitadas' },
      { value: 'approver_internal', label: 'Aprovador interno', desc: 'Pode aprovar/reprovar internamente e solicitar refações' },
      { value: 'approver_external', label: 'Cliente (Aprovador externo)', desc: 'Pode aprovar/reprovar externamente e solicitar refações' },
    ]
  },
  {
    id: 'repositorio',
    label: 'Repositório de Mídia',
    icon: FolderOpen,
    description: 'Acessar e gerenciar arquivos de mídia',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode fazer upload, editar e excluir arquivos' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar e baixar arquivos' },
    ]
  },
  {
    id: 'brand',
    label: 'Brand Book',
    icon: Palette,
    description: 'Acessar e gerenciar identidade visual do cliente',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode editar cores, logos e diretrizes' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar brand book' },
    ]
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    description: 'Comunicação interna e com clientes',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode enviar e receber mensagens' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode apenas visualizar conversas' },
    ]
  },
  {
    id: 'equipe',
    label: 'Gerenciar Equipe',
    icon: Users,
    description: 'Convidar membros e gerenciar acessos',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode convidar, editar e remover membros' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar lista de membros' },
    ]
  },
  {
    id: 'clientes',
    label: 'Gerenciar Clientes',
    icon: Building2,
    description: 'Criar e editar clientes/empresas',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode criar, editar e remover clientes' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar lista de clientes' },
    ]
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    description: 'Configurações da organização e integrações',
    levels: [
      { value: 'full', label: 'Acesso total', desc: 'Pode alterar todas as configurações' },
      { value: 'read', label: 'Somente leitura', desc: 'Pode visualizar configurações' },
    ]
  },
]

interface PermissionsModalProps {
  open: boolean
  onClose: () => void
  member: {
    id: string
    display_name: string
    email?: string
    avatar_url?: string | null
    role: UserRole
    custom_permissions?: MemberPermissions | null
  }
  onSave: (memberId: string, permissions: MemberPermissions) => Promise<void>
}

export function PermissionsModal({ open, onClose, member, onSave }: PermissionsModalProps) {
  const [permissionType, setPermissionType] = useState<'default' | 'custom'>('default')
  const [permissions, setPermissions] = useState<MemberPermissions>(
    member.custom_permissions || DEFAULT_PERMISSIONS[member.role]
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [applyToNewProfiles, setApplyToNewProfiles] = useState(false)

  useEffect(() => {
    if (member.custom_permissions) {
      setPermissionType('custom')
      setPermissions(member.custom_permissions)
    } else {
      setPermissionType('default')
      setPermissions(DEFAULT_PERMISSIONS[member.role])
    }
  }, [member])

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedSections(next)
  }

  const toggleEnabled = (id: keyof MemberPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled }
    }))
    setPermissionType('custom')
  }

  const setLevel = (id: keyof MemberPermissions, level: string) => {
    setPermissions(prev => ({
      ...prev,
      [id]: { ...prev[id], level }
    }))
    setPermissionType('custom')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(member.id, permissionType === 'default' ? DEFAULT_PERMISSIONS[member.role] : permissions)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = () => {
    setPermissionType('default')
    setPermissions(DEFAULT_PERMISSIONS[member.role])
  }

  return (
    <Modal open={open} onClose={onClose} title="Configure as permissões" size="lg">
      <div className="space-y-6">
        {/* Header com info do usuário */}
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <Avatar name={member.display_name} src={member.avatar_url} size="lg" />
          <div>
            <p className="text-sm text-zinc-500">Atribua permissões de acesso para o usuário:</p>
            <p className="font-bold text-orange-500">{member.display_name.toUpperCase()}</p>
            {member.email && <p className="text-sm text-zinc-400">({member.email})</p>}
          </div>
        </div>

        {/* Tabs: Todos os perfis / Permissões personalizadas */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={resetToDefault}
            className={`px-6 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
              permissionType === 'default'
                ? 'border-orange-500 text-orange-500 bg-orange-50'
                : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
            }`}
          >
            Perfil padrão ({member.role})
          </button>
          <button
            onClick={() => setPermissionType('custom')}
            className={`px-6 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
              permissionType === 'custom'
                ? 'border-orange-500 text-orange-500 bg-orange-50'
                : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
            }`}
          >
            Permissões personalizadas
          </button>
        </div>

        {/* Lista de permissões */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
          {PERMISSION_SECTIONS.map((section, idx) => {
            const perm = permissions[section.id]
            const isExpanded = expandedSections.has(section.id)
            const Icon = section.icon
            
            return (
              <div key={section.id} className={idx > 0 ? 'border-t border-zinc-100' : ''}>
                {/* Header da seção */}
                <div 
                  className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 cursor-pointer"
                  onClick={() => toggleSection(section.id)}
                >
                  <Icon className="w-5 h-5 text-zinc-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-zinc-800">{section.label}</span>
                    </div>
                  </div>
                  
                  {/* Toggle switch */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleEnabled(section.id) }}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      perm.enabled ? 'bg-orange-500' : 'bg-zinc-200'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      perm.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
                
                {/* Opções expandidas */}
                {isExpanded && perm.enabled && (
                  <div className="px-5 pb-4 pl-14 space-y-2">
                    {section.levels.map(level => (
                      <label
                        key={level.value}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 cursor-pointer"
                      >
                        <div className="mt-0.5">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            perm.level === level.value
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-zinc-300'
                          }`}>
                            {perm.level === level.value && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-zinc-700">{level.label}</div>
                          <div className="text-sm text-zinc-500">{level.desc}</div>
                        </div>
                        <input
                          type="radio"
                          name={section.id}
                          value={level.value}
                          checked={perm.level === level.value}
                          onChange={() => setLevel(section.id, level.value)}
                          className="sr-only"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Aplicar para novos perfis */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToNewProfiles}
            onChange={e => setApplyToNewProfiles(e.target.checked)}
            className="w-5 h-5 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-zinc-600">Aplicar permissão para novos perfis</span>
        </label>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="text-blue-600 font-medium hover:underline"
          >
            Cancelar
          </button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={saving}
            className="px-8"
          >
            {saving ? 'Salvando...' : 'Salvar permissões'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
