import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Apify config
const APIFY_TOKEN = process.env.APIFY_TOKEN

interface SearchFilters {
  platform?: string[]
  niche?: string[]
  content_type?: string[]
  hashtags?: string[]
  min_views?: number
  period?: '24h' | '7d' | '30d' | '90d'
  language?: string[]
  sort_by?: 'viral' | 'recent' | 'relevance'
}

// Framework detection based on content analysis
const FRAMEWORKS = {
  curiosidade: ['sabia que', 'você já', 'descobri', 'segredo', 'ninguém conta'],
  autoridade: ['anos de', 'especialista', 'estudos mostram', 'pesquisa', 'cientificamente'],
  beneficio: ['como conseguir', 'alcançar', 'transformar', 'melhorar', 'aumentar'],
  pergunta: ['por que', 'você está', 'será que', 'como você'],
  testemunho: ['resultado', 'antes e depois', 'consegui', 'minha história'],
  lista: ['dicas', 'passos', 'erros', 'coisas que', 'formas de'],
  problema_solucao: ['problema', 'solução', 'como resolver', 'pare de'],
  passo_a_passo: ['passo', 'etapa', 'primeiro', 'tutorial', 'como fazer'],
  segredo: ['segredo', 'ninguém sabe', 'revelado', 'oculto', 'escondido'],
}

function detectFramework(text: string): string | null {
  const lowerText = text.toLowerCase()
  let bestMatch: string | null = null
  let bestScore = 0

  for (const [framework, keywords] of Object.entries(FRAMEWORKS)) {
    const score = keywords.filter(kw => lowerText.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = framework
    }
  }

  return bestScore > 0 ? bestMatch : null
}

// Calculate virality score based on engagement
function calculateViralityScore(likes: number, comments: number, shares: number, views: number): number {
  // Base score from absolute numbers
  let score = 0
  
  if (views > 0) {
    const engagementRate = ((likes + comments * 2 + shares * 3) / views) * 100
    score = Math.min(40, engagementRate * 10) // Max 40 points from engagement rate
  }
  
  // Points from absolute numbers (log scale)
  score += Math.min(30, Math.log10(Math.max(likes, 1)) * 6)
  score += Math.min(20, Math.log10(Math.max(comments, 1)) * 8)
  score += Math.min(10, Math.log10(Math.max(shares, 1)) * 10)
  
  return Math.min(100, Math.round(score))
}

// Calculate relevance score for fitness/health niche
function calculateRelevanceScore(text: string, topics: string[]): number {
  const relevantKeywords = [
    'fitness', 'treino', 'exercício', 'musculação', 'saúde', 'longevidade',
    'suplemento', 'proteína', 'dieta', 'nutrição', 'emagrecimento', 'hipertrofia',
    'creatina', 'whey', 'cardio', 'força', 'resistência', 'bem-estar',
    'hormônio', 'testosterona', 'sono', 'recuperação', 'performance',
    'workout', 'gym', 'health', 'nutrition', 'supplement', 'protein'
  ]
  
  const lowerText = text.toLowerCase()
  let matches = 0
  
  for (const keyword of relevantKeywords) {
    if (lowerText.includes(keyword)) matches++
  }
  
  // Also count from detected topics
  const topicMatches = topics.filter(t => 
    relevantKeywords.some(k => t.toLowerCase().includes(k))
  ).length
  
  const score = Math.min(100, (matches * 8) + (topicMatches * 15))
  return score
}

// Calculate adaptability score (how easy to adapt to BR)
function calculateAdaptabilityScore(contentType: string, slideCount: number, hasCaption: boolean): number {
  let score = 50 // Base score
  
  // Carrossel is best for adaptation
  if (contentType === 'carrossel') score += 30
  else if (contentType === 'post') score += 20
  else if (contentType === 'reels') score += 10
  
  // More slides = more content to work with
  if (slideCount >= 8) score += 15
  else if (slideCount >= 5) score += 10
  else if (slideCount >= 3) score += 5
  
  // Has caption = easier to understand intent
  if (hasCaption) score += 5
  
  return Math.min(100, score)
}

// Mock function - in production, this would call Apify
async function searchInstagramViaApify(filters: SearchFilters): Promise<any[]> {
  // In production:
  // const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${APIFY_TOKEN}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     hashtags: filters.hashtags,
  //     resultsLimit: 50,
  //     // ... other params
  //   })
  // })

  // For now, return mock data for testing
  const mockData = [
    {
      id: 'mock-1',
      shortCode: 'ABC123',
      url: 'https://instagram.com/p/ABC123',
      type: 'GraphSidecar', // carrossel
      caption: 'Novo estudo mostra que 5g de creatina por dia melhora função cognitiva em 15%! 🧠💪 Você sabia disso? #creatina #longevidade #biohacking',
      displayUrl: 'https://picsum.photos/400/400?random=1',
      images: ['https://picsum.photos/400/400?random=1', 'https://picsum.photos/400/400?random=2'],
      likesCount: 45000,
      commentsCount: 1200,
      videoViewCount: 0,
      ownerUsername: 'hubermanlab',
      ownerFullName: 'Dr. Andrew Huberman',
      ownerProfilePicUrl: 'https://picsum.photos/100/100?random=10',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      shortCode: 'DEF456',
      url: 'https://instagram.com/p/DEF456',
      type: 'GraphSidecar',
      caption: '7 suplementos com evidência científica para longevidade:\n\n1. Creatina\n2. Vitamina D\n3. Ômega 3\n4. Magnésio\n5. Colágeno\n6. CoQ10\n7. NMN\n\nSalva esse post! 📌 #suplementos #longevidade',
      displayUrl: 'https://picsum.photos/400/400?random=3',
      images: Array(10).fill(null).map((_, i) => `https://picsum.photos/400/400?random=${i + 20}`),
      likesCount: 89000,
      commentsCount: 2500,
      videoViewCount: 0,
      ownerUsername: 'drpeterattia',
      ownerFullName: 'Dr. Peter Attia',
      ownerProfilePicUrl: 'https://picsum.photos/100/100?random=11',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'mock-3',
      shortCode: 'GHI789',
      url: 'https://instagram.com/p/GHI789',
      type: 'GraphImage',
      caption: 'Zone 2 cardio: o segredo que ninguém te conta sobre longevidade\n\nVocê está fazendo cardio errado! A maioria das pessoas vai com tudo, mas a ciência mostra que treino de baixa intensidade é mais eficaz para saúde a longo prazo.\n\n#cardio #zone2 #longevidade',
      displayUrl: 'https://picsum.photos/400/400?random=5',
      images: ['https://picsum.photos/400/400?random=5'],
      likesCount: 34000,
      commentsCount: 890,
      videoViewCount: 0,
      ownerUsername: 'foundmyfitness',
      ownerFullName: 'Rhonda Patrick',
      ownerProfilePicUrl: 'https://picsum.photos/100/100?random=12',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'mock-4',
      shortCode: 'JKL012',
      url: 'https://instagram.com/p/JKL012',
      type: 'GraphSidecar',
      caption: 'Como o jejum intermitente afeta seus hormônios:\n\nSlide 1: Introdução\nSlide 2: Insulina\nSlide 3: HGH\nSlide 4: Cortisol\nSlide 5: Testosterona\nSlide 6: Conclusão\n\n#jejum #hormônios #saúde',
      displayUrl: 'https://picsum.photos/400/400?random=7',
      images: Array(6).fill(null).map((_, i) => `https://picsum.photos/400/400?random=${i + 30}`),
      likesCount: 67000,
      commentsCount: 1800,
      videoViewCount: 0,
      ownerUsername: 'mindpumpmedia',
      ownerFullName: 'Mind Pump',
      ownerProfilePicUrl: 'https://picsum.photos/100/100?random=13',
      timestamp: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'mock-5',
      shortCode: 'MNO345',
      url: 'https://instagram.com/p/MNO345',
      type: 'GraphVideo',
      caption: 'Os 3 erros que estão sabotando seu ganho de massa muscular 💪\n\nVocê treina pesado mas não cresce? Pode ser um desses erros!\n\n#hipertrofia #musculação #treino',
      displayUrl: 'https://picsum.photos/400/400?random=9',
      images: ['https://picsum.photos/400/400?random=9'],
      likesCount: 123000,
      commentsCount: 4500,
      videoViewCount: 890000,
      ownerUsername: 'stanefferding',
      ownerFullName: 'Stan Efferding',
      ownerProfilePicUrl: 'https://picsum.photos/100/100?random=14',
      timestamp: new Date(Date.now() - 345600000).toISOString(),
    },
  ]

  return mockData
}

// Process and score content
function processContent(rawContent: any, tenantId: string): any {
  const caption = rawContent.caption || ''
  
  // Determine content type
  let contentType = 'post'
  if (rawContent.type === 'GraphSidecar') contentType = 'carrossel'
  else if (rawContent.type === 'GraphVideo') contentType = 'reels'
  
  const slideCount = rawContent.images?.length || 1
  
  // Extract topics from caption
  const topics: string[] = []
  const topicPatterns = [
    /\b(creatina|proteína|whey|suplemento|vitamina|magnésio)\b/gi,
    /\b(treino|exercício|musculação|cardio|hipertrofia)\b/gi,
    /\b(longevidade|saúde|bem-estar|sono|recuperação)\b/gi,
    /\b(jejum|dieta|nutrição|emagrecimento|gordura)\b/gi,
    /\b(hormônio|testosterona|cortisol|insulina)\b/gi,
  ]
  
  for (const pattern of topicPatterns) {
    const matches = caption.match(pattern)
    if (matches) {
      topics.push(...matches.map((m: string) => m.toLowerCase()))
    }
  }
  
  // Calculate scores
  const viralityScore = calculateViralityScore(
    rawContent.likesCount || 0,
    rawContent.commentsCount || 0,
    0, // Instagram doesn't expose shares
    rawContent.videoViewCount || rawContent.likesCount * 10 // Estimate views
  )
  
  const relevanceScore = calculateRelevanceScore(caption, topics)
  const adaptabilityScore = calculateAdaptabilityScore(contentType, slideCount, !!caption)
  
  // Detect suggested framework
  const suggestedFramework = detectFramework(caption)
  
  // Generate AI summary (in production, call Claude)
  const aiSummary = caption.split('\n')[0].slice(0, 150) + (caption.length > 150 ? '...' : '')
  
  return {
    id: `disc-${rawContent.id}`,
    tenant_id: tenantId,
    source_id: null, // Would be set if we have a matching source
    platform: 'instagram',
    external_id: rawContent.shortCode,
    external_url: rawContent.url,
    content_type: contentType,
    caption: caption,
    thumbnail_url: rawContent.displayUrl,
    media_urls: rawContent.images || [rawContent.displayUrl],
    slide_count: slideCount,
    duration_seconds: null,
    likes_count: rawContent.likesCount || 0,
    comments_count: rawContent.commentsCount || 0,
    shares_count: 0,
    saves_count: 0,
    views_count: rawContent.videoViewCount || 0,
    virality_score: viralityScore,
    relevance_score: relevanceScore,
    adaptability_score: adaptabilityScore,
    overall_score: Math.round((viralityScore + relevanceScore + adaptabilityScore) / 3),
    ai_summary: aiSummary,
    ai_topics: [...new Set(topics)],
    ai_suggested_framework: suggestedFramework,
    status: 'new',
    discovered_at: new Date().toISOString(),
    posted_at: rawContent.timestamp,
    source: {
      handle: rawContent.ownerUsername,
      name: rawContent.ownerFullName,
      avatar_url: rawContent.ownerProfilePicUrl,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filters } = await request.json() as { filters: SearchFilters }

    // Get tenant from auth
    const cookieStore = cookies()
    const authToken = (await cookieStore).get('sb-auth-token')?.value
    
    // For now, use a mock tenant ID (in production, get from auth)
    const tenantId = 'mock-tenant-id'

    // Search based on platform
    let rawContents: any[] = []

    if (!filters.platform || filters.platform.includes('instagram')) {
      const instagramResults = await searchInstagramViaApify(filters)
      rawContents.push(...instagramResults)
    }

    // TODO: Add TikTok, YouTube, Twitter scrapers

    // Process and score each content
    const processedContents = rawContents.map(raw => processContent(raw, tenantId))

    // Apply filters
    let filteredContents = processedContents

    if (filters.min_views) {
      filteredContents = filteredContents.filter(c => c.views_count >= filters.min_views!)
    }

    if (filters.content_type && filters.content_type.length > 0) {
      filteredContents = filteredContents.filter(c => 
        filters.content_type!.includes(c.content_type)
      )
    }

    // Sort
    if (filters.sort_by === 'viral') {
      filteredContents.sort((a, b) => b.overall_score - a.overall_score)
    } else if (filters.sort_by === 'recent') {
      filteredContents.sort((a, b) => 
        new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
      )
    }

    return NextResponse.json({
      contents: filteredContents,
      total: filteredContents.length,
    })

  } catch (error) {
    console.error('Discovery search error:', error)
    return NextResponse.json(
      { error: 'Failed to search contents' },
      { status: 500 }
    )
  }
}
