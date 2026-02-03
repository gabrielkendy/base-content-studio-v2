import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')
    const folder = searchParams.get('folder') || '/'
    const search = searchParams.get('search') || ''

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get actual files in current folder (exclude folder markers)
    let query = supabase
      .from('client_assets')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('folder', folder)
      .neq('file_type', 'folder')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`filename.ilike.%${search}%,tags.cs.{${search}}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('List error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get persisted folder markers in current folder
    const { data: folderMarkers } = await supabase
      .from('client_assets')
      .select('filename')
      .eq('cliente_id', clienteId)
      .eq('file_type', 'folder')
      .eq('folder', folder)

    const persistedFolders = new Set((folderMarkers || []).map(f => f.filename))

    // Also discover folders from files that are inside subfolders of current path
    const { data: allAssets } = await supabase
      .from('client_assets')
      .select('folder')
      .eq('cliente_id', clienteId)
      .neq('file_type', 'folder')

    const discoveredFolders = new Set<string>()
    const currentDepth = folder === '/' ? 0 : folder.split('/').filter(Boolean).length

    allAssets?.forEach(a => {
      const parts = a.folder.split('/').filter(Boolean)
      if (parts.length > currentDepth) {
        if (folder === '/') {
          discoveredFolders.add(parts[0])
        } else {
          const folderParts = folder.split('/').filter(Boolean)
          const isChild = folderParts.every((p, i) => parts[i] === p) && parts.length > folderParts.length
          if (isChild) {
            discoveredFolders.add(parts[folderParts.length])
          }
        }
      }
    })

    // Merge: persisted folders + discovered folders (from files)
    const allFolders = [...new Set([...persistedFolders, ...discoveredFolders])].sort()

    return NextResponse.json({
      data: data || [],
      folders: allFolders,
    })
  } catch (err: unknown) {
    console.error('List route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
