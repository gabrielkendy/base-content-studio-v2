'use client'

import { useState, useRef, useEffect } from 'react'
import { FolderOpen, Loader2, AlertCircle } from 'lucide-react'

interface CoverPickerProps {
  orgId?: string
  /** File local ou URL já uploadada */
  videoSource?: File | string | null
  value?: string | null
  onChange: (url: string | null) => void
}

type SelectedSource = 'upload' | 'scrub' | number | null

export function CoverPicker({ videoSource, value, onChange }: CoverPickerProps) {
  const [frames, setFrames] = useState<string[]>([])
  const [scrubFrame, setScrubFrame] = useState<string | null>(null)
  const [scrubPos, setScrubPos] = useState(50)
  const [selected, setSelected] = useState<SelectedSource>(null)
  const [extracting, setExtracting] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [frameError, setFrameError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const scrubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-extrai frames quando videoSource muda
  useEffect(() => {
    // Cleanup anterior
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.src = ''
      videoRef.current = null
    }

    if (!videoSource) {
      setFrames([])
      setScrubFrame(null)
      setFrameError(null)
      return
    }

    const isFile = videoSource instanceof File
    const objectUrl = isFile ? URL.createObjectURL(videoSource) : null
    if (objectUrl) objectUrlRef.current = objectUrl
    const src = objectUrl ?? (videoSource as string)

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    if (!isFile) video.crossOrigin = 'anonymous'
    video.src = src

    setExtracting(true)
    setFrames([])
    setScrubFrame(null)
    setFrameError(null)
    setSelected(null)

    video.onloadedmetadata = async () => {
      videoRef.current = video
      try {
        const dur = video.duration
        if (!dur || !isFinite(dur)) throw new Error('Duração inválida')
        const extracted: string[] = []
        for (const t of [dur * 0.1, dur * 0.5, dur * 0.9]) {
          extracted.push(await seekFrame(video, t))
        }
        setFrames(extracted)
      } catch {
        setFrameError('Não foi possível extrair frames. Faça upload de uma imagem de capa.')
      } finally {
        setExtracting(false)
      }
    }

    video.onerror = () => {
      setFrameError('Não foi possível extrair frames. Faça upload de uma imagem de capa.')
      setExtracting(false)
    }

    video.load()

    return () => {
      if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current)
    }
  }, [videoSource])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current)
    }
  }, [])

  function seekFrame(video: HTMLVideoElement, time: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000)
      video.addEventListener('seeked', function handler() {
        clearTimeout(timeout)
        video.removeEventListener('seeked', handler)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 360
          canvas.getContext('2d')!.drawImage(video, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        } catch (e) { reject(e) }
      }, { once: true })
      video.currentTime = time
    })
  }

  function handleScrubChange(pos: number) {
    setScrubPos(pos)
    if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current)
    scrubTimerRef.current = setTimeout(async () => {
      if (!videoRef.current) return
      setScrubbing(true)
      try {
        const t = (pos / 100) * videoRef.current.duration
        const frame = await seekFrame(videoRef.current, t)
        setScrubFrame(frame)
      } finally {
        setScrubbing(false)
      }
    }, 300)
  }

  async function uploadToStorage(blob: Blob, ext: string): Promise<string> {
    const file = new File([blob], `capa.${ext}`, { type: blob.type || 'image/jpeg' })
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/media/upload-cover', { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao fazer upload da capa')
    return json.url
  }

  async function selectFrame(dataUrl: string, source: number | 'scrub') {
    setUploading(true)
    setUploadError(null)
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const url = await uploadToStorage(blob, 'jpg')
      setSelected(source)
      onChange(url)
    } catch (err: any) {
      setUploadError(err?.message || 'Erro ao salvar frame.')
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const url = await uploadToStorage(file, ext)
      setSelected('upload')
      onChange(url)
    } catch (err: any) {
      setUploadError(err?.message || 'Erro ao fazer upload.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const showScrubber = !!videoRef.current && frames.length > 0

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Selecione uma imagem ou faça o upload de capa personalizada:
      </p>

      {/* ── Fileira horizontal — estilo Mlabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">

        {/* Slot "Enviar Imagem" */}
        <label className="flex-shrink-0 cursor-pointer">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <div className={`relative w-[72px] h-[72px] rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all select-none
            ${selected === 'upload' ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-blue-300 hover:bg-zinc-50'}
            ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            {uploading && selected === 'upload'
              ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              : <FolderOpen className="w-6 h-6 text-zinc-400" />
            }
            <span className="text-[10px] text-zinc-500 text-center leading-tight px-1">Enviar Imagem</span>
            {selected === 'upload' && (
              <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded font-bold leading-none">
                Capa
              </span>
            )}
          </div>
        </label>

        {/* Esqueletos enquanto extrai */}
        {extracting && [0, 1, 2].map(i => (
          <div key={i} className="flex-shrink-0 w-[72px] h-[72px] rounded-xl bg-zinc-100 animate-pulse border-2 border-zinc-100" />
        ))}

        {/* Frames extraídos */}
        {frames.map((frame, i) => (
          <button
            key={i}
            type="button"
            disabled={uploading}
            onClick={() => selectFrame(frame, i)}
            className={`flex-shrink-0 relative w-[72px] h-[72px] rounded-xl border-2 overflow-hidden transition-all
              ${selected === i ? 'border-blue-500' : 'border-zinc-200 hover:border-blue-300'}
              disabled:opacity-50 cursor-pointer`}
          >
            <img src={frame} alt="" className="w-full h-full object-cover" />
            {uploading && selected === i && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
            {selected === i && !uploading && (
              <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded font-bold leading-none">
                Capa
              </span>
            )}
          </button>
        ))}

        {/* Frame do scrubber (timestamp personalizado) */}
        {(scrubFrame || scrubbing) && showScrubber && (
          <button
            type="button"
            disabled={uploading || scrubbing}
            onClick={() => scrubFrame && selectFrame(scrubFrame, 'scrub')}
            className={`flex-shrink-0 relative w-[72px] h-[72px] rounded-xl border-2 overflow-hidden transition-all
              ${selected === 'scrub' ? 'border-blue-500' : 'border-zinc-200 hover:border-blue-300'}
              disabled:opacity-50 cursor-pointer`}
          >
            {scrubbing || !scrubFrame
              ? <div className="w-full h-full bg-zinc-100 animate-pulse" />
              : <img src={scrubFrame} alt="" className="w-full h-full object-cover" />
            }
            {selected === 'scrub' && !scrubbing && (
              <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded font-bold leading-none">
                Capa
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Scrubber ── */}
      {showScrubber && (
        <input
          type="range"
          min={0}
          max={100}
          value={scrubPos}
          onChange={e => handleScrubChange(Number(e.target.value))}
          className="w-full h-1.5 accent-blue-500 cursor-pointer"
        />
      )}

      {/* Erros */}
      {frameError && frames.length === 0 && !extracting && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {frameError}
        </div>
      )}
      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  )
}
