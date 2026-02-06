/**
 * Upload-Post API v2 - Implementação limpa seguindo documentação oficial
 * https://docs.upload-post.com
 */

const API_BASE = 'https://api.upload-post.com/api'
const API_KEY = process.env.UPLOAD_POST_API_KEY!

// Headers padrão
function getHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {
    'Authorization': `Apikey ${API_KEY}`,
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

// ============================================
// PASSO 1: Gerenciamento de Perfis
// ============================================

export async function criarPerfil(username: string) {
  const res = await fetch(`${API_BASE}/uploadposts/users`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ username }),
  })
  return res.json()
}

export async function listarPerfis() {
  const res = await fetch(`${API_BASE}/uploadposts/users`, {
    headers: getHeaders(),
  })
  return res.json()
}

export async function buscarPerfil(username: string) {
  const res = await fetch(`${API_BASE}/uploadposts/users/${encodeURIComponent(username)}`, {
    headers: getHeaders(),
  })
  return res.json()
}

export async function deletarPerfil(username: string) {
  const res = await fetch(`${API_BASE}/uploadposts/users`, {
    method: 'DELETE',
    headers: getHeaders(true),
    body: JSON.stringify({ username }),
  })
  return res.json()
}

// ============================================
// PASSO 2: Gerar Link de Conexão (JWT)
// ============================================

interface GerarLinkParams {
  username: string
  redirectUrl?: string
  logoUrl?: string
  titulo?: string
  descricao?: string
  plataformas?: string[]
  mostrarCalendario?: boolean
}

export async function gerarLinkConexao(params: GerarLinkParams) {
  const body: Record<string, any> = {
    username: params.username,
    platforms: params.plataformas || ['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin'],
    show_calendar: params.mostrarCalendario ?? false,
  }
  
  if (params.redirectUrl) body.redirect_url = params.redirectUrl
  if (params.logoUrl) body.logo_image = params.logoUrl
  if (params.titulo) body.connect_title = params.titulo
  if (params.descricao) body.connect_description = params.descricao

  const res = await fetch(`${API_BASE}/uploadposts/users/generate-jwt`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(body),
  })
  return res.json()
}

// ============================================
// PASSO 3: Verificar Conexões
// ============================================

export interface ContaConectada {
  plataforma: string
  conectada: boolean
  nome?: string
  handle?: string
  avatar?: string
  reautenticar?: boolean
}

export async function verificarConexoes(username: string): Promise<ContaConectada[]> {
  const data = await buscarPerfil(username)
  
  if (!data.success || !data.profile) {
    return []
  }

  const contas: ContaConectada[] = []
  const social = data.profile.social_accounts || {}

  for (const [plataforma, valor] of Object.entries(social)) {
    if (!valor || valor === '') {
      contas.push({ plataforma, conectada: false })
    } else if (typeof valor === 'object') {
      const v = valor as any
      contas.push({
        plataforma,
        conectada: true,
        nome: v.display_name || v.username,
        handle: v.handle,
        avatar: v.social_images,
        reautenticar: v.reauth_required,
      })
    } else {
      contas.push({ plataforma, conectada: true, nome: String(valor) })
    }
  }

  return contas
}

// ============================================
// PASSO 4: Upload/Agendamento
// ============================================

interface UploadParams {
  username: string
  plataformas: string[]
  legenda: string
  
  // Mídia (um dos dois)
  fotoUrls?: string[]
  videoUrl?: string
  
  // Agendamento (opcional)
  dataAgendamento?: string  // ISO-8601: 2026-02-10T15:00:00
  timezone?: string         // America/Sao_Paulo
  
  // Opcionais
  primeiroComentario?: string
  async?: boolean
  
  // Por plataforma
  instagramTitulo?: string
  tiktokTitulo?: string
  facebookTitulo?: string
  facebookPageId?: string
  youtubeTitulo?: string
  youtubeDescricao?: string
  linkedinTitulo?: string
  linkedinDescricao?: string
}

export async function postar(params: UploadParams) {
  const formData = new FormData()
  
  // Obrigatórios
  formData.append('user', params.username)
  formData.append('title', params.legenda)
  
  // Plataformas
  for (const p of params.plataformas) {
    formData.append('platform[]', p)
  }
  
  // Agendamento
  if (params.dataAgendamento) {
    formData.append('scheduled_date', params.dataAgendamento)
    formData.append('timezone', params.timezone || 'America/Sao_Paulo')
  }
  
  // Async
  if (params.async) {
    formData.append('async_upload', 'true')
  }
  
  // Primeiro comentário
  if (params.primeiroComentario) {
    formData.append('first_comment', params.primeiroComentario)
  }
  
  // Títulos por plataforma
  if (params.instagramTitulo) formData.append('instagram_title', params.instagramTitulo)
  if (params.tiktokTitulo) formData.append('tiktok_title', params.tiktokTitulo)
  if (params.facebookTitulo) formData.append('facebook_title', params.facebookTitulo)
  if (params.facebookPageId) formData.append('facebook_page_id', params.facebookPageId)
  if (params.youtubeTitulo) formData.append('youtube_title', params.youtubeTitulo)
  if (params.youtubeDescricao) formData.append('youtube_description', params.youtubeDescricao)
  if (params.linkedinTitulo) formData.append('linkedin_title', params.linkedinTitulo)
  if (params.linkedinDescricao) formData.append('linkedin_description', params.linkedinDescricao)
  
  // Determina endpoint e adiciona mídia
  let endpoint: string
  
  if (params.videoUrl) {
    endpoint = '/upload'
    formData.append('video', params.videoUrl)
  } else if (params.fotoUrls && params.fotoUrls.length > 0) {
    endpoint = '/upload_photos'
    for (const url of params.fotoUrls) {
      formData.append('photos[]', url)
    }
  } else {
    throw new Error('Precisa de videoUrl ou fotoUrls')
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Apikey ${API_KEY}` },
    body: formData,
  })
  
  return res.json()
}

// ============================================
// Extras: Status, Agendados, Facebook Pages
// ============================================

export async function statusUpload(requestId?: string, jobId?: string) {
  const params = new URLSearchParams()
  if (requestId) params.append('request_id', requestId)
  if (jobId) params.append('job_id', jobId)
  
  const res = await fetch(`${API_BASE}/uploadposts/status?${params}`, {
    headers: getHeaders(),
  })
  return res.json()
}

export async function listarAgendados() {
  const res = await fetch(`${API_BASE}/uploadposts/schedule`, {
    headers: getHeaders(),
  })
  return res.json()
}

export async function cancelarAgendado(jobId: string) {
  const res = await fetch(`${API_BASE}/uploadposts/schedule/${jobId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return res.json()
}

export async function listarFacebookPages(username?: string) {
  const url = username 
    ? `${API_BASE}/uploadposts/facebook/pages?profile=${username}`
    : `${API_BASE}/uploadposts/facebook/pages`
  
  const res = await fetch(url, { headers: getHeaders() })
  return res.json()
}

export async function listarLinkedInPages(username?: string) {
  const url = username 
    ? `${API_BASE}/uploadposts/linkedin/pages?profile=${username}`
    : `${API_BASE}/uploadposts/linkedin/pages`
  
  const res = await fetch(url, { headers: getHeaders() })
  return res.json()
}
