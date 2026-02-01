'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Download, Image, Film } from 'lucide-react'

interface MediaUploadProps {
  orgId?: string
  conteudoId?: string
  existingUrls: string[]
  onUpdate?: (urls: string[]) => void
  onUpload?: (urls: string[]) => void
  maxFiles?: number
}

export function MediaUpload({ orgId, conteudoId, existingUrls, onUpdate, onUpload, maxFiles }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [urls, setUrls] = useState<string[]>(existingUrls || [])
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const notify = (newUrls: string[]) => {
    if (onUpdate) onUpdate(newUrls)
    if (onUpload) onUpload(newUrls)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    if (maxFiles && urls.length + files.length > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos`)
      return
    }

    setUploading(true)
    const newUrls: string[] = [...urls]
    const folder = orgId && conteudoId ? `${orgId}/${conteudoId}` : `uploads/${Date.now()}`

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (error) {
        console.error('Upload error:', error.message)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      newUrls.push(publicUrl)
    }

    setUrls(newUrls)
    notify(newUrls)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleRemove(url: string) {
    const pathMatch = url.match(/\/media\/(.+)$/)
    if (pathMatch) {
      await supabase.storage.from('media').remove([pathMatch[1]])
    }
    const newUrls = urls.filter(u => u !== url)
    setUrls(newUrls)
    notify(newUrls)
  }

  function isImage(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
  }

  function isVideo(url: string) {
    return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url)
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,.pdf"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full border-dashed"
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Enviando...' : 'Upload de Mídia'}
      </Button>

      {urls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {urls.map((url, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
              {isImage(url) ? (
                <img src={url} alt="" className="w-full h-32 object-cover" />
              ) : isVideo(url) ? (
                <div className="relative">
                  <video src={url} className="w-full h-32 object-cover" />
                  <Film className="absolute top-2 left-2 w-5 h-5 text-white drop-shadow-lg" />
                </div>
              ) : (
                <div className="w-full h-32 flex items-center justify-center">
                  <Image className="w-8 h-8 text-zinc-300" />
                  <span className="text-xs text-zinc-400 ml-2">{url.split('/').pop()?.slice(0, 20)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <a href={url} target="_blank" rel="noopener noreferrer" download
                  className="p-2 bg-white rounded-lg hover:bg-zinc-100 transition-colors"
                  onClick={e => e.stopPropagation()}>
                  <Download className="w-4 h-4 text-zinc-700" />
                </a>
                <button type="button" onClick={e => { e.stopPropagation(); handleRemove(url) }}
                  className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors">
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
