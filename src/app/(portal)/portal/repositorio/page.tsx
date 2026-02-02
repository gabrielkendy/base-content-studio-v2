'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import {
  Upload, Download, Eye,
  Image as ImageIcon, Video, FileText, File, Music,
  FolderOpen, Folder, ChevronRight, Home,
  Grid3X3, List, Search, X,
} from 'lucide-react'
import type { Cliente } from '@/types/database'

interface ClientAsset {
  id: string
  org_id: string
  cliente_id: string
  folder: string
  filename: string
  file_url: string
  file_type: string | null
  file_size: number | null
  thumbnail_url: string | null
  tags: string[]
  description: string | null
  created_at: string
}

const DEFAULT_FOLDERS = ['Logos', 'Fontes', 'Paleta', 'Fotos', 'Vídeos', 'Documentos', 'Briefings']

const FOLDER_ICONS: Record<string, string> = {
  'Logos': '🎨',
  'Fontes': '🔤',
  'Paleta': '🎯',
  'Fotos': '📸',
  'Vídeos': '🎬',
  'Documentos': '📄',
  'Briefings': '📋',
}

export default function PortalRepositorioPage() {
  const { org, member, user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [assets, setAssets] = useState<ClientAsset[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [currentFolder, setCurrentFolder] = useState('/')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragging, setDragging] = useState(false)
  const [previewAsset, setPreviewAsset] = useState<ClientAsset | null>(null)

  useEffect(() => {
    if (!org || !member) return
    loadCliente()
  }, [org, member])

  useEffect(() => {
    if (cliente) loadAssets()
  }, [cliente, currentFolder, searchQuery])

  async function loadCliente() {
    // Get the client linked to this portal member
    const { data: mcs } = await db.select('member_clients', {
      filters: [
        { op: 'eq', col: 'member_id', val: member!.id },
        { op: 'eq', col: 'org_id', val: org!.id },
      ],
      limit: 1,
    })

    if (!mcs || mcs.length === 0) { setLoading(false); return }

    const { data: c } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'id', val: mcs[0].cliente_id }],
      single: true,
    })

    if (!c) { setLoading(false); return }
    setCliente(c)
  }

  async function loadAssets() {
    if (!cliente) return
    setLoading(true)
    try {
      const url = new URL('/api/assets/list', window.location.origin)
      url.searchParams.set('clienteId', cliente.id)
      url.searchParams.set('folder', currentFolder)
      if (searchQuery) url.searchParams.set('search', searchQuery)

      const res = await fetch(url.toString())
      const json = await res.json()
      setAssets(json.data || [])

      const discoveredFolders = json.folders || []
      const allFolders = currentFolder === '/'
        ? [...new Set([...DEFAULT_FOLDERS, ...discoveredFolders])]
        : discoveredFolders
      setFolders(allFolders)
    } catch (err) {
      console.error('Load assets error:', err)
    }
    setLoading(false)
  }

  async function handleUpload(files: FileList | File[]) {
    if (!files.length || !cliente || !org) return
    setUploading(true)

    const formData = new FormData()
    formData.append('clienteId', cliente.id)
    formData.append('orgId', org.id)
    formData.append('folder', currentFolder)
    if (user?.id) formData.append('userId', user.id)

    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i])
    }

    try {
      const res = await fetch('/api/assets/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.error) {
        toast('Erro no upload: ' + json.error, 'error')
      } else {
        toast(`${json.data?.length || 0} arquivo(s) enviado(s)!`, 'success')
      }
    } catch {
      toast('Erro ao enviar arquivos', 'error')
    }

    await loadAssets()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files)
  }, [cliente, org, currentFolder])

  function navigateToFolder(folderName: string) {
    setCurrentFolder(currentFolder === '/' ? `/${folderName}` : `${currentFolder}/${folderName}`)
    setSearchQuery('')
  }

  const breadcrumbs = currentFolder.split('/').filter(Boolean)

  const getFileIcon = (type: string | null, name: string) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-400" />
    if (type?.startsWith('video/')) return <Video className="w-6 h-6 text-purple-400" />
    if (type?.startsWith('audio/')) return <Music className="w-6 h-6 text-green-400" />
    if (type === 'application/pdf') return <FileText className="w-6 h-6 text-red-400" />
    return <File className="w-6 h-6 text-gray-400" />
  }

  const isImage = (type: string | null) => type?.startsWith('image/')
  const isVideo = (type: string | null) => type?.startsWith('video/')
  const isPdf = (type: string | null) => type === 'application/pdf'

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const getExtension = (name: string) => name.split('.').pop()?.toUpperCase() || ''

  if (loading && !cliente) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum cliente vinculado à sua conta</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📁 Repositório</h1>
        <p className="text-sm text-gray-500">{cliente.nome} · Seus arquivos e assets</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
        />
        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Enviando...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Enviar Arquivos</>
          )}
        </Button>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        <button onClick={() => setCurrentFolder('/')} className="flex items-center gap-1 text-gray-500 hover:text-gray-900">
          <Home className="w-4 h-4" /> Repositório
        </button>
        {breadcrumbs.map((part, i) => (
          <div key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <button
              onClick={() => setCurrentFolder('/' + breadcrumbs.slice(0, i + 1).join('/'))}
              className={i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}
            >
              {part}
            </button>
          </div>
        ))}
      </div>

      {/* Content with drag zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl transition-all ${dragging ? 'ring-2 ring-blue-500 ring-dashed bg-blue-50/50' : ''}`}
      >
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-blue-50/80 backdrop-blur-sm border-2 border-dashed border-blue-400">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-600 font-semibold">Solte os arquivos aqui</p>
            </div>
          </div>
        )}

        {/* Folders */}
        {folders.length > 0 && !searchQuery && (
          <div className={`mb-4 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3' : 'space-y-1'}`}>
            {folders.map((f) => (
              viewMode === 'grid' ? (
                <button
                  key={f}
                  onClick={() => navigateToFolder(f)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-md bg-white transition-all group"
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform">
                    {FOLDER_ICONS[f] || '📁'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate w-full text-center">{f}</span>
                </button>
              ) : (
                <button
                  key={f}
                  onClick={() => navigateToFolder(f)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Folder className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">{f}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </button>
              )
            ))}
          </div>
        )}

        {/* Files */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : assets.length === 0 && folders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">
                {searchQuery ? 'Nenhum resultado' : 'Pasta vazia'}
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                {searchQuery ? `Nada encontrado para "${searchQuery}"` : 'Arraste arquivos ou clique para enviar'}
              </p>
              {!searchQuery && (
                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Enviar Arquivos
                </Button>
              )}
            </CardContent>
          </Card>
        ) : assets.length === 0 && folders.length > 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            {currentFolder === '/' ? 'Escolha uma pasta ou envie arquivos' : 'Nenhum arquivo nesta pasta'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group rounded-xl border border-gray-100 overflow-hidden bg-white hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setPreviewAsset(asset)}
              >
                <div className="aspect-square relative bg-gray-50">
                  {isImage(asset.file_type) ? (
                    <img src={asset.thumbnail_url || asset.file_url} alt={asset.filename} className="w-full h-full object-cover" loading="lazy" />
                  ) : isVideo(asset.file_type) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Video className="w-10 h-10 text-white/60" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      {getFileIcon(asset.file_type, asset.filename)}
                      <span className="text-xs text-gray-400 uppercase">{getExtension(asset.filename)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <span className="p-2 bg-white rounded-full shadow-lg"><Eye className="w-4 h-4 text-gray-700" /></span>
                    <a href={asset.file_url} download={asset.filename} onClick={(e) => e.stopPropagation()} className="p-2 bg-white rounded-full shadow-lg">
                      <Download className="w-4 h-4 text-gray-700" />
                    </a>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-gray-700 truncate">{asset.filename}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{formatSize(asset.file_size)}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(asset.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer group" onClick={() => setPreviewAsset(asset)}>
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {isImage(asset.file_type) ? (
                    <img src={asset.thumbnail_url || asset.file_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : getFileIcon(asset.file_type, asset.filename)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{asset.filename}</p>
                  <span className="text-xs text-gray-400">{formatSize(asset.file_size)} · {formatDate(asset.created_at)}</span>
                </div>
                <a href={asset.file_url} download={asset.filename} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100">
                  <Download className="w-4 h-4 text-gray-500" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal open={!!previewAsset} onClose={() => setPreviewAsset(null)} title={previewAsset?.filename} size="xl">
        {previewAsset && (
          <div className="space-y-4">
            <div className="flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden min-h-[300px] max-h-[60vh]">
              {isImage(previewAsset.file_type) ? (
                <img src={previewAsset.file_url} alt={previewAsset.filename} className="max-w-full max-h-[60vh] object-contain" />
              ) : isVideo(previewAsset.file_type) ? (
                <video src={previewAsset.file_url} controls className="max-w-full max-h-[60vh]" />
              ) : isPdf(previewAsset.file_type) ? (
                <iframe src={previewAsset.file_url} className="w-full h-[60vh] rounded-lg" />
              ) : (
                <div className="text-center py-12">
                  {getFileIcon(previewAsset.file_type, previewAsset.filename)}
                  <p className="mt-4 text-sm text-gray-500">Preview não disponível</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Tamanho:</span> <span className="text-gray-700">{formatSize(previewAsset.file_size)}</span></div>
              <div><span className="text-gray-400">Tipo:</span> <span className="text-gray-700">{previewAsset.file_type || 'Desconhecido'}</span></div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <a href={previewAsset.file_url} download={previewAsset.filename}>
                <Button variant="primary"><Download className="w-4 h-4 mr-2" /> Download</Button>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
