'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, X, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, File } from 'lucide-react'

interface Arquivo {
  id: string
  nome: string
  tipo: string
  tamanho: number
  url_original: string
  url_thumbnail: string | null
  url_download: string
  ordem: number
}

interface Acervo {
  id: string
  titulo: string
  slug: string
  descricao: string | null
  icone: string
  total_arquivos: number
  arquivos: Arquivo[]
}

interface Cliente {
  nome: string
  slug: string
  logo_url: string | null
}

export default function AcervoDetalhePage() {
  const params = useParams()
  const clienteSlug = params.slug as string
  const acervoSlug = params.acervoSlug as string
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [acervo, setAcervo] = useState<Acervo | null>(null)
  const [driveUrl, setDriveUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Preview modal
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [clienteSlug, acervoSlug])

  async function loadData() {
    try {
      const res = await fetch(`/api/public/acervos/${clienteSlug}/${acervoSlug}`)
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('Acervo não encontrado')
        } else {
          setError('Erro ao carregar dados')
        }
        return
      }

      const data = await res.json()
      setCliente(data.cliente)
      setAcervo(data.acervo)
      setDriveUrl(data.acervo?.drive_folder_url || null)
    } catch (err) {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function isImage(tipo: string): boolean {
    return tipo?.startsWith('image/')
  }

  function isPDF(tipo: string): boolean {
    return tipo === 'application/pdf'
  }

  function getFileIcon(tipo: string) {
    if (isImage(tipo)) return <ImageIcon className="w-8 h-8 text-blue-500" />
    if (isPDF(tipo)) return <FileText className="w-8 h-8 text-red-500" />
    return <File className="w-8 h-8 text-slate-400" />
  }

  function openPreview(index: number) {
    setPreviewIndex(index)
  }

  function closePreview() {
    setPreviewIndex(null)
  }

  function prevPreview() {
    if (previewIndex === null || !acervo) return
    setPreviewIndex(previewIndex > 0 ? previewIndex - 1 : acervo.arquivos.length - 1)
  }

  function nextPreview() {
    if (previewIndex === null || !acervo) return
    setPreviewIndex(previewIndex < acervo.arquivos.length - 1 ? previewIndex + 1 : 0)
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (previewIndex === null) return
      if (e.key === 'Escape') closePreview()
      if (e.key === 'ArrowLeft') prevPreview()
      if (e.key === 'ArrowRight') nextPreview()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewIndex])

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
          <Link href={`/cliente/${clienteSlug}/acervo`} className="text-blue-500 hover:underline">
            ← Voltar ao acervo
          </Link>
        </div>
      </div>
    )
  }

  const currentFile = previewIndex !== null ? acervo?.arquivos[previewIndex] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href={`/cliente/${clienteSlug}/acervo`}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            
            <span className="text-4xl">{acervo?.icone}</span>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{acervo?.titulo}</h1>
              <p className="text-sm text-slate-500">
                {cliente?.nome} • {acervo?.arquivos.length} arquivos
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Descrição */}
      {acervo?.descricao && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <p className="text-slate-600 bg-white rounded-xl p-4 shadow-sm border">
            {acervo.descricao}
          </p>
        </div>
      )}

      {/* Grid de arquivos */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!acervo?.arquivos.length ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-5xl mb-4">{driveUrl ? '📁' : '📭'}</div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              {driveUrl ? 'Arquivos no Google Drive' : 'Nenhum arquivo'}
            </h2>
            <p className="text-slate-500 mb-6">
              {driveUrl 
                ? 'Clique no botão abaixo para acessar os arquivos' 
                : 'Este acervo ainda não possui arquivos.'}
            </p>
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm6.804 14.544l-3.6 6.24H8.796l3.6-6.24h6.408zm-7.2-10.08l3.6 6.24H5.196l3.6-6.24h2.808zm.792 6.24l3.6 6.24h-7.2l3.6-6.24z"/>
                </svg>
                Abrir no Google Drive
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {acervo.arquivos.map((arquivo, index) => (
              <div
                key={arquivo.id}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-slate-100 hover:border-blue-200"
              >
                {/* Preview */}
                <div 
                  className="aspect-square bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden"
                  onClick={() => openPreview(index)}
                >
                  {isImage(arquivo.tipo) ? (
                    <img
                      src={arquivo.url_thumbnail || arquivo.url_original}
                      alt={arquivo.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      {getFileIcon(arquivo.tipo)}
                      <span className="text-xs text-slate-400 text-center line-clamp-1">
                        {arquivo.tipo?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-700 truncate mb-1" title={arquivo.nome}>
                    {arquivo.nome}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {formatFileSize(arquivo.tamanho)}
                    </span>
                    <a
                      href={arquivo.url_download}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Baixar"
                      onClick={e => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Preview */}
      {previewIndex !== null && currentFile && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closePreview}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={closePreview}
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation */}
          {acervo && acervo.arquivos.length > 1 && (
            <>
              <button 
                className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
                onClick={e => { e.stopPropagation(); prevPreview() }}
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button 
                className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
                onClick={e => { e.stopPropagation(); nextPreview() }}
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Content */}
          <div 
            className="max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            {isImage(currentFile.tipo) ? (
              <img
                src={currentFile.url_original}
                alt={currentFile.nome}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            ) : isPDF(currentFile.tipo) ? (
              <iframe
                src={currentFile.url_original}
                className="w-[90vw] h-[80vh] bg-white rounded-lg"
                title={currentFile.nome}
              />
            ) : (
              <div className="bg-white p-8 rounded-xl text-center">
                {getFileIcon(currentFile.tipo)}
                <p className="text-lg font-medium mt-4">{currentFile.nome}</p>
                <p className="text-slate-500">{formatFileSize(currentFile.tamanho)}</p>
              </div>
            )}

            {/* File info */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-white/70 text-sm">
                {currentFile.nome}
              </span>
              <a
                href={currentFile.url_download}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Baixar
              </a>
            </div>

            {/* Counter */}
            <span className="text-white/50 text-sm mt-2">
              {previewIndex + 1} / {acervo?.arquivos.length}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-slate-400">
        Powered by BASE Content Studio
      </footer>
    </div>
  )
}
