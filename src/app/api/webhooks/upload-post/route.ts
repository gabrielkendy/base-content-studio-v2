import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, status, error_message, platforms } = body
    
    if (!job_id) {
      return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Atualizar status do post agendado no Supabase
    // A API envia status='published' ou status='failed'
    const finalStatus = status === 'published' ? 'publicado' : (status === 'failed' ? 'erro' : status)

    const { data: updated, error } = await admin
      .from('scheduled_posts')
      .update({
        status: finalStatus,
        upload_post_response: body,
        error_message: error_message || null,
        updated_at: new Date().toISOString()
      })
      .eq('upload_post_job_id', job_id)
      .select()

    if (error) {
      console.error('[webhook/upload-post] Error updating:', error)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, body })
  } catch (err: any) {
    console.error('[webhook/upload-post] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
