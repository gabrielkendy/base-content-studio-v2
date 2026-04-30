export interface VideoValidationResult {
  valid: boolean
  error?: string
  suggestion?: string
}

/**
 * Valida o arquivo do vídeo contra limites estritos por plataformas
 * (Pode ser utilizado tanto no front via object-URL mapping ou backend num middleware de upload)
 */
export async function validateVideo(file: File, platforms: string[]): Promise<VideoValidationResult> {
  const maxSizes: Record<string, number> = {
    instagram: 4_000_000_000,   // Quase ilimitado (4GB) 
    tiktok: 287_000_000,        // 287MB limit for TikTok
    youtube: 137_000_000_000,   // 137GB YouTube
    facebook: 4_000_000_000,    // 4GB FB
    linkedin: 5_000_000_000,    // 5GB LN
  }

  for (const platform of platforms) {
    const p = platform.toLowerCase()
    if (maxSizes[p] && file.size > maxSizes[p]) {
      const sizeMB = Math.round(maxSizes[p] / 1000000)
      return {
        valid: false,
        error: `O vídeo excede o tamanho máximo permitido para ${p} (${sizeMB}MB).`,
        suggestion: 'Mídia muito pesada. Sugerimos comprimir usando um encoder externo antes de submeter.'
      }
    }
  }

  // Verifica a duração de vídeo apenas se estiver rodando no navegador (lado cliente)
  if (typeof document !== 'undefined') {
    const video = document.createElement('video')
    video.preload = 'metadata'

    const durationPromise = new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration)
      video.onerror = () => reject('Erro ao extrair metadados do vídeo.')
    })

    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl

    let duration: number
    try {
      duration = await durationPromise
    } catch (err: any) {
      URL.revokeObjectURL(objectUrl)
      return { valid: false, error: err }
    }

    URL.revokeObjectURL(objectUrl)

    const maxDurations: Record<string, number> = {
      'instagram.stories': 15,
      'tiktok': 600, // 10 minutes maximum API length
      'youtube.shorts': 60
    }

    for (const platform of platforms) {
      const p = platform.toLowerCase()
      if (maxDurations[p] && duration > maxDurations[p]) {
        return {
          valid: false,
          error: `A duração do vídeo (${Math.floor(duration)}s) excede o limite para o formato em ${p} (${maxDurations[p]}s).`,
          suggestion: 'Tente cortar as partes excedentes do vídeo.'
        }
      }
    }
  }

  return { valid: true }
}
