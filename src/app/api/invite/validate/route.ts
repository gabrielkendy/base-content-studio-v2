import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Public endpoint - no auth required
// Validates an invite token and returns invite details
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const admin = createServiceClient()

    const { data: invite, error } = await admin
      .from('invites')
      .select('id, email, role, org_id, expires_at, accepted_at')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }

    // Get org name
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', invite.org_id)
      .single()

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      org_id: invite.org_id,
      org_name: org?.name || 'BASE Content Studio',
      expires_at: invite.expires_at,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
