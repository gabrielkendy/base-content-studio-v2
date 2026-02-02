import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BRAND_FIELDS = ['brand_guidelines', 'color_palette', 'fonts', 'personas', 'bio', 'social_links']

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No membership' }, { status: 403 })

    const { clienteId } = await params
    const admin = createServiceClient()

    const { data, error } = await admin
      .from('clientes')
      .select('id, nome, slug, logo_url, cores, brand_guidelines, color_palette, fonts, personas, bio, social_links')
      .eq('id', clienteId)
      .eq('org_id', membership.org_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Cliente not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No membership' }, { status: 403 })

    // Only admin/gestor can edit brand
    if (membership.role !== 'admin' && membership.role !== 'gestor') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { clienteId } = await params
    const body = await request.json()

    // Filter only allowed fields
    const updateData: Record<string, any> = {}
    for (const field of BRAND_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const admin = createServiceClient()

    const { data, error } = await admin
      .from('clientes')
      .update(updateData)
      .eq('id', clienteId)
      .eq('org_id', membership.org_id)
      .select('id, brand_guidelines, color_palette, fonts, personas, bio, social_links')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
