import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Envia link de recuperação de senha para um membro
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, memberId } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

    const admin = createServiceClient()

    // Verifica que solicitante é admin/gestor da mesma org
    const { data: requester } = await admin
      .from('members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!requester || !['admin', 'gestor'].includes(requester.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Se memberId fornecido, verifica que o membro é da mesma org
    if (memberId) {
      const { data: targetMember } = await admin
        .from('members')
        .select('org_id')
        .eq('id', memberId)
        .single()
      if (!targetMember || targetMember.org_id !== requester.org_id) {
        return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
      }
    }

    // Gera link de recuperação via Supabase Admin
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://studio.agenciabase.tech'}/auth/callback`,
      },
    })

    if (error) {
      console.error('[send-reset] generateLink error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const resetLink = data?.properties?.action_link

    // Tenta enviar via Resend se disponível
    if (process.env.RESEND_API_KEY && resetLink) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@agenciabase.tech',
            to: email,
            subject: '🔐 Redefinir sua senha — BASE Content Studio',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; color: #18181b; margin: 0;">🔐 Redefinir senha</h1>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
      Clique no botão abaixo para criar uma nova senha para o BASE Content Studio.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Criar nova senha
      </a>
    </div>
    <p style="color: #71717a; font-size: 13px; text-align: center;">
      Ou copie e cole este link:<br>
      <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
    </p>
    <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
      Este link expira em 1 hora. Se você não solicitou, ignore este email.
    </p>
  </div>
</body>
</html>`,
          }),
        })
        return NextResponse.json({ status: 'sent', message: 'Email de recuperação enviado!' })
      } catch (resendErr) {
        console.warn('[send-reset] Resend failed:', resendErr)
      }
    }

    // Fallback: retorna o link para o admin copiar manualmente
    return NextResponse.json({
      status: 'link_only',
      message: 'Email não configurado. Copie o link abaixo.',
      link: resetLink,
    })
  } catch (err: any) {
    console.error('[send-reset] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
