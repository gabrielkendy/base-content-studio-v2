'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { Input, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, Upload, Trash2, Download, Eye, X,
  Image as ImageIcon, Video, FileText, File, Music,
  FolderOpen, FolderPlus, Folder, ChevronRight, Home,
  Grid3X3, List, Search, Tag, Move, Edit3, MoreVertical,
} from 'lucide-react'
import Link from 'next/link'
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
  uploaded_by: string | null
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

export default function RepositorioPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org, member } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [assets, setAssets] = useState<ClientAsset[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [currentFolder, setCurrentFolder] = useState('/')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragging, setDragging] = useState(false)

  // Modals
  const [previewAsset, setPreviewAsset] = useState<ClientAsset | null>(null)
  const [editAsset, setEditAsset] = useState<ClientAsset | null>(null)
  const [moveAsset, setMoveAsset] = useState<ClientAsset | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [moveTarget, setMoveTarget] = useState('/')
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!org) return
    loadCliente()
  }, [org, slug])

  useEffect(() => {
    if (cliente) loadAssets()
  }, [cliente, currentFolder, searchQuery])

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

      // Merge default folders with discovered folders
      setFolders(json.folders || [])
    } catch (err) {
      console.error('Load assets error:', err)
    }
    setLoading(false)
  }

  async function handleUpload(files: FileList | File[]) {
    if (!files.length || !cliente || !org) return

    setUploading(true)
    setUploadProgress(0)

    const validFiles = Array.from(files)

    try {
      // Step 1: Get presigned upload URLs from our API
      setUploadProgress(5)
      const presignRes = await fetch('/api/assets/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: validFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
          clienteId: cliente.id,
          orgId: org.id,
          folder: currentFolder,
        }),
      })
      const presignData = await presignRes.json()

      if (!presignRes.ok || !presignData.urls?.length) {
        toast('Erro ao preparar upload: ' + (presignData.error || 'Tente novamente'), 'error')
        setUploading(false)
        return
      }

      // Step 2: Upload each file directly to Supabase Storage (bypasses Vercel 4.5MB limit)
      const successUploads = []
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        const urlInfo = presignData.urls[i]
        if (!urlInfo) continue

        setUploadProgress(10 + Math.round((i / validFiles.length) * 70))

        try {
          const uploadRes = await fetch(urlInfo.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          })

          if (uploadRes.ok) {
            successUploads.push({
              orgId: org.id,
              clienteId: cliente.id,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              publicUrl: urlInfo.publicUrl,
              thumbnailUrl: urlInfo.thumbnailUrl,
              folder: urlInfo.folder,
            })
          } else {
            console.error(`Upload failed for ${file.name}:`, await uploadRes.text())
          }
        } catch (uploadErr) {
          console.error(`Upload error for ${file.name}:`, uploadErr)
        }
      }

      // Step 3: Register uploaded files in the database
      if (successUploads.length > 0) {
        setUploadProgress(85)
        const registerRes = await fetch('/api/assets/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets: successUploads }),
        })
        const registerData = await registerRes.json()
        const count = registerData.data?.length || successUploads.length
        toast(`✅ ${count} arquivo(s) enviado(s) com sucesso!`, 'success')
      }

      if (successUploads.length < validFiles.length) {
        const failed = validFiles.length - successUploads.length
        toast(`⚠️ ${failed} arquivo(s) falharam no upload`, 'error')
      }
    } catch (err) {
      console.error('Upload flow error:', err)
      toast('Erro ao enviar arquivos', 'error')
    }

    setUploadProgress(100)
    await loadAssets()
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(asset: ClientAsset) {
    if (!confirm(`Excluir "${asset.filename}"?`)) return

    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast('Arquivo excluído', 'success')
        await loadAssets()
        setPreviewAsset(null)
      } else {
        toast('Erro ao excluir', 'error')
      }
    } catch {
      toast('Erro ao excluir', 'error')
    }
  }

  async function handleUpdateAsset() {
    if (!editAsset) return
    try {
      const res = await fetch(`/api/assets/${editAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
          description: editDesc,
        }),
      })
      if (res.ok) {
        toast('Arquivo atualizado', 'success')
        setEditAsset(null)
        await loadAssets()
      }
    } catch {
      toast('Erro ao atualizar', 'error')
    }
  }

  async function handleMoveAsset() {
    if (!moveAsset) return
    try {
      const res = await fetch(`/api/assets/${moveAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: moveTarget }),
      })
      if (res.ok) {
        toast('Arquivo movido', 'success')
        setMoveAsset(null)
        await loadAssets()
      }
    } catch {
      toast('Erro ao mover', 'error')
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim() || !cliente || !org) return

    try {
      const res = await fetch('/api/assets/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: newFolderName,
          parentFolder: currentFolder,
          clienteId: cliente.id,
          orgId: org.id,
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast(`Erro: ${json.error}`, 'error')
        return
      }
      if (json.folder) {
        toast(json.existing ? `Pasta "${json.name}" já existe` : `Pasta "${json.name}" criada`, json.existing ? 'info' : 'success')
        setNewFolderOpen(false)
        setNewFolderName('')
        await loadAssets()
      }
    } catch {
      toast('Erro ao criar pasta', 'error')
    }
  }

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const files = e.dataTransfer.files
    if (files.length) handleUpload(files)
  }, [cliente, org, currentFolder])

  // Navigation - with duplicate prevention
  function navigateToFolder(folderName: string) {
    // Prevent duplicate navigation (clicking same folder twice)
    const targetPath = currentFolder === '/' 
      ? `/${folderName}` 
      : `${currentFolder}/${folderName}`
    
    // Check if we're already in this folder (prevents double-click issues)
    if (currentFolder === targetPath) {
      console.log('Already in folder:', targetPath)
      return
    }
    
    // Check if folder name is already the last part of current path (prevent duplication)
    const currentParts = currentFolder.split('/').filter(Boolean)
    if (currentParts.length > 0 && currentParts[currentParts.length - 1] === folderName) {
      console.log('Folder already in path:', folderName)
      return
    }
    
    setCurrentFolder(targetPath)
    setSearchQuery('')
  }

  function navigateUp() {
    const parts = currentFolder.split('/').filter(Boolean)
    parts.pop()
    setCurrentFolder(parts.length ? `/${parts.join('/')}` : '/')
  }

  const breadcrumbs = currentFolder.split('/').filter(Boolean)

  // File helpers
  const getFileIcon = (type: string | null, name: string) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-400" />
    if (type?.startsWith('video/')) return <Video className="w-6 h-6 text-purple-400" />
    if (type?.startsWith('audio/')) return <Music className="w-6 h-6 text-green-400" />
    if (type === 'application/pdf') return <FileText className="w-6 h-6 text-red-400" />
    if (/\.(doc|docx)$/i.test(name)) return <FileText className="w-6 h-6 text-blue-500" />
    if (/\.(xls|xlsx)$/i.test(name)) return <FileText className="w-6 h-6 text-green-500" />
    if (/\.(ppt|pptx)$/i.test(name)) return <FileText className="w-6 h-6 text-orange-500" />
    if (/\.(zip|rar|7z)$/i.test(name)) return <File className="w-6 h-6 text-yellow-500" />
    if (/\.(ai|psd|sketch|fig)$/i.test(name)) return <ImageIcon className="w-6 h-6 text-pink-500" />
    return <File className="w-6 h-6 text-zinc-400" />
  }

  const isImage = (type: string | null) => type?.startsWith('image/')
  const isVideo = (type: string | null) => type?.startsWith('video/')
  const isPdf = (type: string | null) => type === 'application/pdf'

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

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

  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/clientes/${slug}`} className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="md" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900">Repositório</h1>
          <p className="text-sm text-zinc-500">{cliente.nome}</p>
        </div>
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
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Enviando... {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" /> Enviar Arquivos
            </>
          )}
        </Button>

        <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
          <FolderPlus className="w-4 h-4 mr-2" /> Nova Pasta
        </Button>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto">
        <button
          onClick={() => setCurrentFolder('/')}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 shrink-0"
        >
          <Home className="w-4 h-4" />
          <span>Repositório</span>
        </button>
        {breadcrumbs.map((part, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3 text-zinc-300" />
            <button
              onClick={() => setCurrentFolder('/' + breadcrumbs.slice(0, i + 1).join('/'))}
              className={`hover:text-zinc-900 ${i === breadcrumbs.length - 1 ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}
            >
              {part}
            </button>
          </div>
        ))}
      </div>

      {/* Drag & Drop Zone + Content */}
      <div
        ref={dropZoneRef}
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
              <p className="text-sm text-blue-400">para fazer upload em {currentFolder === '/' ? 'Repositório' : breadcrumbs.at(-1)}</p>
            </div>
          </div>
        )}

        {/* Folders */}
        {folders.length > 0 && !searchQuery && (
          <div className={`mb-4 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-1'}`}>
            {folders.map((f) => (
              viewMode === 'grid' ? (
                <button
                  key={f}
                  onClick={() => navigateToFolder(f)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-100 hover:border-zinc-300 hover:shadow-md bg-white transition-all group"
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform">
                    {FOLDER_ICONS[f] || '📁'}
                  </div>
                  <span className="text-sm font-medium text-zinc-700 truncate w-full text-center">{f}</span>
                </button>
              ) : (
                <button
                  key={f}
                  onClick={() => navigateToFolder(f)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 text-left transition-colors"
                >
                  <Folder className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-zinc-700">{f}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-300 ml-auto" />
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
          /* Empty state */
          <Card>
            <CardContent className="py-16 text-center">
              <FolderOpen className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                {searchQuery ? 'Nenhum resultado' : 'Pasta vazia'}
              </h3>
              <p className="text-sm text-zinc-400 mb-6">
                {searchQuery
                  ? `Nenhum arquivo encontrado para "${searchQuery}"`
                  : 'Arraste arquivos aqui ou clique para enviar'
                }
              </p>
              {!searchQuery && (
                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Enviar Arquivos
                </Button>
              )}
            </CardContent>
          </Card>
        ) : assets.length === 0 && folders.length > 0 ? (
          /* Has folders but no files in current folder */
          <div className="text-center py-8 text-sm text-zinc-400">
            {currentFolder === '/' ? 'Escolha uma pasta ou envie arquivos' : 'Nenhum arquivo nesta pasta'}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group rounded-xl border border-zinc-100 overflow-hidden bg-white hover:shadow-lg hover:border-zinc-200 transition-all cursor-pointer relative"
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square relative bg-zinc-50"
                  onClick={() => setPreviewAsset(asset)}
                >
                  {isImage(asset.file_type) ? (
                    <img
                      src={asset.file_url}
                      alt={asset.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center'); }}
                    />
                  ) : isVideo(asset.file_type) ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Video className="w-10 h-10 text-white/60" />
                      <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {getExtension(asset.filename)}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      {getFileIcon(asset.file_type, asset.filename)}
                      <span className="text-xs text-zinc-400 uppercase font-medium">
                        {getExtension(asset.filename)}
                      </span>
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset) }}
                      className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-zinc-700" />
                    </button>
                    <a
                      href={asset.file_url}
                      download={asset.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-zinc-700" />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset) }}
                      className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-zinc-700 truncate" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-zinc-400">{formatSize(asset.file_size)}</span>
                    <span className="text-[10px] text-zinc-400">{formatDate(asset.created_at)}</span>
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {asset.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {asset.tags.length > 2 && (
                        <span className="text-[9px] text-zinc-400">+{asset.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer group"
                onClick={() => setPreviewAsset(asset)}
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {isImage(asset.file_type) ? (
                    <img src={asset.file_url} alt="" className="w-full h-full object-cover rounded-lg" onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : (
                    getFileIcon(asset.file_type, asset.filename)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700 truncate">{asset.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">{formatSize(asset.file_size)}</span>
                    <span className="text-xs text-zinc-300">·</span>
                    <span className="text-xs text-zinc-400">{formatDate(asset.created_at)}</span>
                    {asset.tags?.length > 0 && (
                      <>
                        <span className="text-xs text-zinc-300">·</span>
                        {asset.tags.slice(0, 3).map(t => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={asset.file_url}
                    download={asset.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-zinc-100"
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditAsset(asset); setEditTags(asset.tags?.join(', ') || ''); setEditDesc(asset.description || '') }}
                    className="p-1.5 rounded-lg hover:bg-zinc-100"
                  >
                    <Edit3 className="w-4 h-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMoveAsset(asset); setMoveTarget('/') }}
                    className="p-1.5 rounded-lg hover:bg-zinc-100"
                  >
                    <Move className="w-4 h-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(asset) }}
                    className="p-1.5 rounded-lg hover:bg-zinc-100"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal open={!!previewAsset} onClose={() => setPreviewAsset(null)} title={previewAsset?.filename} size="xl">
        {previewAsset && (
          <div className="space-y-4">
            {/* Preview content */}
            <div className="flex items-center justify-center bg-zinc-50 rounded-xl overflow-hidden min-h-[300px] max-h-[60vh]">
              {isImage(previewAsset.file_type) ? (
                <img src={previewAsset.file_url} alt={previewAsset.filename} className="max-w-full max-h-[60vh] object-contain" />
              ) : isVideo(previewAsset.file_type) ? (
                <video src={previewAsset.file_url} controls className="max-w-full max-h-[60vh]" />
              ) : isPdf(previewAsset.file_type) ? (
                <iframe src={previewAsset.file_url} className="w-full h-[60vh] rounded-lg" />
              ) : (
                <div className="text-center py-12">
                  {getFileIcon(previewAsset.file_type, previewAsset.filename)}
                  <p className="mt-4 text-sm text-zinc-500">Preview não disponível para este tipo de arquivo</p>
                  <a href={previewAsset.file_url} download={previewAsset.filename}>
                    <Button variant="primary" className="mt-3">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* File info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Tamanho:</span>
                <span className="ml-2 text-zinc-700">{formatSize(previewAsset.file_size)}</span>
              </div>
              <div>
                <span className="text-zinc-400">Tipo:</span>
                <span className="ml-2 text-zinc-700">{previewAsset.file_type || 'Desconhecido'}</span>
              </div>
              <div>
                <span className="text-zinc-400">Enviado em:</span>
                <span className="ml-2 text-zinc-700">{formatDate(previewAsset.created_at)}</span>
              </div>
              <div>
                <span className="text-zinc-400">Pasta:</span>
                <span className="ml-2 text-zinc-700">{previewAsset.folder}</span>
              </div>
              {previewAsset.description && (
                <div className="col-span-2">
                  <span className="text-zinc-400">Descrição:</span>
                  <span className="ml-2 text-zinc-700">{previewAsset.description}</span>
                </div>
              )}
              {previewAsset.tags?.length > 0 && (
                <div className="col-span-2 flex items-center gap-1 flex-wrap">
                  <span className="text-zinc-400">Tags:</span>
                  {previewAsset.tags.map(t => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
              <a href={previewAsset.file_url} download={previewAsset.filename}>
                <Button variant="primary">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </a>
              <Button variant="outline" onClick={() => {
                setEditAsset(previewAsset)
                setEditTags(previewAsset.tags?.join(', ') || '')
                setEditDesc(previewAsset.description || '')
                setPreviewAsset(null)
              }}>
                <Tag className="w-4 h-4 mr-2" /> Editar Tags
              </Button>
              <Button variant="outline" onClick={() => {
                setMoveAsset(previewAsset)
                setMoveTarget('/')
                setPreviewAsset(null)
              }}>
                <Move className="w-4 h-4 mr-2" /> Mover
              </Button>
              <Button variant="ghost" onClick={() => { handleDelete(previewAsset) }}>
                <Trash2 className="w-4 h-4 mr-2 text-red-500" /> Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Tags/Description Modal */}
      <Modal open={!!editAsset} onClose={() => setEditAsset(null)} title="Editar Arquivo" size="sm">
        {editAsset && (
          <div className="space-y-4">
            <div>
              <Label>Arquivo</Label>
              <p className="text-sm text-zinc-600">{editAsset.filename}</p>
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="logo, marca, horizontal..."
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição do arquivo..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-h-[80px] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditAsset(null)}>Cancelar</Button>
              <Button variant="primary" onClick={handleUpdateAsset}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Move Modal */}
      <Modal open={!!moveAsset} onClose={() => setMoveAsset(null)} title="Mover Arquivo" size="sm">
        {moveAsset && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">Mover &quot;{moveAsset.filename}&quot; para:</p>
            <div className="space-y-1">
              <button
                onClick={() => setMoveTarget('/')}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm ${moveTarget === '/' ? 'bg-blue-50 text-blue-600' : 'hover:bg-zinc-50 text-zinc-600'}`}
              >
                <Home className="w-4 h-4" /> Raiz
              </button>
              {DEFAULT_FOLDERS.map(f => {
                const path = `/${f}`
                return (
                  <button
                    key={f}
                    onClick={() => setMoveTarget(path)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm ${moveTarget === path ? 'bg-blue-50 text-blue-600' : 'hover:bg-zinc-50 text-zinc-600'}`}
                  >
                    <Folder className="w-4 h-4" /> {f}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setMoveAsset(null)}>Cancelar</Button>
              <Button variant="primary" onClick={handleMoveAsset}>Mover</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Folder Modal */}
      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="Nova Pasta" size="sm">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <Label>Nome da pasta</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Campanha Natal"
              autoFocus
              required
            />
          </div>
          <p className="text-xs text-zinc-400">
            Será criada em: {currentFolder === '/' ? '/' : currentFolder + '/'}{newFolderName || '...'}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">
              <FolderPlus className="w-4 h-4 mr-2" /> Criar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
