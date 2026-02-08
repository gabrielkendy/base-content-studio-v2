import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// In-memory queue for demo (in production, use Supabase)
let mockQueue: any[] = []

// GET - List queue items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('count') === 'true'

    if (countOnly) {
      return NextResponse.json({ count: mockQueue.length })
    }

    // In production:
    // const { data, error } = await supabase
    //   .from('creation_queue')
    //   .select('*, discovered_content(*)')
    //   .eq('tenant_id', tenantId)
    //   .order('priority', { ascending: false })
    //   .order('position', { ascending: true })

    return NextResponse.json({ 
      items: mockQueue,
      total: mockQueue.length,
    })

  } catch (error) {
    console.error('Queue fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}

// POST - Add to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, content, framework, customInstructions } = body

    // Create queue item
    const queueItem = {
      id: `queue-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      discovered_content_id: contentId,
      title: content?.ai_summary || 'Novo conteúdo',
      source_url: content?.external_url,
      source_handle: content?.source?.handle,
      source_platform: content?.platform || 'instagram',
      target_format: 'carrossel',
      target_slides: 10,
      framework: framework || content?.ai_suggested_framework || 'curiosidade',
      custom_instructions: customInstructions || null,
      cliente_id: null,
      status: 'pending',
      generated_content: null,
      generated_images: [],
      priority: 0,
      position: mockQueue.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      approved_at: null,
      published_at: null,
      // Include content info
      discovered_content: content,
    }

    mockQueue.push(queueItem)

    // In production:
    // const { data, error } = await supabase
    //   .from('creation_queue')
    //   .insert({
    //     tenant_id: tenantId,
    //     discovered_content_id: contentId,
    //     title: content?.ai_summary,
    //     ...
    //   })
    //   .select()
    //   .single()

    return NextResponse.json({ 
      item: queueItem,
      success: true,
    })

  } catch (error) {
    console.error('Queue add error:', error)
    return NextResponse.json(
      { error: 'Failed to add to queue' },
      { status: 500 }
    )
  }
}

// DELETE - Remove from queue
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    mockQueue = mockQueue.filter(item => item.id !== itemId)

    // In production:
    // const { error } = await supabase
    //   .from('creation_queue')
    //   .delete()
    //   .eq('id', itemId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Queue delete error:', error)
    return NextResponse.json(
      { error: 'Failed to remove from queue' },
      { status: 500 }
    )
  }
}
