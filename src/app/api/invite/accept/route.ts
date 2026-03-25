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
      .select('id, email, role, org_id, expires_at, accepted_at, client_ids')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (invError || !invite) {
      return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 404 })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })
    }

    const inviteData = invite
    // Helper: vincula clientes ao member
    async function linkMemberClients(memberId: string) {
      const clientIds: string[] = (inviteData as any).client_ids || []
      if (inviteData.role !== 'cliente' || clientIds.length === 0) return

      for (const clienteId of clientIds) {
        await admin.from('member_clients').upsert({
          member_id: memberId,
          cliente_id: clienteId,
          org_id: inviteData.org_id,
        }, { onConflict: 'member_id,cliente_id', ignoreDuplicates: true })
      }
    }

    // 2. Try to create user via Supabase Auth (admin API - auto-confirms)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { display_name: nome },
    })

    if (authError) {
      // User already exists - find them by listing (with high perPage)
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        let page = 1
        let existingUser: any = null

        // Paginate to find the user
        while (!existingUser) {
          const { data: usersPage } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
          if (!usersPage?.users?.length) break
          existingUser = usersPage.users.find(u => u.email === email)
          if (usersPage.users.length < 1000) break
          page++
        }

        if (!existingUser) {
          return NextResponse.json({ error: 'Usuário já existe mas não foi possível vincular. Tente fazer login.' }, { status: 409 })
        }

        // Check if already a member of this org
        const { data: existingMember } = await admin
          .from('members')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('org_id', invite.org_id)
          .eq('status', 'active')
          .maybeSingle()

        if (existingMember) {
          await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
          await linkMemberClients(existingMember.id)
          return NextResponse.json({
            status: 'already_member',
            message: 'Você já faz parte desta equipe. Faça login normalmente.',
          })
        }

        // Create member for existing user
        const { data: newMember, error: memErr } = await admin.from('members').insert({
          user_id: existingUser.id,
          org_id: invite.org_id,
          role: invite.role || 'designer',
          display_name: nome,
          status: 'active',
        }).select('id').single()

        if (memErr) {
          return NextResponse.json({ error: 'Erro ao vincular membro: ' + memErr.message }, { status: 500 })
        }

        await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
        if (newMember) await linkMemberClients(newMember.id)

        return NextResponse.json({
          status: 'joined',
          message: 'Convite aceito! Faça login para acessar.',
        })
      }

      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 })
    }

    // 3. Check if trigger already created the member (race condition with handle_new_user)
    const { data: triggerMember } = await admin
      .from('members')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('org_id', invite.org_id)
      .maybeSingle()

    let memberId: string | null = triggerMember?.id ?? null

    if (!memberId) {
      // Trigger did not run or did not find the invite - create member manually
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

      memberId = newMember?.id ?? null
    }

    // 4. Mark invite as accepted
    await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    // 5. Link clients if role is cliente
    if (memberId) await linkMemberClients(memberId)

    return NextResponse.json({
      status: 'created',
      message: 'Conta criada com sucesso! Faça login para acessar.',
    })
  } catch (err: any) {
    console.error('Invite accept error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
