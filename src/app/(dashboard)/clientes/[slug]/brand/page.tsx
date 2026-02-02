'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Save, Plus, Trash2, Copy, Check, Palette, Type, Users, MessageSquare,
  Instagram, Globe, Youtube, Facebook, Linkedin, FileText, Image, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ColorItem {
  name: string
  hex: string
  usage: string
}

interface FontItem {
  name: string
  weight: string
  usage: string
}

interface Persona {
  id: string
  name: string
  age: string
  profession: string
  pains: string
  desires: string
  behavior: string
}

interface BrandGuidelines {
  tone_of_voice?: string
  dos?: string[]
  donts?: string[]
  visual_references?: string[]
}

interface SocialLinks {
  instagram?: string
  tiktok?: string
  youtube?: string
  facebook?: string
  linkedin?: string
  website?: string
}

const DEFAULT_COLORS: ColorItem[] = [
  { name: 'Primária', hex: '#6366F1', usage: 'primaria' },
  { name: 'Secundária', hex: '#8B5CF6', usage: 'secundaria' },
  { name: 'Accent', hex: '#F59E0B', usage: 'accent' },
  { name: 'Background', hex: '#0F172A', usage: 'background' },
  { name: 'Texto', hex: '#F8FAFC', usage: 'text' },
]

const USAGE_OPTIONS = ['primaria', 'secundaria', 'accent', 'background', 'text', 'outro']

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrandBookPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Brand fields
  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({})
  const [colors, setColors] = useState<ColorItem[]>(DEFAULT_COLORS)
  const [fonts, setFonts] = useState<{ primary: FontItem; secondary: FontItem; decorative: FontItem }>({
    primary: { name: '', weight: '400', usage: 'Títulos e headers' },
    secondary: { name: '', weight: '400', usage: 'Corpo de texto' },
    decorative: { name: '', weight: '400', usage: 'Destaques (opcional)' },
  })
  const [guidelines, setGuidelines] = useState<BrandGuidelines>({
    tone_of_voice: '',
    dos: [''],
    donts: [''],
    visual_references: [''],
  })
  const [personas, setPersonas] = useState<Persona[]>([])

  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  useEffect(() => {
    if (!org) return
    loadCliente()
  }, [org])

  async function loadCliente() {
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })
    if (!c) { setLoading(false); return }
    setCliente(c)

    // Load brand data
    try {
      const res = await fetch(`/api/brand/${c.id}`)
      const json = await res.json()
      if (json.data) {
        const d = json.data
        if (d.bio) setBio(d.bio)
        if (d.social_links && Object.keys(d.social_links).length > 0) setSocialLinks(d.social_links)
        if (d.color_palette && Array.isArray(d.color_palette) && d.color_palette.length > 0) setColors(d.color_palette)
        if (d.fonts && Object.keys(d.fonts).length > 0) {
          setFonts({
            primary: d.fonts.primary || fonts.primary,
            secondary: d.fonts.secondary || fonts.secondary,
            decorative: d.fonts.decorative || fonts.decorative,
          })
        }
        if (d.brand_guidelines && Object.keys(d.brand_guidelines).length > 0) {
          setGuidelines({
            tone_of_voice: d.brand_guidelines.tone_of_voice || '',
            dos: d.brand_guidelines.dos?.length ? d.brand_guidelines.dos : [''],
            donts: d.brand_guidelines.donts?.length ? d.brand_guidelines.donts : [''],
            visual_references: d.brand_guidelines.visual_references?.length ? d.brand_guidelines.visual_references : [''],
          })
        }
        if (d.personas && Array.isArray(d.personas) && d.personas.length > 0) setPersonas(d.personas)
      }
    } catch {}
    setLoading(false)
  }

  async function saveSection(section: string, data: Record<string, any>) {
    if (!cliente) return
    setSaving(section)
    try {
      const res = await fetch(`/api/brand/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast('Salvo com sucesso!', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar', 'error')
    }
    setSaving(null)
  }

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 1500)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    )
  }

  if (!cliente) return <div className="text-center py-12 text-zinc-400">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/clientes/${slug}`} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaria }}>
              {cliente.nome.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Brand Book</h1>
              <p className="text-sm text-zinc-500">{cliente.nome}</p>
            </div>
          </div>
        </div>

        {/* ─── Seção 1: Sobre o Negócio ──────────────────────────────────── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Sobre o Negócio</h2>
            </div>
            <button
              onClick={() => saveSection('bio', { bio, social_links: socialLinks })}
              disabled={saving === 'bio'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving === 'bio' ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Bio / Descrição do negócio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreva o negócio, posicionamento, proposta de valor..."
              className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-3">Redes Sociais</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@perfil' },
                { key: 'tiktok', label: 'TikTok', icon: Globe, placeholder: '@perfil' },
                { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'youtube.com/...' },
                { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'facebook.com/...' },
                { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'linkedin.com/in/...' },
                { key: 'website', label: 'Site', icon: Globe, placeholder: 'https://...' },
              ].map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-3 py-2.5 border border-zinc-700/50">
                  <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input
                    value={(socialLinks as any)[key] || ''}
                    onChange={(e) => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Seção 2: Paleta de Cores ──────────────────────────────────── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Paleta de Cores</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setColors(prev => [...prev, { name: 'Nova Cor', hex: '#888888', usage: 'outro' }])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
              <button
                onClick={() => saveSection('colors', { color_palette: colors })}
                disabled={saving === 'colors'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving === 'colors' ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colors.map((color, idx) => (
              <div key={idx} className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-xl shrink-0 border-2 border-zinc-600 cursor-pointer relative group"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => copyHex(color.hex)}
                  >
                    {copiedHex === color.hex && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={color.name}
                      onChange={(e) => {
                        const updated = [...colors]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setColors(updated)
                      }}
                      className="w-full bg-transparent text-sm font-medium text-zinc-200 focus:outline-none border-b border-transparent focus:border-zinc-600 pb-0.5"
                      placeholder="Nome da cor"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => {
                          const updated = [...colors]
                          updated[idx] = { ...updated[idx], hex: e.target.value }
                          setColors(updated)
                        }}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        value={color.hex}
                        onChange={(e) => {
                          const updated = [...colors]
                          updated[idx] = { ...updated[idx], hex: e.target.value }
                          setColors(updated)
                        }}
                        className="bg-transparent text-xs text-zinc-400 font-mono focus:outline-none w-20"
                        placeholder="#000000"
                      />
                      <button onClick={() => copyHex(color.hex)} className="p-1 hover:bg-zinc-700 rounded transition-colors" title="Copiar hex">
                        <Copy className="w-3 h-3 text-zinc-500" />
                      </button>
                    </div>
                  </div>
                  {colors.length > 1 && (
                    <button
                      onClick={() => setColors(colors.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-400" />
                    </button>
                  )}
                </div>
                <select
                  value={color.usage}
                  onChange={(e) => {
                    const updated = [...colors]
                    updated[idx] = { ...updated[idx], usage: e.target.value }
                    setColors(updated)
                  }}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  {USAGE_OPTIONS.map(u => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Seção 3: Tipografia ───────────────────────────────────────── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Type className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Tipografia</h2>
            </div>
            <button
              onClick={() => saveSection('fonts', { fonts })}
              disabled={saving === 'fonts'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving === 'fonts' ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'primary' as const, label: 'Fonte Principal', desc: 'Títulos e headers' },
              { key: 'secondary' as const, label: 'Fonte Secundária', desc: 'Corpo de texto' },
              { key: 'decorative' as const, label: 'Fonte Decorativa', desc: 'Destaques (opcional)' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
                <div className="text-sm font-medium text-zinc-300">{label}</div>
                <input
                  value={fonts[key].name}
                  onChange={(e) => setFonts(prev => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }))}
                  placeholder="Ex: Inter, Poppins, Montserrat..."
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <div className="flex gap-2">
                  <input
                    value={fonts[key].weight}
                    onChange={(e) => setFonts(prev => ({ ...prev, [key]: { ...prev[key], weight: e.target.value } }))}
                    placeholder="Peso (400, 600...)"
                    className="flex-1 bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
                <input
                  value={fonts[key].usage}
                  onChange={(e) => setFonts(prev => ({ ...prev, [key]: { ...prev[key], usage: e.target.value } }))}
                  placeholder="Uso"
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
                />
                {/* Font preview */}
                <div className="pt-2 border-t border-zinc-700/50">
                  <p
                    className="text-zinc-400 text-xs mb-1">Preview:</p>
                  <p
                    className="text-zinc-200 text-lg leading-relaxed"
                    style={{
                      fontFamily: fonts[key].name ? `"${fonts[key].name}", sans-serif` : 'inherit',
                      fontWeight: parseInt(fonts[key].weight) || 400,
                    }}
                  >
                    {fonts[key].name ? 'The quick brown fox jumps over the lazy dog' : 'Digite o nome da fonte...'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Google Fonts hint */}
          {(fonts.primary.name || fonts.secondary.name || fonts.decorative.name) && (
            <link
              href={`https://fonts.googleapis.com/css2?${[fonts.primary, fonts.secondary, fonts.decorative]
                .filter(f => f.name)
                .map(f => `family=${encodeURIComponent(f.name)}:wght@${f.weight || '400'}`)
                .join('&')}&display=swap`}
              rel="stylesheet"
            />
          )}
        </section>

        {/* ─── Seção 4: Tom de Voz e Guidelines ──────────────────────────── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Tom de Voz & Guidelines</h2>
            </div>
            <button
              onClick={() => saveSection('guidelines', { brand_guidelines: guidelines })}
              disabled={saving === 'guidelines'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving === 'guidelines' ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Tom de Voz</label>
            <textarea
              value={guidelines.tone_of_voice || ''}
              onChange={(e) => setGuidelines(prev => ({ ...prev, tone_of_voice: e.target.value }))}
              placeholder="Ex: Profissional mas acessível, técnico sem ser frio, divertido sem perder credibilidade..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Do's */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-emerald-400 font-medium">✅ Do&apos;s (Fazer)</label>
                <button
                  onClick={() => setGuidelines(prev => ({ ...prev, dos: [...(prev.dos || []), ''] }))}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {(guidelines.dos || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={(e) => {
                      const updated = [...(guidelines.dos || [])]
                      updated[idx] = e.target.value
                      setGuidelines(prev => ({ ...prev, dos: updated }))
                    }}
                    placeholder="Ex: Usar linguagem inclusiva"
                    className="flex-1 bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                  {(guidelines.dos || []).length > 1 && (
                    <button
                      onClick={() => {
                        const updated = (guidelines.dos || []).filter((_, i) => i !== idx)
                        setGuidelines(prev => ({ ...prev, dos: updated }))
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Don'ts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-red-400 font-medium">❌ Don&apos;ts (Evitar)</label>
                <button
                  onClick={() => setGuidelines(prev => ({ ...prev, donts: [...(prev.donts || []), ''] }))}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {(guidelines.donts || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={(e) => {
                      const updated = [...(guidelines.donts || [])]
                      updated[idx] = e.target.value
                      setGuidelines(prev => ({ ...prev, donts: updated }))
                    }}
                    placeholder="Ex: Usar jargão excessivo"
                    className="flex-1 bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                  {(guidelines.donts || []).length > 1 && (
                    <button
                      onClick={() => {
                        const updated = (guidelines.donts || []).filter((_, i) => i !== idx)
                        setGuidelines(prev => ({ ...prev, donts: updated }))
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Visual References */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400 font-medium">🎨 Referências Visuais</label>
              <button
                onClick={() => setGuidelines(prev => ({ ...prev, visual_references: [...(prev.visual_references || []), ''] }))}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(guidelines.visual_references || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const updated = [...(guidelines.visual_references || [])]
                    updated[idx] = e.target.value
                    setGuidelines(prev => ({ ...prev, visual_references: updated }))
                  }}
                  placeholder="URL ou descrição de referência visual"
                  className="flex-1 bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
                />
                {(guidelines.visual_references || []).length > 1 && (
                  <button
                    onClick={() => {
                      const updated = (guidelines.visual_references || []).filter((_, i) => i !== idx)
                      setGuidelines(prev => ({ ...prev, visual_references: updated }))
                    }}
                    className="p-1 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Seção 5: Personas ─────────────────────────────────────────── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Personas / Público-alvo</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPersonas(prev => [...prev, {
                  id: genId(), name: '', age: '', profession: '', pains: '', desires: '', behavior: ''
                }])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
              >
                <Plus className="w-4 h-4" /> Persona
              </button>
              <button
                onClick={() => saveSection('personas', { personas })}
                disabled={saving === 'personas'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving === 'personas' ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {personas.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Nenhuma persona definida</p>
              <p className="text-zinc-600 text-xs mt-1">Clique em &quot;+ Persona&quot; para adicionar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((persona, idx) => (
                <div key={persona.id} className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-5 space-y-3 relative">
                  <button
                    onClick={() => setPersonas(prev => prev.filter(p => p.id !== persona.id))}
                    className="absolute top-3 right-3 p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-400" />
                  </button>

                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {persona.name ? persona.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <input
                      value={persona.name}
                      onChange={(e) => {
                        const updated = [...personas]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setPersonas(updated)
                      }}
                      placeholder="Nome da Persona"
                      className="flex-1 bg-transparent text-base font-semibold text-zinc-100 focus:outline-none border-b border-transparent focus:border-zinc-600 pb-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Idade</label>
                      <input
                        value={persona.age}
                        onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], age: e.target.value }; setPersonas(u) }}
                        placeholder="25-35"
                        className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Profissão</label>
                      <input
                        value={persona.profession}
                        onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], profession: e.target.value }; setPersonas(u) }}
                        placeholder="Empreendedor"
                        className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Dores</label>
                    <textarea
                      value={persona.pains}
                      onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], pains: e.target.value }; setPersonas(u) }}
                      placeholder="Quais os problemas dessa persona?"
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none h-16"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Desejos</label>
                    <textarea
                      value={persona.desires}
                      onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], desires: e.target.value }; setPersonas(u) }}
                      placeholder="O que essa persona deseja alcançar?"
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none h-16"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Comportamento</label>
                    <textarea
                      value={persona.behavior}
                      onChange={(e) => { const u = [...personas]; u[idx] = { ...u[idx], behavior: e.target.value }; setPersonas(u) }}
                      placeholder="Como se comporta, onde consome conteúdo..."
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none h-16"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Seção 6: Logos ────────────────────────────────────────────── */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Logos</h2>
          </div>
          <div className="text-center py-8 border border-dashed border-zinc-700 rounded-xl">
            <Image className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm mb-2">Os logos ficam no Repositório do cliente</p>
            <Link
              href={`/clientes/${slug}/repositorio`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ir para o Repositório
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
