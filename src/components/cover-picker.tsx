'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Image as ImageIcon, Film, Check, Loader2, X } from 'lucide-react'

interface CoverPickerProps {
  orgId?: string
  /** Fonte de vídeo: File local (nova demanda) ou URL já uploadada (modal agendamento) */
  videoSource?: File | string | null
  /** URL da capa atualmente selecionada */
  value?: string | null
  onChange: (url: string | null) => void
}

export function CoverPicker({ orgId, videoSource, value, onChange }: CoverPickerProps) {
  const [frames, setFrames] = useState<string[]>([])
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function extractSingleFrame(video: HTMLVideoElement, time: number): Promise<string> {
    return new Promise((resolve) => {
      const onSeeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        video.removeEventListener('seeked', onSeeked)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      video.addEventListener('seeked', onSeeked, { once: true })
      video.currentTime = time
    })
  }

  async function extractFrames() {
    if (!videoSource) return
    setExtracting(true)
    setFrames([])
    setSelectedFrameIndex(null)

    try {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.preload = 'auto'

      const src = videoSource instanceof File ? URL.createObjectURL(videoSource) : videoSource
      video.src = src

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Erro ao carregar vídeo'))
        video.load()
      })

      const duration = video.duration
      const extracted: string[] = []
      for (const t of [duration * 0.1, duration * 0.5, duration * 0.9]) {
        extracted.push(await extractSingleFrame(video, t))
      }

      setFrames(extracted)
      if (videoSource instanceof File) URL.revokeObjectURL(src)
    } catch (err) {
      console.error('Frame extraction error:', err)
    } finally {
      setExtracting(false)
    }
  }

  async function uploadToStorage(blob: Blob, ext: string): Promise<string> {
    const folder = orgId ? `${orgId}/capas` : 'capas'
    const path = `${folder}/capa-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
    })
    if (error) throw error
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  async function handleSelectFrame(dataUrl: string, index: number) {
    setUploading(true)
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const url = await uploadToStorage(blob, 'jpg')
      setSelectedFrameIndex(index)
      onChange(url)
    } catch (err) {
      console.error('Upload frame error:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const url = await uploadToStorage(file, ext)
      setSelectedFrameIndex(null)
      onChange(url)
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Preview da capa atual */}
      {value && (
        <div className="relative inline-block rounded-xl overflow-hidden border-2 border-blue-500">
          <img src={value} alt="Capa" className="h-28 w-48 object-cover" />
          <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            Capa selecionada
          </span>
          <button
            type="button"
            onClick={() => { onChange(null); setSelectedFrameIndex(null) }}
            className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 hover:bg-red-500 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all select-none
            ${uploading ? 'opacity-50 pointer-events-none' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
            Upload de foto
          </div>
        </label>

        {!!videoSource && (
          <button
            type="button"
            onClick={extractFrames}
            disabled={extracting || uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-sm font-medium transition-all disabled:opacity-50"
          >
            {extracting
              ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              : <Film className="w-4 h-4 text-purple-500" />}
            {extracting ? 'Extraindo frames...' : 'Sugerir frames do vídeo'}
          </button>
        )}
      </div>

      {/* Sugestões de frames */}
      {frames.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Escolha um frame como capa:</p>
          <div className="flex gap-3">
            {frames.map((frame, i) => (
              <button
                key={i}
                type="button"
                onClick={() => !uploading && handleSelectFrame(frame, i)}
                disabled={uploading}
                className={`relative flex-1 rounded-xl overflow-hidden border-2 transition-all
                  ${selectedFrameIndex === i
                    ? 'border-blue-500 shadow-md shadow-blue-100'
                    : 'border-gray-200 hover:border-blue-300'}
                  disabled:opacity-50`}
              >
                <img src={frame} alt={`Frame ${i + 1}`} className="w-full h-24 object-cover" />
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                  {i === 0 ? 'Início' : i === 1 ? 'Meio' : 'Fim'}
                </div>
                {selectedFrameIndex === i && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-blue-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
