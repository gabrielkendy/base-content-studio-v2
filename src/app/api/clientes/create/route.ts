import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createProfile, buildUsername } from '@/lib/upload-post'

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
    const { nome, slug, cores, contato, notas, email_cliente } = body

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const finalSlug = slug || nome.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const admin = createServiceClient()

    // 1. Criar cliente no Supabase
    const { data: newCliente, error: insertError } = await admin
      .from('clientes')
      .insert({
        org_id: membership.org_id,
        nome,
        slug: finalSlug,
        cores: cores || { primaria: '#6366F1', secundaria: '#818CF8' },
        contato: contato || null,
        notas: notas || null,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error creating cliente:', insertError)
      return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
    }

    // 2. Criar perfil no Upload-Post automaticamente
    const uploadPostUsername = buildUsername(membership.org_id, newCliente.id, finalSlug)
    const profileResult = await createProfile(uploadPostUsername)
    
    if (!profileResult.success) {
      console.error('Error creating Upload-Post profile:', profileResult.error)
      // Não falha a criação do cliente, só loga o erro
      // O perfil será criado via lazy creation quando tentar conectar
    }

    // 3. Criar convite se email fornecido
    let invite = null
    if (email_cliente) {
      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      const { data: inviteData } = await admin
        .from('invites')
        .insert({
          org_id: membership.org_id,
          email: email_cliente,
          role: 'cliente',
          token,
          invited_by: user.id,
        })
        .select('*')
        .single()

      if (inviteData) {
        await admin.from('member_clients').insert({
          member_id: inviteData.id,
          cliente_id: newCliente.id,
          org_id: membership.org_id,
        })
        invite = inviteData
      }
    }

    return NextResponse.json({
      success: true,
      cliente: newCliente,
      upload_post_username: uploadPostUsername,
      upload_post_created: profileResult.success,
      invite_sent: !!invite,
    })
  } catch (error: any) {
    console.error('Create cliente error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
