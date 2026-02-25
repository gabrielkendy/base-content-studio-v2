'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Acervo {
  id: string
  titulo: string
  slug: string
  descricao: string | null
  icone: string
  total_arquivos: number
}

interface Cliente {
  nome: string
  slug: string
  logo_url: string | null
}

export default function AcervoPortalPage() {
  const params = useParams()
  const clienteSlug = params.slug as string
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [acervos, setAcervos] = useState<Acervo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [clienteSlug])

  async function loadData() {
    try {
      const res = await fetch(`/api/public/acervos/${clienteSlug}`)
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('Cliente não encontrado')
        } else {
          setError('Erro ao carregar dados')
        }
        return
      }

      const data = await res.json()
      setCliente(data.cliente)
      setAcervos(data.acervos)
    } catch (err) {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl mx-auto mb-4" />
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{error}</h1>
          <Link href="/" className="text-blue-500 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {cliente?.logo_url ? (
              <img 
                src={cliente.logo_url} 
                alt={cliente?.nome} 
                className="w-12 h-12 rounded-xl object-contain"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                {cliente?.nome?.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800">{cliente?.nome}</h1>
              <p className="text-sm text-slate-500">Acervo Digital</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {acervos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📂</div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Nenhum acervo disponível</h2>
            <p className="text-slate-500">O acervo digital ainda está sendo preparado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {acervos.map(acervo => (
              <Link 
                key={acervo.id} 
                href={`/cliente/${clienteSlug}/acervo/${acervo.slug}`}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 hover:border-blue-200 hover:-translate-y-1">
                  {/* Ícone grande */}
                  <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-6xl group-hover:scale-110 transition-transform">
                      {acervo.icone}
                    </span>
                  </div>
                  
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                      {acervo.titulo}
                    </h3>
                    {acervo.descricao && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                        {acervo.descricao}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {acervo.total_arquivos} {acervo.total_arquivos === 1 ? 'arquivo' : 'arquivos'}
                      </span>
                      <span className="text-xs text-blue-500 font-medium group-hover:underline">
                        Ver arquivos →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-slate-400">
        Powered by BASE Content Studio
      </footer>
    </div>
  )
}
