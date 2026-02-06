'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import {
  ArrowLeft, Save, Plus, Trash2, Copy, Check, Palette, Type, Users, MessageSquare,
  Instagram, Globe, Youtube, Facebook, Linkedin, FileText, Image, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'

interface ColorItem { name: string; hex: string; usage: string }
interface FontItem { name: string; weight: string; usage: string }
interface Persona { id: string; name: string; age: string; profession: string; pains: string; desires: string; behavior: string }
interface BrandGuidelines { tone_of_voice?: string; dos?: string[]; donts?: string[]; visual_references?: string[] }
interface SocialLinks { instagram?: string; tiktok?: string; youtube?: string; facebook?: string; linkedin?: string; website?: string }

const DEFAULT_COLORS: ColorItem[] = [
  { name: 'Primária', hex: '#6366F1', usage: 'primaria' },
  { name: 'Secundária', hex: '#8B5CF6', usage: 'secundaria' },
  { name: 'Accent', hex: '#F59E0B', usage: 'accent' },
  { name: 'Background', hex: '#FFFFFF', usage: 'background' },
  { name: 'Texto', hex: '#18181B', usage: 'text' },
]

const USAGE_OPTIONS = ['primaria', 'secundaria', 'accent', 'background', 'text', 'outro']
const genId = () => Math.random().toString(36).slice(2, 10)

export default function BrandBookPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({})
  const [colors, setColors] = useState<ColorItem[]>(DEFAULT_COLORS)
  const [fonts, setFonts] = useState({ primary: { name: '', weight: '400', usage: 'Títulos e headers' }, secondary: { name: '', weight: '400', usage: 'Corpo de texto' }, decorative: { name: '', weight: '400', usage: 'Destaques (opcional)' } })
  const [guidelines, setGuidelines] = useState<BrandGuidelines>({ tone_of_voice: '', dos: [''], donts: [''], visual_references: [''] })
  const [personas, setPersonas] = useState<Persona[]>([])
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  useEffect(() => { if (org) loadCliente() }, [org])

  async function loadCliente() {
    const { data: c } = await db.select('clientes', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }, { op: 'eq', col: 'slug', val: slug }], single: true })
    if (!c) { setLoading(false); return }
    setCliente(c)
    try {
      const res = await fetch(`/api/brand/${c.id}`)
      const json = await res.json()
      if (json.data) {
        const d = json.data
        if (d.bio) setBio(d.bio)
        if (d.social_links && Object.keys(d.social_links).length > 0) setSocialLinks(d.social_links)
        if (d.color_palette?.length > 0) setColors(d.color_palette)
        if (d.fonts && Object.keys(d.fonts).length > 0) setFonts({ primary: d.fonts.primary || fonts.primary, secondary: d.fonts.secondary || fonts.secondary, decorative: d.fonts.decorative || fonts.decorative })
        if (d.brand_guidelines && Object.keys(d.brand_guidelines).length > 0) setGuidelines({ tone_of_voice: d.brand_guidelines.tone_of_voice || '', dos: d.brand_guidelines.dos?.length ? d.brand_guidelines.dos : [''], donts: d.brand_guidelines.donts?.length ? d.brand_guidelines.donts : [''], visual_references: d.brand_guidelines.visual_references?.length ? d.brand_guidelines.visual_references : [''] })
        if (d.personas?.length > 0) setPersonas(d.personas)
      }
    } catch {}
    setLoading(false)
  }

  async function saveSection(section: string, data: Record<string, any>) {
    if (!cliente) return
    setSaving(section)
    try {
      const res = await fetch(`/api/brand/${cliente.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast('Salvo!', 'success')
    } catch (err: any) { toast(err.message || 'Erro', 'error') }
    setSaving(null)
  }

  function copyHex(hex: string) { navigator.clipboard.writeText(hex); setCopiedHex(hex); setTimeout(() => setCopiedHex(null), 1500) }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
  if (!cliente) return <div className="text-center py-12 text-zinc-400">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/clientes/${slug}`} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-500" />
        </Link>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: primaria }}>
          {cliente.nome.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Brand Book</h1>
          <p className="text-sm text-zinc-500">{cliente.nome}</p>
        </div>
      </div>

      {/* Seção 1: Sobre o Negócio */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Sobre o Negócio</h2>
            </div>
            <Button onClick={() => saveSection('bio', { bio, social_links: socialLinks })} disabled={saving === 'bio'} size="sm">
              <Save className="w-4 h-4 mr-1" /> {saving === 'bio' ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Bio / Descrição</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Descreva o negócio, posicionamento, proposta de valor..." rows={4} />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-3">Redes Sociais</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[{ key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@perfil' }, { key: 'tiktok', label: 'TikTok', icon: Globe, placeholder: '@perfil' }, { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'youtube.com/...' }, { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'facebook.com/...' }, { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'linkedin.com/in/...' }, { key: 'website', label: 'Site', icon: Globe, placeholder: 'https://...' }].map(({ key, icon: Icon, placeholder }) => (
                <div key={key} className="flex items-center gap-3 bg-zinc-50 rounded-lg px-3 py-2.5 border border-zinc-200">
                  <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input value={(socialLinks as any)[key] || ''} onChange={(e) => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="flex-1 bg-transparent text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Paleta de Cores */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Paleta de Cores</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setColors(prev => [...prev, { name: 'Nova', hex: '#888888', usage: 'outro' }])}>
                <Plus className="w-4 h-4 mr-1" /> Cor
              </Button>
              <Button onClick={() => saveSection('colors', { color_palette: colors })} disabled={saving === 'colors'} size="sm">
                <Save className="w-4 h-4 mr-1" /> {saving === 'colors' ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {colors.map((color, idx) => (
              <div key={idx} className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3 relative group">
                {colors.length > 1 && (
                  <button onClick={() => setColors(colors.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
                <div className="w-full h-16 rounded-lg cursor-pointer relative overflow-hidden shadow-inner" style={{ backgroundColor: color.hex }} onClick={() => copyHex(color.hex)}>
                  {copiedHex === color.hex && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Check className="w-5 h-5 text-white" /></div>}
                </div>
                <input value={color.name} onChange={(e) => { const u = [...colors]; u[idx] = { ...u[idx], name: e.target.value }; setColors(u) }} className="w-full bg-transparent text-sm font-medium text-zinc-700 focus:outline-none text-center" />
                <div className="flex items-center justify-center gap-1">
                  <input type="color" value={color.hex} onChange={(e) => { const u = [...colors]; u[idx] = { ...u[idx], hex: e.target.value }; setColors(u) }} className="w-5 h-5 rounded cursor-pointer" />
                  <span className="text-xs text-zinc-400 font-mono">{color.hex}</span>
                  <button onClick={() => copyHex(color.hex)} className="p-0.5 hover:bg-zinc-200 rounded"><Copy className="w-3 h-3 text-zinc-400" /></button>
                </div>
                <select value={color.usage} onChange={(e) => { const u = [...colors]; u[idx] = { ...u[idx], usage: e.target.value }; setColors(u) }} className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-600">
                  {USAGE_OPTIONS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Tipografia */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Type className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Tipografia</h2>
            </div>
            <Button onClick={() => saveSection('fonts', { fonts })} disabled={saving === 'fonts'} size="sm">
              <Save className="w-4 h-4 mr-1" /> {saving === 'fonts' ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ key: 'primary' as const, label: 'Principal' }, { key: 'secondary' as const, label: 'Secundária' }, { key: 'decorative' as const, label: 'Decorativa' }].map(({ key, label }) => (
              <div key={key} className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3">
                <div className="text-sm font-medium text-zinc-700">{label}</div>
                <Input value={fonts[key].name} onChange={(e) => setFonts(prev => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }))} placeholder="Ex: Inter, Poppins..." />
                <div className="flex gap-2">
                  <Input value={fonts[key].weight} onChange={(e) => setFonts(prev => ({ ...prev, [key]: { ...prev[key], weight: e.target.value } }))} placeholder="Peso" className="w-20" />
                  <Input value={fonts[key].usage} onChange={(e) => setFonts(prev => ({ ...prev, [key]: { ...prev[key], usage: e.target.value } }))} placeholder="Uso" className="flex-1" />
                </div>
                <div className="pt-2 border-t border-zinc-200">
                  <p className="text-xs text-zinc-400 mb-1">Preview:</p>
                  <p className="text-zinc-700 text-lg" style={{ fontFamily: fonts[key].name ? `"${fonts[key].name}", sans-serif` : 'inherit', fontWeight: parseInt(fonts[key].weight) || 400 }}>
                    {fonts[key].name || 'Digite a fonte...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {(fonts.primary.name || fonts.secondary.name || fonts.decorative.name) && (
            <link href={`https://fonts.googleapis.com/css2?${[fonts.primary, fonts.secondary, fonts.decorative].filter(f => f.name).map(f => `family=${encodeURIComponent(f.name)}:wght@${f.weight || '400'}`).join('&')}&display=swap`} rel="stylesheet" />
          )}
        </CardContent>
      </Card>

      {/* Seção 4: Tom de Voz */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Tom de Voz & Guidelines</h2>
            </div>
            <Button onClick={() => saveSection('guidelines', { brand_guidelines: guidelines })} disabled={saving === 'guidelines'} size="sm">
              <Save className="w-4 h-4 mr-1" /> {saving === 'guidelines' ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Tom de Voz</label>
            <Textarea value={guidelines.tone_of_voice || ''} onChange={(e) => setGuidelines(prev => ({ ...prev, tone_of_voice: e.target.value }))} placeholder="Ex: Profissional mas acessível, técnico sem ser frio..." rows={3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-emerald-600 font-medium">✅ Do's (Fazer)</label>
                <button onClick={() => setGuidelines(prev => ({ ...prev, dos: [...(prev.dos || []), ''] }))} className="text-zinc-400 hover:text-zinc-600"><Plus className="w-4 h-4" /></button>
              </div>
              {(guidelines.dos || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={item} onChange={(e) => { const u = [...(guidelines.dos || [])]; u[idx] = e.target.value; setGuidelines(prev => ({ ...prev, dos: u })) }} placeholder="Ex: Usar linguagem inclusiva" />
                  {(guidelines.dos || []).length > 1 && <button onClick={() => setGuidelines(prev => ({ ...prev, dos: (prev.dos || []).filter((_, i) => i !== idx) }))} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-red-600 font-medium">❌ Don'ts (Evitar)</label>
                <button onClick={() => setGuidelines(prev => ({ ...prev, donts: [...(prev.donts || []), ''] }))} className="text-zinc-400 hover:text-zinc-600"><Plus className="w-4 h-4" /></button>
              </div>
              {(guidelines.donts || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={item} onChange={(e) => { const u = [...(guidelines.donts || [])]; u[idx] = e.target.value; setGuidelines(prev => ({ ...prev, donts: u })) }} placeholder="Ex: Usar jargão excessivo" />
                  {(guidelines.donts || []).length > 1 && <button onClick={() => setGuidelines(prev => ({ ...prev, donts: (prev.donts || []).filter((_, i) => i !== idx) }))} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-600 font-medium">🎨 Referências Visuais</label>
              <button onClick={() => setGuidelines(prev => ({ ...prev, visual_references: [...(prev.visual_references || []), ''] }))} className="text-zinc-400 hover:text-zinc-600"><Plus className="w-4 h-4" /></button>
            </div>
            {(guidelines.visual_references || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input value={item} onChange={(e) => { const u = [...(guidelines.visual_references || [])]; u[idx] = e.target.value; setGuidelines(prev => ({ ...prev, visual_references: u })) }} placeholder="URL ou descrição" />
                {(guidelines.visual_references || []).length > 1 && <button onClick={() => setGuidelines(prev => ({ ...prev, visual_references: (prev.visual_references || []).filter((_, i) => i !== idx) }))} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção 5: Personas */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Personas</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPersonas(prev => [...prev, { id: genId(), name: '', age: '', profession: '', pains: '', desires: '', behavior: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Persona
              </Button>
              <Button onClick={() => saveSection('personas', { personas })} disabled={saving === 'personas'} size="sm">
                <Save className="w-4 h-4 mr-1" /> {saving === 'personas' ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
          {personas.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
              <p>Nenhuma persona definida</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((persona, idx) => (
                <div key={persona.id} className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 space-y-3 relative">
                  <button onClick={() => setPersonas(prev => prev.filter(p => p.id !== persona.id))} className="absolute top-3 right-3 p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">{persona.name?.charAt(0) || '?'}</div>
                    <Input value={persona.name} onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], name: e.target.value }; setPersonas(u) }} placeholder="Nome" className="flex-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={persona.age} onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], age: e.target.value }; setPersonas(u) }} placeholder="Idade (25-35)" />
                    <Input value={persona.profession} onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], profession: e.target.value }; setPersonas(u) }} placeholder="Profissão" />
                  </div>
                  <Textarea value={persona.pains} onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], pains: e.target.value }; setPersonas(u) }} placeholder="Dores..." rows={2} />
                  <Textarea value={persona.desires} onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], desires: e.target.value }; setPersonas(u) }} placeholder="Desejos..." rows={2} />
                  <Textarea value={persona.behavior} onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], behavior: e.target.value }; setPersonas(u) }} placeholder="Comportamento..." rows={2} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 6: Logos */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
              <Image className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Logos</h2>
          </div>
          <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-xl">
            <Image className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-3">Os logos ficam no Repositório</p>
            <Link href={`/clientes/${slug}/repositorio`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors">
              <ExternalLink className="w-4 h-4" /> Ir para o Repositório
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
