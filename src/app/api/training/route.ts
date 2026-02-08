import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List knowledge base items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // In production:
    // let query = supabase
    //   .from('knowledge_base')
    //   .select('*')
    //   .eq('tenant_id', tenantId)
    //   .eq('is_active', true)
    //   .order('created_at', { ascending: false })
    
    // if (category) {
    //   query = query.eq('category', category)
    // }

    // Mock data
    const items = [
      {
        id: 'kb-1',
        tenant_id: 'mock',
        type: 'pdf',
        name: 'brandsdecoded_method.pdf',
        description: 'Método completo de criação de carrosséis',
        file_url: '/uploads/brandsdecoded_method.pdf',
        content: null,
        category: 'framework',
        is_active: true,
        processed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    return NextResponse.json({ items })

  } catch (error) {
    console.error('Training GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    )
  }
}

// POST - Upload new knowledge item
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // In production:
    // 1. Upload file to storage
    // const { data: uploadData, error: uploadError } = await supabase.storage
    //   .from('knowledge')
    //   .upload(`${tenantId}/${file.name}`, file)

    // 2. If PDF, extract text using pdf-parse or similar
    // const pdfBuffer = await file.arrayBuffer()
    // const pdfData = await pdfParse(Buffer.from(pdfBuffer))
    // const content = pdfData.text

    // 3. Save to database
    // const { data, error } = await supabase
    //   .from('knowledge_base')
    //   .insert({
    //     tenant_id: tenantId,
    //     type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
    //     name: file.name,
    //     description,
    //     file_url: uploadData?.path,
    //     content: content,
    //     category,
    //   })
    //   .select()
    //   .single()

    const newItem = {
      id: `kb-${Date.now()}`,
      tenant_id: 'mock',
      type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
      name: file.name,
      description: description || '',
      file_url: `/uploads/${file.name}`,
      content: null,
      category: category || 'general',
      is_active: true,
      processed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ item: newItem, success: true })

  } catch (error) {
    console.error('Training POST error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// DELETE - Remove knowledge item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // In production:
    // await supabase.from('knowledge_base').delete().eq('id', id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Training DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}
