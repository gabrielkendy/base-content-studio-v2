/**
 * GET  /api/agent/clientes        — Lista clientes (?q= busca por nome/slug)
 * POST /api/agent/clientes        — Cria cliente novo + perfil Upload-Post
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, slugify } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { createProfile, buildUsername } from '@/lib/upload-post'

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || ''
  const admin = createServiceClient()

  let query = admin
    .from('clientes')
    .select('id, nome, slug, cores, logo_url, contato, notas, created_at')
    .eq('org_id', auth.orgId)
    .order('nome', { ascending: true })

  if (q) {
    query = query.or(`nome.ilike.%${q}%,slug.ilike.%${q}%`)
  }

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ clientes: data || [], count: data?.length || 0 })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { nome, slug, contato, notas, cores, email_cliente } = body as {
    nome?: string
    slug?: string
    contato?: string
    notas?: string
    cores?: { primaria?: string; secundaria?: string }
    email_cliente?: string
  }

  if (!nome || !nome.trim()) {
    return NextResponse.json({ error: 'Campo `nome` é obrigatório' }, { status: 400 })
  }

  const finalSlug = slug?.trim() ? slugify(slug) : slugify(nome)
  if (!finalSlug) {
    return NextResponse.json({ error: 'Slug resultante inválido' }, { status: 400 })
  }

  const admin = createServiceClient()

  // Slug único na org
  const { data: existing } = await admin
    .from('clientes')
    .select('id, slug')
    .eq('org_id', auth.orgId)
    .eq('slug', finalSlug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: `Já existe um cliente com slug "${finalSlug}" nesta org`,
      existing_id: existing.id,
    }, { status: 409 })
  }

  const { data: newCliente, error: insertError } = await admin
    .from('clientes')
    .insert({
      org_id: auth.orgId,
      nome: nome.trim(),
      slug: finalSlug,
      cores: cores || { primaria: '#6366F1', secundaria: '#818CF8' },
      contato: contato?.trim() || null,
      notas: notas?.trim() || null,
    })
    .select('*')
    .single()

  if (insertError || !newCliente) {
    console.error('[agent/clientes] insert error:', insertError)
    return NextResponse.json({ error: insertError?.message || 'Erro ao criar cliente' }, { status: 500 })
  }

  // Provisiona perfil no Upload-Post (consistência com /api/clientes/create)
  const uploadPostUsername = buildUsername(auth.orgId, newCliente.id, finalSlug)
  let upCreated = false
  try {
    const profileResult = await createProfile(uploadPostUsername)
    upCreated = !!profileResult.success
    if (!upCreated) console.warn('[agent/clientes] upload-post profile not created:', profileResult.error)
  } catch (err: any) {
    console.warn('[agent/clientes] upload-post error (non-fatal):', err?.message)
  }

  // Convite opcional pro cliente acessar o portal
  let inviteToken: string | null = null
  if (email_cliente?.trim()) {
    const token = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('')
    const { data: invite } = await admin
      .from('invites')
      .insert({
        org_id: auth.orgId,
        email: email_cliente.trim().toLowerCase(),
        role: 'cliente',
        token,
        invited_by: auth.userId || null,
      })
      .select('id, token')
      .single()
    if (invite) {
      inviteToken = invite.token
      await admin.from('member_clients').insert({
        member_id: invite.id,
        cliente_id: newCliente.id,
        org_id: auth.orgId,
      })
    }
  }

  return NextResponse.json({
    success: true,
    cliente: newCliente,
    upload_post: {
      username: uploadPostUsername,
      created: upCreated,
    },
    invite: inviteToken ? { token: inviteToken } : null,
  })
}
