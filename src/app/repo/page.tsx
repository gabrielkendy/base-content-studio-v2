'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Image as ImageIcon, Video, File, Package, ExternalLink } from 'lucide-react'
import type { Cliente } from '@/types/database'

interface RepoFile {
  name: string
  id: string
  created_at: string
  metadata: { size: number; mimetype: string }
}

function RepoContent() {
  const searchParams = useSearchParams()
  const clienteSlug = searchParams.get('cliente')
  const clienteId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [files, setFiles] = useState<RepoFile[]>([])
  const [invalid, setInvalid] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!clienteSlug && !clienteId) { setInvalid(true); setLoading(false); return }
    loadData()
  }, [clienteSlug, clienteId])

  async function loadData() {
    // Buscar cliente
    const filters: any[] = []
    if (clienteSlug) filters.push({ op: 'eq', col: 'slug', val: clienteSlug })
    if (clienteId) filters.push({ op: 'eq', col: 'id', val: clienteId })

    const { data: cl } = await db.select('clientes', { filters, single: true })
    if (!cl) { setInvalid(true); setLoading(false); return }

    setCliente(cl)

    // Listar arquivos do repositório
    const path = `${cl.org_id}/${cl.id}/repositorio`
    const { data: fileList } = await supabase.storage.from('media').list(path, {
      sortBy: { column: 'created_at', order: 'desc' }
    })

    if (fileList) {
      setFiles(fileList.filter(f => f.name !== '.emptyFolderPlaceholder') as unknown as RepoFile[])
    }
    setLoading(false)
  }

  function getPublicUrl(fileName: string) {
    if (!cliente) return ''
    return supabase.storage.from('media').getPublicUrl(`${cliente.org_id}/${cliente.id}/repositorio/${fileName}`).data.publicUrl
  }

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
  const isVideo = (name: string) => /\.(mp4|webm|mov)$/i.test(name)

  async function downloadFile(fileName: string) {
    const url = getPublicUrl(fileName)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const dlUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(dlUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  async function downloadAll() {
    setDownloading(true)
    for (const file of files) {
      await downloadFile(file.name)
      await new Promise(r => setTimeout(r, 500))
    }
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (invalid || !cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-xl font-bold text-gray-900">Repositório não encontrado</h2>
          <p className="text-gray-500">Este link pode ser inválido. Entre em contato com a equipe.</p>
        </div>
      </div>
    )
  }

  const primaria = cliente.cores?.primaria || '#6366F1'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center py-8 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: primaria }}
          >
            {cliente.nome.charAt(0)}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{cliente.nome}</h1>
          <p className="text-gray-500">Repositório de Arquivos</p>
        </div>

        {files.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">Nenhum arquivo ainda</h3>
              <p className="text-sm text-gray-400 mt-1">Os arquivos serão adicionados pela equipe</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{files.length} arquivo(s)</p>
              <Button onClick={downloadAll} disabled={downloading} className="bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                {downloading ? 'Baixando...' : 'Baixar Todos'}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map(file => {
                const url = getPublicUrl(file.name)
                return (
                  <Card key={file.name} className="overflow-hidden hover:shadow-md transition-shadow group">
                    {isImage(file.name) ? (
                      <img src={url} alt={file.name} className="w-full h-40 object-cover" />
                    ) : isVideo(file.name) ? (
                      <video src={url} className="w-full h-40 object-cover bg-black" />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 flex flex-col items-center justify-center">
                        <File className="w-10 h-10 text-gray-300 mb-1" />
                        <span className="text-[10px] text-gray-400 uppercase">{file.name.split('.').pop()}</span>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs text-gray-700 font-medium truncate mb-2" title={file.name}>{file.name}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => downloadFile(file.name)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600 transition-colors"
                        >
                          <Download className="w-3 h-3" /> Baixar
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        <div className="text-center py-8">
          <p className="text-xs text-gray-400">BASE Content Studio · Repositório de arquivos</p>
        </div>
      </div>
    </div>
  )
}

export default function RepoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    }>
      <RepoContent />
    </Suspense>
  )
}
