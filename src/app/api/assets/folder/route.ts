import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST: Create a folder (persisted as a special client_assets record with file_type='folder')
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { folderName, parentFolder, clienteId, orgId } = body

    if (!folderName || !clienteId || !orgId) {
      return NextResponse.json({ error: 'folderName, clienteId, and orgId required' }, { status: 400 })
    }

    // Sanitize folder name
    const safeName = folderName.replace(/[^a-zA-Z0-9áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ _-]/g, '').trim()
    if (!safeName) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })
    }

    const parent = parentFolder === '/' ? '' : (parentFolder || '')
    const newPath = `/${parent.replace(/^\/+|\/+$/g, '')}/${safeName}`.replace(/\/+/g, '/')

    const supabase = createServiceClient()

    // Check if folder already exists
    const { data: existing } = await supabase
      .from('client_assets')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('file_type', 'folder')
      .eq('folder', parentFolder || '/')
      .eq('filename', safeName)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ folder: newPath, name: safeName, existing: true })
    }

    // Insert folder marker record
    const { data, error } = await supabase
      .from('client_assets')
      .insert({
        org_id: orgId,
        cliente_id: clienteId,
        folder: parentFolder || '/',
        filename: safeName,
        file_type: 'folder',
        file_url: '',
        file_size: 0,
        tags: [],
      })
      .select()
      .single()

    if (error) {
      console.error('Create folder error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ folder: newPath, name: safeName, id: data.id })
  } catch (err: unknown) {
    console.error('Folder route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE: Remove a folder marker
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { clienteId, folderPath, folderName } = body

    if (!clienteId || !folderName) {
      return NextResponse.json({ error: 'clienteId and folderName required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('client_assets')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('file_type', 'folder')
      .eq('filename', folderName)
      .eq('folder', folderPath || '/')

    if (error) {
      console.error('Delete folder error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Folder delete error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
