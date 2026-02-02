import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = 'client-assets'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    // Get asset info first
    const { data: asset, error: fetchErr } = await supabase
      .from('client_assets')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Extract storage path from file_url
    const urlPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
    const storagePath = asset.file_url.replace(urlPrefix, '')

    // Delete from storage
    if (storagePath) {
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      )
    }

    // Delete record
    const { error } = await supabase
      .from('client_assets')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = createServiceClient()

    const updates: Record<string, unknown> = {}

    if (body.folder !== undefined) updates.folder = body.folder
    if (body.filename !== undefined) updates.filename = body.filename
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.description !== undefined) updates.description = body.description

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('client_assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('Patch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
