import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      creationId,
      message,
      history = [],
      currentContent,
    } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build context with current content
    const systemPrompt = `Você é um assistente especializado em copywriting para carrosséis do Instagram, treinado no método BrandsDecoded.

Você está ajudando a refinar um carrossel que já foi gerado. O usuário pode pedir ajustes específicos em slides, mudanças de tom, reformulações, etc.

## CONTEÚDO ATUAL DO CARROSSEL
${JSON.stringify(currentContent, null, 2)}

## REGRAS
1. Quando o usuário pedir uma mudança, aplique APENAS no que foi pedido
2. Retorne o conteúdo atualizado em formato JSON válido
3. Mantenha a estrutura original (slides, cta, hashtags, etc)
4. Se for uma pergunta sobre o conteúdo, responda normalmente sem JSON
5. Se for um pedido de alteração, retorne o JSON completo atualizado

## FORMATO DE RESPOSTA PARA ALTERAÇÕES
Se o usuário pedir uma alteração, retorne:
{
  "type": "update",
  "slides": [...],
  "cta": "...",
  "hashtags": [...],
  "changes_made": "Descrição das alterações feitas"
}

Se for apenas uma resposta/explicação:
{
  "type": "message",
  "content": "Sua resposta aqui"
}`

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg: ChatMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response')
    }

    // Try to parse as JSON
    let parsedResponse
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        // Plain text response
        parsedResponse = {
          type: 'message',
          content: textContent.text,
        }
      }
    } catch {
      // Not JSON, treat as plain message
      parsedResponse = {
        type: 'message',
        content: textContent.text,
      }
    }

    // In production, save message to database
    // await supabase.from('creation_messages').insert({
    //   creation_id: creationId,
    //   role: 'user',
    //   content: message,
    // })
    // await supabase.from('creation_messages').insert({
    //   creation_id: creationId,
    //   role: 'assistant',
    //   content: textContent.text,
    //   metadata: { type: parsedResponse.type }
    // })

    return NextResponse.json({
      response: parsedResponse,
      raw: textContent.text,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message', details: String(error) },
      { status: 500 }
    )
  }
}
