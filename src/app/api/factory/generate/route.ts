import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildUserPrompt, FRAMEWORKS } from '@/lib/prompts/brandsdecoded'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      queueItemId,
      topic,
      framework = 'curiosidade',
      sourceCaption,
      sourceUrl,
      customInstructions,
    } = body

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // Validate framework
    if (!FRAMEWORKS[framework as keyof typeof FRAMEWORKS]) {
      return NextResponse.json(
        { error: 'Invalid framework' },
        { status: 400 }
      )
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(framework as keyof typeof FRAMEWORKS, customInstructions)
    const userPrompt = buildUserPrompt(topic, sourceCaption, sourceUrl)

    // Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response')
    }

    // Parse JSON response
    let generatedContent
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw response:', textContent.text)
      return NextResponse.json(
        { error: 'Failed to parse generated content', raw: textContent.text },
        { status: 500 }
      )
    }

    // Validate structure
    if (!generatedContent.slides || !Array.isArray(generatedContent.slides)) {
      return NextResponse.json(
        { error: 'Invalid content structure: missing slides array' },
        { status: 500 }
      )
    }

    // Add metadata
    const result = {
      ...generatedContent,
      framework,
      generated_at: new Date().toISOString(),
      model: 'claude-sonnet-4-20250514',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
    }

    // In production, update the queue item in Supabase
    // await supabase
    //   .from('creation_queue')
    //   .update({ 
    //     generated_content: result,
    //     status: 'review',
    //     completed_at: new Date().toISOString(),
    //   })
    //   .eq('id', queueItemId)

    return NextResponse.json({
      content: result,
      success: true,
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content', details: String(error) },
      { status: 500 }
    )
  }
}
