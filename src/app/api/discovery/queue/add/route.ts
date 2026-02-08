import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, content, framework, customInstructions } = body

    if (!contentId && !content) {
      return NextResponse.json(
        { error: 'Content ID or content object is required' },
        { status: 400 }
      )
    }

    // Create queue item
    const queueItem = {
      id: `queue-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      discovered_content_id: contentId,
      title: content?.ai_summary || content?.caption?.slice(0, 100) || 'Novo conteúdo',
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
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      approved_at: null,
      published_at: null,
      discovered_content: content,
    }

    // In production, save to Supabase:
    // const { data, error } = await supabase
    //   .from('creation_queue')
    //   .insert({
    //     tenant_id: tenantId,
    //     discovered_content_id: contentId,
    //     title: content?.ai_summary,
    //     source_url: content?.external_url,
    //     source_handle: content?.source?.handle,
    //     source_platform: content?.platform,
    //     framework: framework || content?.ai_suggested_framework,
    //     custom_instructions: customInstructions,
    //   })
    //   .select()
    //   .single()

    // Also update discovered_content status
    // await supabase
    //   .from('discovered_content')
    //   .update({ status: 'queued' })
    //   .eq('id', contentId)

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
