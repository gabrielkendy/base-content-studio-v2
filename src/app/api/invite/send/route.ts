import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

// Send invite email via n8n webhook (uses Gmail)
async function sendEmailViaN8n(to: string, subject: string, html: string) {
  const n8nWebhookUrl = process.env.N8N_INVITE_WEBHOOK_URL
  if (!n8nWebhookUrl) return { success: false, error: 'N8N_INVITE_WEBHOOK_URL not configured' }

  try {
    const res = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `n8n error: ${res.status} ${text}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

function buildInviteEmailHtml(inviteLink: string, orgName: string, role: string) {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    designer: 'Designer',
    cliente: 'Cliente',
  }
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; color: #18181b; margin: 0;">📩 Você foi convidado!</h1>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
      Você foi convidado para fazer parte da equipe <strong>${orgName}</strong> como <strong>${roleLabels[role] || role}</strong> no BASE Content Studio.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Aceitar Convite
      </a>
    </div>
    <p style="color: #71717a; font-size: 13px; text-align: center;">
      Ou copie e cole este link no navegador:<br>
      <a href="${inviteLink}" style="color: #2563eb; word-break: break-all;">${inviteLink}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
    <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
      BASE Content Studio — Gestão inteligente de conteúdo
    </p>
  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, role, inviteToken, orgName } = await request.json()
    if (!email || !inviteToken) {
      return NextResponse.json({ error: 'Missing email or token' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify requesting user is admin/gestor
    const { data: member } = await admin
      .from('members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member || !['admin', 'gestor'].includes(member.role)) {
      return NextResponse.json({ error: 'Only admins can send invites' }, { status: 403 })
    }

    // Build invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const inviteLink = `${baseUrl}/auth/invite?token=${inviteToken}`
    const displayOrgName = orgName || 'BASE Content Studio'

    // Strategy 1: Send via n8n webhook (Gmail) - most reliable
    const emailHtml = buildInviteEmailHtml(inviteLink, displayOrgName, role || 'designer')
    const n8nResult = await sendEmailViaN8n(
      email,
      `📩 Convite para ${displayOrgName}`,
      emailHtml
    )

    if (n8nResult.success) {
      return NextResponse.json({
        status: 'sent',
        message: 'Invite email sent successfully via Gmail',
      })
    }

    // Strategy 2: Fallback to Supabase invite
    console.warn('n8n email failed, trying Supabase:', n8nResult.error)
    
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invite_token: inviteToken,
        role: role || 'designer',
        org_name: displayOrgName,
      },
    })

    if (inviteError) {
      // If user already exists, try magic link
      if (inviteError.message?.includes('already') || inviteError.message?.includes('exists')) {
        const { error: linkError } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: inviteLink },
        })

        if (!linkError) {
          return NextResponse.json({
            status: 'magic_link_sent',
            message: 'Magic link sent to existing user',
          })
        }
      }

      return NextResponse.json({
        status: 'link_only',
        message: 'Could not send invite email. Share the link manually.',
        link: inviteLink,
        error: inviteError.message,
      })
    }

    return NextResponse.json({
      status: 'sent',
      message: 'Invite email sent via Supabase',
      userId: inviteData?.user?.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
