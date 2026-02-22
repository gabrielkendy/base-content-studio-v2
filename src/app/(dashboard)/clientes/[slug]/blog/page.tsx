'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { 
  ArrowLeft, 
  FileText, 
  Settings, 
  Plus, 
  ExternalLink, 
  Eye,
  Pencil,
  Trash2,
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo } from '@/types/database'
import { STATUS_CONFIG } from '@/lib/utils'

type TabView = 'artigos' | 'config'

interface WordPressConfig {
  wp_url: string
  wp_user: string
  wp_app_password: string
  wp_default_status: string
  wp_default_category_id: number | null
}

interface WPCategory {
  id: number
  name: string
  slug: string
  count: number
}

export default function ClienteBlogPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [artigos, setArtigos] = useState<Conteudo[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<TabView>('artigos')
  
  // Config WordPress
  const [wpConfig, setWpConfig] = useState<WordPressConfig>({
    wp_url: '',
    wp_user: '',
    wp_app_password: '',
    wp_default_status: 'draft',
    wp_default_category_id: null,
  })
  const [wpCategories, setWpCategories] = useState<WPCategory[]>([])
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'ok' | 'error'>('none')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  
  // Carregar dados
  useEffect(() => {
    if (org) loadData()
  }, [org])

  async function loadData() {
    setLoading(true)
    
    // Buscar cliente
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })
    
    if (!c) {
      setLoading(false)
      return
    }
    
    setCliente(c)
    
    // Preencher config WP
    setWpConfig({
      wp_url: c.wp_url || '',
      wp_user: c.wp_user || '',
      wp_app_password: c.wp_app_password || '',
      wp_default_status: c.wp_default_status || 'draft',
      wp_default_category_id: c.wp_default_category_id || null,
    })
    
    // Buscar artigos de blog
    const { data: arts } = await db.select('conteudos', {
      filters: [
        { op: 'eq', col: 'empresa_id', val: c.id },
        { op: 'eq', col: 'categoria', val: 'blog' },
      ],
      order: { col: 'created_at', asc: false },
    })
    
    setArtigos(arts || [])
    setLoading(false)
  }

  // Testar conexão WordPress
  async function handleTestConnection() {
    if (!wpConfig.wp_url || !wpConfig.wp_user || !wpConfig.wp_app_password) {
      toast('Preencha todos os campos', 'error')
      return
    }
    
    setTestingConnection(true)
    setConnectionStatus('none')
    
    try {
      const res = await fetch('/api/blog/wordpress/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wpConfig),
      })
      
      const data = await res.json()
      
      if (data.success) {
        setConnectionStatus('ok')
        setConnectionMessage(`✅ Conectado! ${data.wordpress?.name} - ${data.wordpress?.total_posts} posts`)
        
        // Carregar categorias
        loadCategories()
      } else {
        setConnectionStatus('error')
        setConnectionMessage(data.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setConnectionMessage(error.message)
    }
    
    setTestingConnection(false)
  }

  // Carregar categorias do WordPress
  async function loadCategories() {
    if (!cliente) return
    
    try {
      const res = await fetch(`/api/blog/wordpress/categories?cliente_id=${cliente.id}`)
      const data = await res.json()
      
      if (data.categories) {
        setWpCategories(data.categories)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  // Salvar configurações
  async function handleSaveConfig() {
    if (!cliente) return
    
    setSavingConfig(true)
    
    try {
      const { error } = await db.update('clientes', {
        wp_url: wpConfig.wp_url || null,
        wp_user: wpConfig.wp_user || null,
        wp_app_password: wpConfig.wp_app_password || null,
        wp_default_status: wpConfig.wp_default_status,
        wp_default_category_id: wpConfig.wp_default_category_id,
      }, { id: cliente.id })
      
      if (error) throw new Error(error)
      
      toast('Configurações salvas!', 'success')
    } catch (error: any) {
      toast('Erro ao salvar: ' + error.message, 'error')
    }
    
    setSavingConfig(false)
  }

  // Publicar artigo
  async function handlePublish(artigoId: string) {
    if (!confirm('Publicar este artigo no WordPress?')) return
    
    try {
      const res = await fetch(`/api/blog/${artigoId}/publish`, {
        method: 'POST',
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast('Artigo publicado!', 'success')
        loadData() // Recarregar lista
      } else {
        toast(data.error || 'Erro ao publicar', 'error')
      }
    } catch (error: any) {
      toast('Erro: ' + error.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!cliente) {
    return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>
  }

  const primaria = cliente.cores?.primaria || '#6366F1'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/clientes/${slug}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="w-6 h-6" style={{ color: primaria }} />
              Blog - {cliente.nome}
            </h1>
            <p className="text-sm text-zinc-500">{artigos.length} artigos</p>
          </div>
        </div>
        
        <Button onClick={() => toast('Em breve: criar artigo', 'info')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Artigo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-zinc-100 rounded-xl w-fit">
        <button
          onClick={() => setView('artigos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'artigos' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Artigos
        </button>
        <button
          onClick={() => setView('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'config' 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configurações WordPress
        </button>
      </div>

      {/* Conteúdo */}
      {view === 'artigos' && (
        <div className="space-y-4">
          {artigos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                <p className="text-zinc-500 mb-2">Nenhum artigo de blog ainda</p>
                <p className="text-sm text-zinc-400">
                  Os artigos criados aparecerão aqui para aprovação e publicação
                </p>
              </CardContent>
            </Card>
          ) : (
            artigos.map(artigo => (
              <Card key={artigo.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 rounded-lg bg-zinc-100 flex-shrink-0 overflow-hidden">
                      {artigo.midia_urls?.[0] ? (
                        <img 
                          src={artigo.midia_urls[0]} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-zinc-300" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 truncate">
                        {artigo.titulo || 'Sem título'}
                      </h3>
                      <p className="text-sm text-zinc-500 line-clamp-2 mt-1">
                        {artigo.descricao?.replace(/<[^>]*>/g, '').slice(0, 150)}...
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge 
                          variant={artigo.status === 'publicado' ? 'success' : 'default'}
                          className="text-xs"
                        >
                          {STATUS_CONFIG[artigo.status as keyof typeof STATUS_CONFIG]?.label || artigo.status}
                        </Badge>
                        <span className="text-xs text-zinc-400">
                          {new Date(artigo.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {artigo.wp_post_url && (
                          <a 
                            href={artigo.wp_post_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver no site
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link href={`/clientes/${slug}/conteudo/${artigo.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {artigo.status !== 'publicado' && wpConfig.wp_url && (
                        <Button 
                          size="sm" 
                          onClick={() => handlePublish(artigo.id)}
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          Publicar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {view === 'config' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configurações do WordPress
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Configure a conexão com o WordPress para publicar artigos automaticamente.
              </p>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label>URL do WordPress</Label>
                <Input
                  placeholder="https://seusite.com.br"
                  value={wpConfig.wp_url}
                  onChange={e => setWpConfig({ ...wpConfig, wp_url: e.target.value })}
                />
                <p className="text-xs text-zinc-400 mt-1">
                  URL completa do site (sem /wp-admin)
                </p>
              </div>
              
              <div>
                <Label>Usuário WordPress</Label>
                <Input
                  placeholder="admin"
                  value={wpConfig.wp_user}
                  onChange={e => setWpConfig({ ...wpConfig, wp_user: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Application Password</Label>
                <Input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  value={wpConfig.wp_app_password}
                  onChange={e => setWpConfig({ ...wpConfig, wp_app_password: e.target.value })}
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Gere em: WordPress → Usuários → Perfil → Application Passwords
                </p>
              </div>
              
              <div>
                <Label>Status padrão ao publicar</Label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={wpConfig.wp_default_status}
                  onChange={e => setWpConfig({ ...wpConfig, wp_default_status: e.target.value })}
                >
                  <option value="draft">Rascunho (draft)</option>
                  <option value="publish">Publicado (publish)</option>
                </select>
              </div>
              
              {wpCategories.length > 0 && (
                <div>
                  <Label>Categoria padrão</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={wpConfig.wp_default_category_id || ''}
                    onChange={e => setWpConfig({ 
                      ...wpConfig, 
                      wp_default_category_id: e.target.value ? parseInt(e.target.value) : null 
                    })}
                  >
                    <option value="">Nenhuma</option>
                    {wpCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Status da conexão */}
            {connectionStatus !== 'none' && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                connectionStatus === 'ok' 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {connectionStatus === 'ok' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm">{connectionMessage}</span>
              </div>
            )}
            
            {/* Botões */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Testar Conexão
              </Button>
              
              <Button onClick={handleSaveConfig} disabled={savingConfig}>
                {savingConfig ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
