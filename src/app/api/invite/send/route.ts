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

    // Send invite via Supabase Auth magic link
    // This sends a native email through Supabase's email provider
    const { error: otpError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: inviteLink,
      },
    })

    // Even if magic link fails, we can still use the invite link approach
    // The important thing is to send the email notification

    // Try sending via Supabase's built-in email by creating/inviting user
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invite_token: inviteToken,
        role: role || 'designer',
        org_name: orgName || 'BASE Content Studio',
      },
    })

    if (inviteError) {
      // If user already exists, send a magic link instead
      if (inviteError.message?.includes('already') || inviteError.message?.includes('exists')) {
        const { error: linkError } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: inviteLink },
        })

        if (linkError) {
          return NextResponse.json({
            status: 'link_only',
            message: 'Could not send email. User may need to use the invite link manually.',
            link: inviteLink,
          })
        }

        return NextResponse.json({
          status: 'magic_link_sent',
          message: 'Magic link sent to existing user',
        })
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
      message: 'Invite email sent successfully',
      userId: inviteData?.user?.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
