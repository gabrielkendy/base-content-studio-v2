import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Public endpoint - creates user account and accepts invite
export async function POST(request: NextRequest) {
  try {
    const { token, nome, email, senha } = await request.json()

    if (!token || !nome || !email || !senha) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    const admin = createServiceClient()

    // 1. Validate invite token
    const { data: invite, error: invError } = await admin
      .from('invites')
      .select('id, email, role, org_id, expires_at, accepted_at')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (invError || !invite) {
      return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 404 })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })
    }

    // 2. Create user via Supabase Auth (admin API - auto-confirms)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // auto-confirm so they can login immediately
      user_metadata: {
        display_name: nome,
      },
    })

    if (authError) {
      // If user already exists, try to get their id
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        // User exists - get their id
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === email)
        
        if (existingUser) {
          // Check if already a member of this org
          const { data: existingMember } = await admin
            .from('members')
            .select('id')
            .eq('user_id', existingUser.id)
            .eq('org_id', invite.org_id)
            .eq('status', 'active')
            .maybeSingle()

          if (existingMember) {
            // Mark invite as accepted
            await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
            return NextResponse.json({ 
              status: 'already_member',
              message: 'Você já faz parte desta equipe. Faça login normalmente.' 
            })
          }

          // Create member for existing user
          await admin.from('members').insert({
            user_id: existingUser.id,
            org_id: invite.org_id,
            role: invite.role || 'designer',
            display_name: nome,
            status: 'active',
          })

          // Mark invite as accepted
          await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

          // Resolve member_clients if role is cliente
          if (invite.role === 'cliente') {
            const { data: newMember } = await admin
              .from('members')
              .select('id')
              .eq('user_id', existingUser.id)
              .eq('org_id', invite.org_id)
              .single()

            if (newMember) {
              await admin
                .from('member_clients')
                .update({ member_id: newMember.id })
                .eq('member_id', invite.id)
                .eq('org_id', invite.org_id)
            }
          }

          return NextResponse.json({
            status: 'joined',
            message: 'Convite aceito! Faça login para acessar.',
          })
        }

        return NextResponse.json({ error: 'Usuário já existe mas não foi possível vincular. Tente fazer login.' }, { status: 409 })
      }

      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 })
    }

    // 3. Create member in org
    const { data: newMember, error: memberErr } = await admin.from('members').insert({
      user_id: authData.user.id,
      org_id: invite.org_id,
      role: invite.role || 'designer',
      display_name: nome,
      status: 'active',
    }).select('id').single()

    if (memberErr) {
      console.error('Member creation error:', memberErr)
      return NextResponse.json({ error: 'Erro ao criar membro: ' + memberErr.message }, { status: 500 })
    }

    // 4. Mark invite as accepted
    await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    // 5. Resolve member_clients if role is cliente
    if (invite.role === 'cliente' && newMember) {
      await admin
        .from('member_clients')
        .update({ member_id: newMember.id })
        .eq('member_id', invite.id)
        .eq('org_id', invite.org_id)
    }

    return NextResponse.json({
      status: 'created',
      message: 'Conta criada com sucesso! Faça login para acessar.',
    })
  } catch (err: any) {
    console.error('Invite accept error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
