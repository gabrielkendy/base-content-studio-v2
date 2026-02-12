// =====================================================
// Templates de Conteúdo para Imóveis
// =====================================================

export interface ImovelData {
  id: string
  codigo?: string
  titulo: string
  tipo: string
  endereco?: string
  bairro?: string
  cidade?: string
  area_total?: number
  area_construida?: number
  quartos?: number
  suites?: number
  banheiros?: number
  vagas?: number
  preco?: number
  preco_condominio?: number
  tipo_negocio?: string
  descricao?: string
  diferenciais?: string[]
  fotos?: string[]
}

// Formatar preço
function formatPreco(valor?: number): string {
  if (!valor) return 'Consulte'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Formatar área
function formatArea(area?: number): string {
  if (!area) return ''
  return `${area}m²`
}

// Emoji por tipo de imóvel
const TIPO_EMOJI: Record<string, string> = {
  apartamento: '🏢',
  casa: '🏠',
  cobertura: '🌆',
  terreno: '📐',
  comercial: '🏪',
  studio: '🏙️',
  kitnet: '🛏️',
  sobrado: '🏘️',
}

// =====================================================
// GERADOR DE CARROSSEL
// =====================================================

export interface CarrosselSlide {
  numero: number
  tipo: 'capa' | 'info' | 'diferenciais' | 'fotos' | 'contato' | 'preco'
  titulo?: string
  subtitulo?: string
  conteudo?: string[]
  imagem_fundo?: string
  cor_fundo?: string
}

export function gerarCarrossel(imovel: ImovelData): CarrosselSlide[] {
  const slides: CarrosselSlide[] = []
  const emoji = TIPO_EMOJI[imovel.tipo] || '🏠'
  
  // Slide 1: Capa
  slides.push({
    numero: 1,
    tipo: 'capa',
    titulo: imovel.titulo,
    subtitulo: `${emoji} ${imovel.tipo.charAt(0).toUpperCase() + imovel.tipo.slice(1)} em ${imovel.bairro || imovel.cidade || 'localização privilegiada'}`,
    imagem_fundo: imovel.fotos?.[0],
  })
  
  // Slide 2: Características principais
  const caracteristicas: string[] = []
  if (imovel.area_construida) caracteristicas.push(`📐 ${formatArea(imovel.area_construida)}`)
  if (imovel.quartos) caracteristicas.push(`🛏️ ${imovel.quartos} quarto${imovel.quartos > 1 ? 's' : ''}`)
  if (imovel.suites) caracteristicas.push(`🛁 ${imovel.suites} suíte${imovel.suites > 1 ? 's' : ''}`)
  if (imovel.banheiros) caracteristicas.push(`🚿 ${imovel.banheiros} banheiro${imovel.banheiros > 1 ? 's' : ''}`)
  if (imovel.vagas) caracteristicas.push(`🚗 ${imovel.vagas} vaga${imovel.vagas > 1 ? 's' : ''}`)
  
  if (caracteristicas.length > 0) {
    slides.push({
      numero: 2,
      tipo: 'info',
      titulo: 'Características',
      conteudo: caracteristicas,
      imagem_fundo: imovel.fotos?.[1],
    })
  }
  
  // Slide 3: Localização
  if (imovel.bairro || imovel.cidade) {
    const localizacao: string[] = []
    if (imovel.endereco) localizacao.push(`📍 ${imovel.endereco}`)
    if (imovel.bairro) localizacao.push(`🏘️ ${imovel.bairro}`)
    if (imovel.cidade) localizacao.push(`🌆 ${imovel.cidade}`)
    
    slides.push({
      numero: 3,
      tipo: 'info',
      titulo: 'Localização',
      conteudo: localizacao,
      imagem_fundo: imovel.fotos?.[2],
    })
  }
  
  // Slide 4: Diferenciais
  if (imovel.diferenciais && imovel.diferenciais.length > 0) {
    slides.push({
      numero: 4,
      tipo: 'diferenciais',
      titulo: 'Diferenciais',
      conteudo: imovel.diferenciais.slice(0, 6).map(d => `✨ ${d}`),
      imagem_fundo: imovel.fotos?.[3],
    })
  }
  
  // Slides de fotos adicionais
  const fotosRestantes = (imovel.fotos || []).slice(4, 7)
  fotosRestantes.forEach((foto, i) => {
    slides.push({
      numero: slides.length + 1,
      tipo: 'fotos',
      imagem_fundo: foto,
    })
  })
  
  // Slide final: Preço + Contato
  slides.push({
    numero: slides.length + 1,
    tipo: 'preco',
    titulo: formatPreco(imovel.preco),
    subtitulo: imovel.tipo_negocio === 'aluguel' ? '/mês' : '',
    conteudo: [
      '📲 Entre em contato!',
      '💬 Link na bio',
    ],
  })
  
  return slides
}

// =====================================================
// GERADOR DE LEGENDA
// =====================================================

export function gerarLegenda(imovel: ImovelData): string {
  const emoji = TIPO_EMOJI[imovel.tipo] || '🏠'
  const acao = imovel.tipo_negocio === 'aluguel' ? 'ALUGAR' : 'VENDA'
  
  let legenda = `${emoji} **${imovel.titulo}**\n\n`
  
  // Localização
  if (imovel.bairro || imovel.cidade) {
    legenda += `📍 ${[imovel.bairro, imovel.cidade].filter(Boolean).join(' - ')}\n\n`
  }
  
  // Características
  const specs: string[] = []
  if (imovel.area_construida) specs.push(`${formatArea(imovel.area_construida)}`)
  if (imovel.quartos) specs.push(`${imovel.quartos} quarto${imovel.quartos > 1 ? 's' : ''}`)
  if (imovel.suites) specs.push(`${imovel.suites} suíte${imovel.suites > 1 ? 's' : ''}`)
  if (imovel.vagas) specs.push(`${imovel.vagas} vaga${imovel.vagas > 1 ? 's' : ''}`)
  
  if (specs.length > 0) {
    legenda += `🏠 ${specs.join(' | ')}\n\n`
  }
  
  // Diferenciais (máximo 4)
  if (imovel.diferenciais && imovel.diferenciais.length > 0) {
    legenda += `✨ Diferenciais:\n`
    imovel.diferenciais.slice(0, 4).forEach(d => {
      legenda += `• ${d}\n`
    })
    legenda += '\n'
  }
  
  // Preço
  legenda += `💰 ${formatPreco(imovel.preco)}`
  if (imovel.tipo_negocio === 'aluguel') legenda += '/mês'
  legenda += '\n\n'
  
  // Condomínio
  if (imovel.preco_condominio) {
    legenda += `🏢 Condomínio: ${formatPreco(imovel.preco_condominio)}/mês\n\n`
  }
  
  // CTA
  legenda += `📲 Quer conhecer? Chama no direct!\n`
  legenda += `💬 Link na bio\n\n`
  
  // Hashtags
  legenda += `#imoveis #${imovel.tipo} #${imovel.bairro?.toLowerCase().replace(/\s/g, '') || 'imovel'} `
  legenda += `#${imovel.cidade?.toLowerCase().replace(/\s/g, '') || 'brasil'} `
  legenda += `#imobiliaria #${acao.toLowerCase()} #corretor #investimento`
  
  return legenda
}

// =====================================================
// GERADOR DE ROTEIRO DE VÍDEO
// =====================================================

export function gerarRoteiro(imovel: ImovelData): string {
  const emoji = TIPO_EMOJI[imovel.tipo] || '🏠'
  
  let roteiro = `# 🎬 ROTEIRO DE VÍDEO\n`
  roteiro += `## ${imovel.titulo}\n\n`
  roteiro += `---\n\n`
  
  // Cena 1: Abertura
  roteiro += `### 📍 CENA 1 - ABERTURA (0-5s)\n`
  roteiro += `**Local:** Fachada/Entrada do imóvel\n`
  roteiro += `**Ação:** Plano aberto mostrando a fachada\n`
  roteiro += `**Narração:** "Olha só esse ${imovel.tipo} incrível em ${imovel.bairro || imovel.cidade || 'localização privilegiada'}!"\n\n`
  
  // Cena 2: Entrada
  roteiro += `### 🚪 CENA 2 - ENTRADA (5-15s)\n`
  roteiro += `**Local:** Hall/Sala de entrada\n`
  roteiro += `**Ação:** Entrar no imóvel mostrando o ambiente\n`
  roteiro += `**Narração:** "Vem comigo conhecer cada detalhe..."\n\n`
  
  // Cena 3: Sala
  roteiro += `### 🛋️ CENA 3 - SALA (15-25s)\n`
  roteiro += `**Local:** Sala de estar/jantar\n`
  roteiro += `**Ação:** Panorâmica 180° da sala\n`
  roteiro += `**Narração:** "Sala ampla e integrada, perfeita para receber a família e os amigos."\n\n`
  
  // Cena 4: Cozinha
  roteiro += `### 🍳 CENA 4 - COZINHA (25-35s)\n`
  roteiro += `**Local:** Cozinha/Área gourmet\n`
  roteiro += `**Ação:** Mostrar bancadas, armários, eletros\n`
  roteiro += `**Narração:** "Cozinha planejada com muito espaço de armazenamento."\n\n`
  
  // Cena 5: Quartos
  if (imovel.quartos && imovel.quartos > 0) {
    roteiro += `### 🛏️ CENA 5 - QUARTOS (35-50s)\n`
    roteiro += `**Local:** Quarto(s)\n`
    roteiro += `**Ação:** Mostrar os ${imovel.quartos} quarto(s)`
    if (imovel.suites) roteiro += `, destacando a(s) ${imovel.suites} suíte(s)`
    roteiro += `\n`
    roteiro += `**Narração:** "São ${imovel.quartos} quartos`
    if (imovel.suites) roteiro += `, sendo ${imovel.suites} suíte${imovel.suites > 1 ? 's' : ''}`
    roteiro += `, todos com ótima iluminação natural."\n\n`
  }
  
  // Cena 6: Banheiros
  roteiro += `### 🚿 CENA 6 - BANHEIROS (50-55s)\n`
  roteiro += `**Local:** Banheiro(s)\n`
  roteiro += `**Ação:** Quick take dos banheiros\n`
  roteiro += `**Narração:** "Banheiros com acabamento de primeira."\n\n`
  
  // Cena 7: Área externa/Varanda
  roteiro += `### 🌳 CENA 7 - ÁREA EXTERNA (55-65s)\n`
  roteiro += `**Local:** Varanda/Área de lazer\n`
  roteiro += `**Ação:** Mostrar vista, varanda, área gourmet\n`
  roteiro += `**Narração:** "E olha essa área de lazer! Perfeita para relaxar."\n\n`
  
  // Cena 8: Diferenciais
  if (imovel.diferenciais && imovel.diferenciais.length > 0) {
    roteiro += `### ✨ CENA 8 - DIFERENCIAIS (65-75s)\n`
    roteiro += `**Destacar:**\n`
    imovel.diferenciais.slice(0, 4).forEach(d => {
      roteiro += `- ${d}\n`
    })
    roteiro += `**Narração:** "Além de tudo isso, ainda tem: ${imovel.diferenciais.slice(0, 3).join(', ')}."\n\n`
  }
  
  // Cena 9: Fechamento
  roteiro += `### 📱 CENA FINAL - CTA (75-90s)\n`
  roteiro += `**Local:** Ambiente mais bonito do imóvel\n`
  roteiro += `**Ação:** Olhar para câmera\n`
  roteiro += `**Narração:** "Gostou? Esse ${imovel.tipo} está ${imovel.tipo_negocio === 'aluguel' ? 'disponível para locação' : 'à venda'} por ${formatPreco(imovel.preco)}${imovel.tipo_negocio === 'aluguel' ? ' por mês' : ''}. Me chama no direct que eu te passo todos os detalhes!"\n\n`
  
  roteiro += `---\n\n`
  
  // Resumo técnico
  roteiro += `## 📋 RESUMO TÉCNICO\n\n`
  roteiro += `| Item | Valor |\n`
  roteiro += `|------|-------|\n`
  roteiro += `| Tipo | ${imovel.tipo} |\n`
  if (imovel.area_construida) roteiro += `| Área | ${formatArea(imovel.area_construida)} |\n`
  if (imovel.quartos) roteiro += `| Quartos | ${imovel.quartos} |\n`
  if (imovel.suites) roteiro += `| Suítes | ${imovel.suites} |\n`
  if (imovel.vagas) roteiro += `| Vagas | ${imovel.vagas} |\n`
  roteiro += `| Preço | ${formatPreco(imovel.preco)} |\n`
  if (imovel.bairro) roteiro += `| Bairro | ${imovel.bairro} |\n`
  if (imovel.cidade) roteiro += `| Cidade | ${imovel.cidade} |\n`
  
  roteiro += `\n---\n`
  roteiro += `\n⏱️ **Duração sugerida:** 60-90 segundos\n`
  roteiro += `📱 **Formato:** Vertical (9:16) para Reels/TikTok\n`
  
  return roteiro
}

// =====================================================
// GERADOR DE EMAIL PARA KENDY
// =====================================================

export function gerarEmailKendy(imovel: ImovelData, carrossel: CarrosselSlide[], legenda: string): {
  subject: string
  html: string
} {
  const subject = `🏠 Novo Imóvel: ${imovel.titulo} - Carrossel Pronto!`
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0;">🏠 Novo Imóvel Cadastrado!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${imovel.titulo}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <h2 style="color: #374151; border-bottom: 2px solid #6366F1; padding-bottom: 10px;">📋 Dados do Imóvel</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%;">Código:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${imovel.codigo || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Tipo:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${imovel.tipo}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Localização:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${imovel.bairro || ''} - ${imovel.cidade || ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Área:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${formatArea(imovel.area_construida)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Quartos:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${imovel.quartos || 0} (${imovel.suites || 0} suítes)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Vagas:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${imovel.vagas || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #6b7280;">Preço:</td>
            <td style="padding: 8px; color: #059669; font-weight: 700; font-size: 18px;">${formatPreco(imovel.preco)}</td>
          </tr>
        </table>
        
        <h2 style="color: #374151; border-bottom: 2px solid #8B5CF6; padding-bottom: 10px; margin-top: 30px;">📑 Carrossel (${carrossel.length} slides)</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          ${carrossel.map((slide, i) => `
            <div style="padding: 10px; ${i < carrossel.length - 1 ? 'border-bottom: 1px dashed #e5e7eb;' : ''}">
              <strong style="color: #6366F1;">Slide ${slide.numero}:</strong> 
              <span style="color: #374151;">${slide.titulo || slide.tipo}</span>
              ${slide.conteudo ? `<br><small style="color: #6b7280;">${slide.conteudo.join(' | ')}</small>` : ''}
            </div>
          `).join('')}
        </div>
        
        <h2 style="color: #374151; border-bottom: 2px solid #22C55E; padding-bottom: 10px; margin-top: 30px;">📝 Legenda</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; white-space: pre-wrap; font-size: 14px; color: #374151;">
${legenda}
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; margin-bottom: 15px;">✅ Conteúdo enviado automaticamente para o Content Studio</p>
        </div>
      </div>
      
      <div style="background: #374151; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
          Gerado automaticamente pelo BASE Content Studio
        </p>
      </div>
    </div>
  `
  
  return { subject, html }
}

// =====================================================
// GERADOR DE EMAIL PARA EQUIPE
// =====================================================

export function gerarEmailEquipe(imovel: ImovelData, roteiro: string, respondUrl: string): {
  subject: string
  html: string
} {
  const subject = `🎬 Roteiro de Vídeo: ${imovel.titulo} - Quer gravar?`
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0;">🎬 Novo Vídeo para Gravar!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${imovel.titulo}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">📍 Localização</h3>
          <p style="margin: 0; color: #6b7280;">${imovel.endereco || ''}</p>
          <p style="margin: 5px 0 0 0; color: #6b7280;">${imovel.bairro || ''} - ${imovel.cidade || ''}</p>
        </div>
        
        <h2 style="color: #374151; border-bottom: 2px solid #F59E0B; padding-bottom: 10px;">📋 Roteiro Completo</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; white-space: pre-wrap; font-size: 13px; color: #374151; max-height: 400px; overflow-y: auto;">
${roteiro}
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="color: #374151; margin: 0 0 20px 0;">🤔 Você pode gravar esse vídeo?</h3>
          
          <div style="display: inline-block;">
            <a href="${respondUrl}?resposta=sim" style="display: inline-block; background: #22C55E; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 5px;">
              ✅ SIM, vou gravar!
            </a>
            
            <a href="${respondUrl}?resposta=nao" style="display: inline-block; background: #EF4444; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 5px;">
              ❌ Não posso agora
            </a>
          </div>
          
          <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 12px;">
            Clique em um dos botões para responder
          </p>
        </div>
      </div>
      
      <div style="background: #374151; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
          Gerado automaticamente pelo BASE Content Studio
        </p>
      </div>
    </div>
  `
  
  return { subject, html }
}
