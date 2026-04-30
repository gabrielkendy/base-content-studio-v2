'use client'

import React, { useRef, useState, useEffect } from 'react'

interface VideoFrameSelectorProps {
  videoUrl: string
  onFrameSelect: (frameDataUrl: string) => void
  onFrameTimeSelect?: (timeMs: number) => void
}

export function VideoFrameSelector({ videoUrl, onFrameSelect, onFrameTimeSelect }: VideoFrameSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [videoUrl])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.9)
        onFrameSelect(frameDataUrl)
        if (onFrameTimeSelect) {
          onFrameTimeSelect(Math.floor(video.currentTime * 1000))
        }
      }
    }
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  return (
    <div className="flex flex-col space-y-4 p-4 border rounded-lg bg-gray-50 flex-1">
      <h3 className="font-semibold text-lg text-gray-800">Selecione a Capa do Vídeo</h3>
      <div className="relative aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          className="max-h-full max-w-full"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium w-10 text-right">{Math.floor(currentTime)}s</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleScrub}
          className="flex-1 cursor-pointer"
          step="0.1"
        />
        <span className="text-sm font-medium w-10">{Math.floor(duration)}s</span>
      </div>

      <button
        onClick={captureFrame}
        className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition shadow"
      >
        Capturar Capa Deste Tempo
      </button>
    </div>
  )
}
