/**
 * POST /api/posts/schedule
 *
 * Suporta dois formatos de chamada:
 *
 * A) Aba "Agendar Post" (novo, direto):
 *    { cliente_id, platforms, caption, hashtags, media_urls, cover_url, scheduled_at, timezone }
 *
 * B) ScheduleModal (a partir de um conteúdo existente):
 *    { conteudoId, platforms, scheduledDate, scheduledTime, title, firstComment, capaUrl }
 *
 * Ambos salvam em `scheduled_posts` (status: 'scheduled').
 * O cron /api/posts/process-scheduled publica quando chegar a hora.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserMembership(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('members')
    .select('id, org_id, role, user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const body = await request.json()
    const admin = createServiceClient()

    // ────────────────────────────────────────────────────────────
    // FORMATO B — ScheduleModal (conteudoId-based)
    // ────────────────────────────────────────────────────────────
    if (body.conteudoId) {
      const {
        conteudoId,
        platforms,
        scheduledDate,
        scheduledTime,
        title,
        firstComment,
        capaUrl,
        timezone = 'America/Sao_Paulo',
      } = body

      if (!platforms || platforms.length === 0) {
        return NextResponse.json({ error: 'Selecione pelo menos uma plataforma' }, { status: 400 })
      }
      if (!scheduledDate || !scheduledTime) {
        return NextResponse.json({ error: 'Data e hora são obrigatórios' }, { status: 400 })
      }

      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`)
      if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        return NextResponse.json({ error: 'Data de agendamento inválida ou no passado' }, { status: 400 })
      }

      // Buscar conteúdo
      const { data: conteudo, error: contErr } = await admin
        .from('conteudos')
        .select('*, empresa:clientes(id, nome, slug, org_id)')
        .eq('id', conteudoId)
        .eq('org_id', membership.org_id)
        .single()

      if (contErr || !conteudo) {
        return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
      }

      const cliente = conteudo.empresa as any
      if (!cliente) {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
      }

      const mediaUrls: string[] = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
      const caption = title || conteudo.legenda || conteudo.titulo || ''
      const platformStrings: string[] = Array.isArray(platforms) ? platforms : [platforms]

      // Salvar em scheduled_posts
      const { data: post, error: insertError } = await admin
        .from('scheduled_posts')
        .insert({
          org_id: membership.org_id,
          cliente_id: cliente.id,
          conteudo_id: conteudoId,
          platforms: JSON.stringify(platformStrings),
          caption,
          hashtags: [],
          media_urls: mediaUrls,
          cover_url: capaUrl || null,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
          created_by: user.id,
        })
        .select('id, scheduled_at')
        .single()

      if (insertError) {
        console.error('[schedule/conteudo] Insert error:', insertError)
        return NextResponse.json({ error: 'Erro ao salvar agendamento' }, { status: 500 })
      }

      // Atualizar status do conteúdo
      await admin
        .from('conteudos')
        .update({
          status: 'agendado',
          data_publicacao: scheduledDate,
          hora_publicacao: scheduledTime,
          canais: platformStrings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conteudoId)

      return NextResponse.json({
        success: true,
        job_id: post.id,
        scheduled_date: scheduledAt.toISOString(),
        platforms: platformStrings,
        message: 'Post agendado com sucesso!',
      })
    }

    // ────────────────────────────────────────────────────────────
    // FORMATO A — Aba "Agendar Post" (direto, sem conteúdo)
    // ────────────────────────────────────────────────────────────
    const {
      cliente_id,
      platforms,
      caption,
      hashtags = [],
      media_urls = [],
      cover_url,
      scheduled_at,
      timezone = 'America/Sao_Paulo',
    } = body

    if (!cliente_id) {
      return NextResponse.json({ error: 'cliente_id é obrigatório' }, { status: 400 })
    }
    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos uma plataforma' }, { status: 400 })
    }
    if (!caption || !caption.trim()) {
      return NextResponse.json({ error: 'A legenda não pode estar vazia' }, { status: 400 })
    }
    if (!scheduled_at) {
      return NextResponse.json({ error: 'Data de agendamento é obrigatória' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduled_at)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Data de agendamento inválida' }, { status: 400 })
    }
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    if (scheduledDate < startOfToday) {
      return NextResponse.json({ error: 'A data de agendamento deve ser hoje ou no futuro' }, { status: 400 })
    }

    // Verificar cliente
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('id', cliente_id)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Normalizar plataformas
    const platformStrings: string[] = (platforms as any[]).map((p: any) =>
      typeof p === 'string' ? p : p.platform
    )

    // Salvar em scheduled_posts
    const { data: post, error: insertError } = await admin
      .from('scheduled_posts')
      .insert({
        org_id: membership.org_id,
        cliente_id,
        platforms: JSON.stringify(platformStrings),
        caption: caption.trim(),
        hashtags,
        media_urls,
        cover_url: cover_url || null,
        scheduled_at: scheduledDate.toISOString(),
        status: 'scheduled',
        created_by: user.id,
      })
      .select('id, scheduled_at, status')
      .single()

    if (insertError) {
      console.error('[schedule/direto] Insert error:', insertError)
      return NextResponse.json({ error: 'Erro ao salvar agendamento. Tente novamente.' }, { status: 500 })
    }

    const scheduledBR = scheduledDate.toLocaleString('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return NextResponse.json({
      success: true,
      id: post.id,
      scheduled_at: post.scheduled_at,
      message: `Post agendado para ${scheduledBR}! 📅`,
    })
  } catch (err: any) {
    console.error('[schedule] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
