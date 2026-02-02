'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Palette, Type, Users, MessageSquare, FileText, Image,
  Instagram, Globe, Youtube, Facebook, Linkedin, ExternalLink, Copy, Check
} from 'lucide-react'
import type { Cliente } from '@/types/database'

interface ColorItem { name: string; hex: string; usage: string }
interface FontItem { name: string; weight: string; usage: string }
interface Persona { id: string; name: string; age: string; profession: string; pains: string; desires: string; behavior: string }
interface BrandGuidelines { tone_of_voice?: string; dos?: string[]; donts?: string[]; visual_references?: string[] }
interface SocialLinks { instagram?: string; tiktok?: string; youtube?: string; facebook?: string; linkedin?: string; website?: string }

const SOCIAL_ICONS: Record<string, any> = {
  instagram: Instagram, tiktok: Globe, youtube: Youtube,
  facebook: Facebook, linkedin: Linkedin, website: Globe,
}

export default function PortalBrandPage() {
  const { org, member } = useAuth()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({})
  const [colors, setColors] = useState<ColorItem[]>([])
  const [fonts, setFonts] = useState<{ primary: FontItem; secondary: FontItem; decorative: FontItem } | null>(null)
  const [guidelines, setGuidelines] = useState<BrandGuidelines>({})
  const [personas, setPersonas] = useState<Persona[]>([])
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  useEffect(() => {
    if (!org || !member) return
    loadBrand()
  }, [org, member])

  async function loadBrand() {
    // Portal users: find their linked client
    const { data: mcs } = await db.select('member_clients', {
      filters: [{ op: 'eq', col: 'member_id', val: member!.id }],
      limit: 1,
    })

    let clienteId: string | null = null
    if (mcs && mcs.length > 0) {
      clienteId = mcs[0].cliente_id
    } else {
      // Fallback: get first client of org
      const { data: clients } = await db.select('clientes', {
        limit: 1,
      })
      if (clients && clients.length > 0) clienteId = clients[0].id
    }

    if (!clienteId) { setLoading(false); return }

    try {
      const res = await fetch(`/api/brand/${clienteId}`)
      const json = await res.json()
      if (json.data) {
        const d = json.data
        setCliente(d)
        if (d.bio) setBio(d.bio)
        if (d.social_links) setSocialLinks(d.social_links)
        if (d.color_palette && Array.isArray(d.color_palette)) setColors(d.color_palette)
        if (d.fonts && Object.keys(d.fonts).length > 0) setFonts(d.fonts)
        if (d.brand_guidelines) setGuidelines(d.brand_guidelines)
        if (d.personas && Array.isArray(d.personas)) setPersonas(d.personas)
      }
    } catch {}
    setLoading(false)
  }

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 1500)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    )
  }

  if (!cliente) return <div className="text-center py-12 text-gray-400">Nenhum brand book encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'
  const hasBrandContent = bio || colors.length > 0 || personas.length > 0 || guidelines.tone_of_voice

  if (!hasBrandContent) {
    return (
      <div className="text-center py-16">
        <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Brand Book em construção</h2>
        <p className="text-gray-500">Sua agência está preparando o brand book. Em breve estará disponível aqui!</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: primaria }}>
          {cliente.nome?.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Book</h1>
          <p className="text-sm text-gray-500">{cliente.nome}</p>
        </div>
      </div>

      {/* Google Fonts */}
      {fonts && (
        <link
          href={`https://fonts.googleapis.com/css2?${[fonts.primary, fonts.secondary, fonts.decorative]
            .filter(f => f?.name)
            .map(f => `family=${encodeURIComponent(f.name)}:wght@${f.weight || '400'}`)
            .join('&')}&display=swap`}
          rel="stylesheet"
        />
      )}

      {/* Bio & Social */}
      {(bio || Object.values(socialLinks).some(v => v)) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Sobre o Negócio</h2>
          </div>
          {bio && <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{bio}</p>}
          {Object.values(socialLinks).some(v => v) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(socialLinks).filter(([, v]) => v).map(([key, value]) => {
                const Icon = SOCIAL_ICONS[key] || Globe
                return (
                  <a
                    key={key}
                    href={value?.startsWith('http') ? value : `https://${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="capitalize">{key}</span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Colors */}
      {colors.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Paleta de Cores</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {colors.map((color, idx) => (
              <div key={idx} className="text-center group cursor-pointer" onClick={() => copyHex(color.hex)}>
                <div
                  className="w-20 h-20 rounded-2xl shadow-lg border-2 border-white ring-1 ring-gray-200 mb-2 transition-transform group-hover:scale-105 relative"
                  style={{ backgroundColor: color.hex }}
                >
                  {copiedHex === color.hex && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700">{color.name}</p>
                <p className="text-xs text-gray-400 font-mono">{color.hex}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Typography */}
      {fonts && (fonts.primary?.name || fonts.secondary?.name) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Type className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Tipografia</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'primary', label: 'Principal', font: fonts.primary },
              { key: 'secondary', label: 'Secundária', font: fonts.secondary },
              { key: 'decorative', label: 'Decorativa', font: fonts.decorative },
            ].filter(item => item.font?.name).map(({ key, label, font }) => (
              <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-base font-semibold text-gray-800 mb-1">{font.name}</p>
                <p className="text-xs text-gray-500 mb-3">Peso: {font.weight} · {font.usage}</p>
                <p
                  className="text-xl text-gray-700 leading-relaxed"
                  style={{ fontFamily: `"${font.name}", sans-serif`, fontWeight: parseInt(font.weight) || 400 }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Guidelines */}
      {(guidelines.tone_of_voice || guidelines.dos?.some(d => d) || guidelines.donts?.some(d => d)) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Tom de Voz & Guidelines</h2>
          </div>
          {guidelines.tone_of_voice && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-sm font-medium text-amber-800 mb-1">🎤 Tom de Voz</p>
              <p className="text-gray-700">{guidelines.tone_of_voice}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guidelines.dos?.some(d => d) && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-700 mb-2">✅ Do&apos;s</p>
                <ul className="space-y-1.5">
                  {guidelines.dos.filter(d => d).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guidelines.donts?.some(d => d) && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm font-semibold text-red-700 mb-2">❌ Don&apos;ts</p>
                <ul className="space-y-1.5">
                  {guidelines.donts.filter(d => d).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {guidelines.visual_references?.some(r => r) && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">🎨 Referências Visuais</p>
              <div className="flex flex-wrap gap-2">
                {guidelines.visual_references.filter(r => r).map((ref, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
                    {ref.startsWith('http') ? (
                      <a href={ref} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        {ref.replace(/https?:\/\//, '').slice(0, 40)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Personas */}
      {personas.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Personas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map(persona => (
              <div key={persona.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {persona.name ? persona.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{persona.name}</p>
                    <p className="text-xs text-gray-500">{persona.age && `${persona.age} anos`} {persona.profession && `· ${persona.profession}`}</p>
                  </div>
                </div>
                {persona.pains && (
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-0.5">😰 Dores</p>
                    <p className="text-sm text-gray-600">{persona.pains}</p>
                  </div>
                )}
                {persona.desires && (
                  <div>
                    <p className="text-xs font-medium text-emerald-600 mb-0.5">✨ Desejos</p>
                    <p className="text-sm text-gray-600">{persona.desires}</p>
                  </div>
                )}
                {persona.behavior && (
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-0.5">🧠 Comportamento</p>
                    <p className="text-sm text-gray-600">{persona.behavior}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
