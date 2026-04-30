import React from 'react'

interface VideoUploadPreviewProps {
  mediaUrl: string
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | string
  caption?: string
  format?: 'feed' | 'stories' | 'reels' | 'shorts' | string
}

export function VideoUploadPreview({ mediaUrl, platform, format, caption }: VideoUploadPreviewProps) {
  // Retorna simulações de aspect ratios das redes baseados no documentado  
  const getSimulatedDimensions = () => {
    switch(format) {
      case 'stories':
      case 'reels':
      case 'shorts':
        return 'w-[280px] h-[500px] rounded-xl' // 9:16 aspect ratio simulate
      case 'feed':
      default:
        if (platform === 'instagram') return 'w-[300px] h-[375px] rounded-md' // 4:5 aspect ratio simulate
        return 'w-[320px] h-[180px] rounded-md' // 16:9 standard para FB, LN
    }
  }

  const getPlatformIcon = () => {
    return (
      <span className="font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-100 py-1 px-2 rounded">
        {platform} {format ? `- ${format}` : ''}
      </span>
    )
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-2xl bg-white shadow-md overflow-hidden flex-shrink-0 mx-auto my-4 transition-all hover:shadow-lg max-w-[350px]">
      <div className="p-3 border-b flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-slate-300 animate-pulse flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">Preview Mockup</span>
            <span className="text-xs text-gray-500">Agência SaaS BASE</span>
          </div>
        </div>
        {getPlatformIcon()}
      </div>
      
      <div className={`relative bg-black flex items-center justify-center overflow-hidden mx-auto shadow-inner ${getSimulatedDimensions()} mt-4`}>
         <video 
           src={mediaUrl} 
           className="w-full h-full object-cover" 
           muted 
           loop 
           autoPlay 
           playsInline
         />
      </div>

      <div className="p-4 flex flex-col">
        <div className="flex space-x-3 mb-3">
           <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
           <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
           <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          <span className="font-bold mr-2">Perfil</span> 
          {caption || 'Prévia da legenda do post irá aparecer aqui com as hashtags...'}
        </p>
      </div>
    </div>
  )
}
