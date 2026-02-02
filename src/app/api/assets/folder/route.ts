import { NextRequest, NextResponse } from 'next/server'

// Folders are virtual (based on the folder field in client_assets records)
// This endpoint just validates and returns the folder path
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { folderName, parentFolder } = body

    if (!folderName) {
      return NextResponse.json({ error: 'folderName required' }, { status: 400 })
    }

    // Sanitize folder name
    const safeName = folderName.replace(/[^a-zA-Z0-9áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ _-]/g, '').trim()
    if (!safeName) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })
    }

    const parent = parentFolder === '/' ? '' : (parentFolder || '')
    const newPath = `/${parent.replace(/^\/+|\/+$/g, '')}/${safeName}`.replace(/\/+/g, '/')

    return NextResponse.json({ folder: newPath, name: safeName })
  } catch (err: unknown) {
    console.error('Folder route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
