import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendRawEmail } from '@/lib/email'

// GET - Página de resposta (redireciona após registrar)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const resposta = searchParams.get('resposta') // sim, nao, depois
    const nome = searchParams.get('nome') || 'Equipe'
    
    if (!resposta || !['sim', 'nao', 'depois'].includes(resposta)) {
      return new NextResponse(gerarHtmlErro('Resposta inválida'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const admin = createServiceClient()

    // Buscar imóvel
    const { data: imovel, error } = await admin
      .from('imoveis')
      .select('*, cliente:clientes(nome)')
      .eq('id', id)
      .single()

    if (error || !imovel) {
      return new NextResponse(gerarHtmlErro('Imóvel não encontrado'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Atualizar resposta
    const novoStatus = resposta === 'sim' ? 'aguardando_gravacao' : imovel.status
    
    await admin
      .from('imoveis')
      .update({
        resposta_gravacao: resposta,
        respondido_por: nome,
        respondido_em: new Date().toISOString(),
        status: novoStatus,
      })
      .eq('id', id)

    // Buscar config para notificar o gestor
    const { data: config } = await admin
      .from('imoveis_config')
      .select('email_gestor')
      .eq('cliente_id', imovel.cliente_id)
      .maybeSingle()

    // Notificar gestor sobre a resposta
    const emailGestor = config?.email_gestor || 'contato@kendyproducoes.com.br'
    const respostaTexto = resposta === 'sim' ? '✅ SIM, vai gravar!' : resposta === 'nao' ? '❌ Não pode gravar' : '⏳ Vai responder depois'
    
    try {
      await sendRawEmail({
        to: emailGestor,
        subject: `🎬 Resposta: ${imovel.titulo} - ${respostaTexto}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${resposta === 'sim' ? '#22C55E' : resposta === 'nao' ? '#EF4444' : '#F59E0B'};">
              ${respostaTexto}
            </h2>
            <p><strong>Imóvel:</strong> ${imovel.titulo}</p>
            <p><strong>Respondido por:</strong> ${nome}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            ${resposta === 'sim' ? '<p style="color: #22C55E; font-weight: bold;">📹 A equipe vai gravar o vídeo!</p>' : ''}
          </div>
        `,
      })
    } catch (e) {
      console.error('Error sending notification:', e)
    }

    // Retornar página de confirmação
    return new NextResponse(gerarHtmlConfirmacao(resposta, imovel.titulo), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error: any) {
    console.error('Responder error:', error)
    return new NextResponse(gerarHtmlErro('Erro ao processar resposta'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

function gerarHtmlConfirmacao(resposta: string, titulo: string): string {
  const emoji = resposta === 'sim' ? '✅' : resposta === 'nao' ? '❌' : '⏳'
  const cor = resposta === 'sim' ? '#22C55E' : resposta === 'nao' ? '#EF4444' : '#F59E0B'
  const mensagem = resposta === 'sim' 
    ? 'Ótimo! Sua resposta foi registrada. Bora gravar! 🎬' 
    : resposta === 'nao' 
    ? 'Tudo bem! Vamos verificar outras opções.' 
    : 'Ok! Aguardamos sua confirmação.'

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resposta Registrada</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .emoji {
          font-size: 80px;
          margin-bottom: 20px;
        }
        h1 {
          color: ${cor};
          margin-bottom: 10px;
          font-size: 24px;
        }
        .titulo {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .mensagem {
          color: #374151;
          font-size: 16px;
          line-height: 1.6;
        }
        .footer {
          margin-top: 30px;
          color: #9ca3af;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="emoji">${emoji}</div>
        <h1>Resposta Registrada!</h1>
        <p class="titulo">${titulo}</p>
        <p class="mensagem">${mensagem}</p>
        <p class="footer">Você pode fechar esta página.</p>
      </div>
    </body>
    </html>
  `
}

function gerarHtmlErro(mensagem: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Erro</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fef2f2;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          border: 2px solid #fecaca;
        }
        .emoji { font-size: 60px; margin-bottom: 20px; }
        h1 { color: #dc2626; margin-bottom: 20px; }
        p { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="emoji">❌</div>
        <h1>Ops!</h1>
        <p>${mensagem}</p>
      </div>
    </body>
    </html>
  `
}
