'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input, Label, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { MESES, STATUS_CONFIG, TIPO_EMOJI, TIPOS_CONTEUDO, formatDate, CANAIS } from '@/lib/utils'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Member } from '@/types/database'

export default function PostsMesPage() {
  const params = useParams()
  const slug = params.slug as string
  const mes = parseInt(params.mes as string)
  const { org, supabase, user } = useAuth()
  const { toast } = useToast()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const ano = new Date().getFullYear()

  const [form, setForm] = useState({
    titulo: '', tipo: 'carrossel', badge: '', data_publicacao: '',
    status: 'rascunho', descricao: '', legenda: '', slides: '',
    prompts_imagem: '', prompts_video: '', canais: [] as string[],
    assigned_to: '',
  })

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data: c } = await supabase.from('clientes').select('*').eq('org_id', org!.id).eq('slug', slug).single()
    if (!c) return
    setCliente(c)

    const { data: conts } = await supabase
      .from('conteudos').select('*')
      .eq('empresa_id', c.id).eq('mes', mes).eq('ano', ano)
      .order('ordem').order('data_publicacao')
    setConteudos(conts || [])

    const { data: mems } = await supabase.from('members').select('*').eq('org_id', org!.id).eq('status', 'active')
    setMembers(mems || [])
    setLoading(false)
  }

  function openNew() {
    setEditMode(false)
    setForm({
      titulo: '', tipo: 'carrossel', badge: '',
      data_publicacao: new Date().toISOString().split('T')[0],
      status: 'rascunho', descricao: '', legenda: '', slides: '',
      prompts_imagem: '', prompts_video: '', canais: [], assigned_to: '',
    })
    setModalOpen(true)
  }

  async function openDetail(id: string) {
    setDetailId(id)
    const post = conteudos.find(c => c.id === id)
    if (post) {
      setForm({
        titulo: post.titulo || '', tipo: post.tipo, badge: post.badge || '',
        data_publicacao: post.data_publicacao || '',
        status: post.status, descricao: post.descricao || '',
        legenda: post.legenda || '',
        slides: (post.slides || []).join('\n'),
        prompts_imagem: (post.prompts_imagem || []).join('\n---\n'),
        prompts_video: (post.prompts_video || []).join('\n---\n'),
        canais: post.canais || [],
        assigned_to: post.assigned_to || '',
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const slides = form.slides.split('\n').filter(s => s.trim())
    const promptsImg = form.prompts_imagem.split('---').map(s => s.trim()).filter(Boolean)
    const promptsVid = form.prompts_video.split('---').map(s => s.trim()).filter(Boolean)

    const payload = {
      org_id: org!.id,
      empresa_id: cliente!.id,
      titulo: form.titulo,
      tipo: form.tipo,
      badge: form.badge || null,
      data_publicacao: form.data_publicacao || null,
      status: form.status,
      descricao: form.descricao || null,
      legenda: form.legenda || null,
      slides, prompts_imagem: promptsImg, prompts_video: promptsVid,
      canais: form.canais,
      assigned_to: form.assigned_to || null,
      mes, ano,
      ordem: conteudos.length + 1,
    }

    if (editMode && detailId) {
      const { error } = await supabase.from('conteudos').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', detailId)
      if (error) { toast('Erro ao salvar', 'error'); return }
      toast('Conteúdo atualizado!', 'success')
    } else {
      const { error } = await supabase.from('conteudos').insert(payload)
      if (error) { toast('Erro ao criar', 'error'); return }
      toast('Conteúdo criado!', 'success')
    }

    setModalOpen(false)
    setDetailId(null)
    setEditMode(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este conteúdo?')) return
    await supabase.from('conteudos').delete().eq('id', id)
    toast('Excluído!', 'success')
    setDetailId(null)
    loadData()
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('conteudos').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    toast(`Status → ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}`, 'success')
    loadData()
  }

  async function handleCopyApproval(id: string) {
    const token = Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('')
    await supabase.from('aprovacoes_links').insert({
      conteudo_id: id, empresa_id: cliente!.id, token, status: 'pendente'
    })
    const link = `${window.location.origin}/aprovacao?token=${token}`
    await navigator.clipboard.writeText(link)
    toast('Link de aprovação copiado!', 'success')
  }

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'
  const detailPost = detailId ? conteudos.find(c => c.id === detailId) : null

  // Group by status tabs
  const statusCounts: Record<string, number> = {}
  conteudos.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
            <Link href={`/clientes/${slug}`} className="hover:text-blue-600">{cliente?.nome}</Link>
            <span>›</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">{MESES[mes - 1]} — Planejamento</h1>
          <p className="text-sm text-zinc-500">{conteudos.length} conteúdos</p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo Conteúdo
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([s, c]) => {
          const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]
          return cfg ? (
            <Badge key={s}>{cfg.emoji} {c} {cfg.label}</Badge>
          ) : null
        })}
      </div>

      {/* Posts grid */}
      {conteudos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo em {MESES[mes - 1]}</h3>
            <p className="text-sm text-zinc-500 mb-4">Comece planejando!</p>
            <Button variant="primary" onClick={openNew}><Plus className="w-4 h-4" /> Criar</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conteudos.map(post => {
            const cfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.rascunho
            return (
              <Card key={post.id} className="hover:shadow-md cursor-pointer transition-all group" onClick={() => openDetail(post.id)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400">{formatDate(post.data_publicacao)}</span>
                    <Badge style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                      {cfg.emoji} {cfg.label}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-zinc-900 group-hover:text-blue-600 mb-2 line-clamp-2">
                    {post.titulo || 'Sem título'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge>{TIPO_EMOJI[post.tipo] || '📄'} {post.tipo}</Badge>
                    {post.badge && <Badge variant="info">{post.badge}</Badge>}
                  </div>
                  {post.descricao && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{post.descricao}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detailId && !editMode} onClose={() => setDetailId(null)} title={detailPost?.titulo || 'Conteúdo'} size="lg">
        {detailPost && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{TIPO_EMOJI[detailPost.tipo]} {detailPost.tipo}</Badge>
              <Badge style={{ backgroundColor: STATUS_CONFIG[detailPost.status as keyof typeof STATUS_CONFIG]?.color + '20' }}>
                {STATUS_CONFIG[detailPost.status as keyof typeof STATUS_CONFIG]?.emoji} {STATUS_CONFIG[detailPost.status as keyof typeof STATUS_CONFIG]?.label}
              </Badge>
              {detailPost.badge && <Badge variant="info">{detailPost.badge}</Badge>}
              <span className="text-xs text-zinc-400 ml-auto">📅 {formatDate(detailPost.data_publicacao)}</span>
            </div>

            {/* Tabs */}
            {detailPost.descricao && (
              <div>
                <Label>📝 Narrativa</Label>
                <pre className="bg-zinc-50 rounded-lg p-4 text-sm whitespace-pre-wrap">{detailPost.descricao}</pre>
              </div>
            )}
            {detailPost.slides?.length > 0 && (
              <div>
                <Label>📑 Slides</Label>
                <div className="space-y-2">
                  {detailPost.slides.map((s: string, i: number) => (
                    <div key={i} className="bg-zinc-50 rounded-lg p-3 text-sm">{s}</div>
                  ))}
                </div>
              </div>
            )}
            {detailPost.legenda && (
              <div>
                <Label>📱 Legenda</Label>
                <pre className="bg-zinc-50 rounded-lg p-4 text-sm whitespace-pre-wrap">{detailPost.legenda}</pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button size="sm" onClick={() => { setEditMode(true); setModalOpen(true) }}>✏️ Editar</Button>
              <Select
                className="w-auto text-sm"
                value={detailPost.status}
                onChange={e => { handleStatusChange(detailPost.id, e.target.value); setDetailId(null) }}
              >
                {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                  <option key={s} value={s}>{cfg.emoji} {cfg.label}</option>
                ))}
              </Select>
              <Button size="sm" variant="outline" onClick={() => handleCopyApproval(detailPost.id)}>🔗 Link Aprovação</Button>
              <Button size="sm" variant="danger" className="ml-auto" onClick={() => handleDelete(detailPost.id)}>🗑️</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditMode(false) }} title={editMode ? '✏️ Editar' : '➕ Novo Conteúdo'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required placeholder="Título do conteúdo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS_CONTEUDO.map(t => <option key={t} value={t}>{TIPO_EMOJI[t]} {t}</option>)}
              </Select>
            </div>
            <div>
              <Label>Badge</Label>
              <Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="VIRAL, TREND..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Publicação</Label>
              <Input type="date" value={form.data_publicacao} onChange={e => setForm({ ...form, data_publicacao: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_CONFIG).map(([s, cfg]) => <option key={s} value={s}>{cfg.emoji} {cfg.label}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">Ninguém</option>
              {members.map(m => <option key={m.id} value={m.user_id}>{m.display_name} ({m.role})</option>)}
            </Select>
          </div>
          <div>
            <Label>Canais</Label>
            <div className="flex flex-wrap gap-2">
              {CANAIS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    canais: f.canais.includes(c.id) ? f.canais.filter(x => x !== c.id) : [...f.canais, c.id]
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    form.canais.includes(c.id) 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Descrição / Narrativa</Label>
            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={4} placeholder="Narrativa do conteúdo..." />
          </div>
          <div>
            <Label>Legenda</Label>
            <Textarea value={form.legenda} onChange={e => setForm({ ...form, legenda: e.target.value })} rows={3} placeholder="Legenda para publicação..." />
          </div>
          <div>
            <Label>Slides (um por linha)</Label>
            <Textarea value={form.slides} onChange={e => setForm({ ...form, slides: e.target.value })} rows={4} placeholder="Slide 1...&#10;Slide 2..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prompts Imagem (--- separa)</Label>
              <Textarea value={form.prompts_imagem} onChange={e => setForm({ ...form, prompts_imagem: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Prompts Vídeo (--- separa)</Label>
              <Textarea value={form.prompts_video} onChange={e => setForm({ ...form, prompts_video: e.target.value })} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditMode(false) }}>Cancelar</Button>
            <Button type="submit" variant="primary">💾 Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
