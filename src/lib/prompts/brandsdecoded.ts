// BrandsDecoded Method - Prompts para geração de carrosséis
// Baseado no PDF do curso @brandsdecoded__

export const FRAMEWORKS = {
  curiosidade: {
    name: 'Abertura Curiosa',
    description: 'Abre loops mentais, ativa "lacuna de informação" e estimula o leitor a buscar a resposta.',
    when: 'O conteúdo tem uma sacada nova, um bastidor, um segredo, uma quebra de padrão.',
    examples: [
      'Você sabia que a maioria das pessoas erra ao tentar _______?',
      'O que ninguém te conta sobre _______ pode ser o que está te travando.',
      'Essa pequena mudança em _______ transformou meus resultados.',
      'Eu achava que _______ era o certo. Até descobrir isso.',
    ],
  },
  autoridade: {
    name: 'Autoridade',
    description: 'Transfere credibilidade, abre com validação e faz o leitor baixar as defesas cognitivas.',
    when: 'Você tem experiência, dados reais, bastidores ou provas de campo para sustentar o que será ensinado.',
    examples: [
      'Depois de escrever mais de 300 carrosséis, eu percebi esse padrão invisível.',
      'Essa foi a estrutura que usei pra gerar R$27.420 com um único post.',
      'Analisei 12 carrosséis virais em detalhes — todos tinham esse mesmo ponto em comum.',
    ],
  },
  beneficio: {
    name: 'Benefício Direto',
    description: 'Mostra ganho claro, prático e específico logo no início — ativando o desejo e a antecipação.',
    when: 'Você quer prometer algo concreto, ensinar um método, hack ou transformar complexidade em solução clara.',
    examples: [
      'Descubra como alcançar _______ sem precisar de _______.',
      'Com esse método, você pode _______ em menos de 7 dias.',
      'Aprenda como gerar mais _______ com menos esforço.',
    ],
  },
  pergunta: {
    name: 'Pergunta Impactante',
    description: 'Quebra padrões, ativa contradição interna, gera dissonância e força reflexão imediata.',
    when: 'Você quer desafiar o que o leitor acredita, expor erros comuns ou provocar um "não é possível" interno.',
    examples: [
      'Você provavelmente está fazendo _______ errado. Veja por quê.',
      'Se você acha que _______ é o segredo… você está sendo enganado.',
      'Você realmente acredita que _______ ainda funciona?',
    ],
  },
  testemunho: {
    name: 'Testemunho Real',
    description: 'Gera empatia instantânea através de casos reais, fazendo o leitor sentir "se ele conseguiu, eu também posso".',
    when: 'Você quer validar o impacto de um método com resultados reais.',
    examples: [
      'Veja como [pessoa] conseguiu [resultado] em apenas [período] usando [método].',
      'Esse é o antes e depois de [nome]: de [situação] para [conquista].',
      'Em 7 dias, essa estratégia gerou [número] pra [perfil]. Veja como.',
    ],
  },
  lista: {
    name: 'Lista Valiosa',
    description: 'Escaneabilidade + clareza de valor. A mente adora listas por serem fáceis de consumir.',
    when: 'Conteúdos de valor direto, hacks, insights práticos, mini tutoriais ou correção de erros.',
    examples: [
      'As [número] coisas que ninguém te contou sobre _______.',
      '[X] erros que estão bloqueando seus resultados com _______ — e como corrigir.',
      'Você só precisa dominar essas [número] ideias pra transformar _______.',
    ],
  },
  problema_solucao: {
    name: 'Problema e Solução',
    description: 'Cria contraste emocional: começa no desconforto e termina no alívio.',
    when: 'O público sente uma dor recorrente mas ainda não entende a causa real.',
    examples: [
      'Está com dificuldade em _______? Aqui está o que pode estar te bloqueando.',
      'Chega de sofrer com _______. Essa abordagem pode mudar o jogo.',
      'O erro silencioso que mantém você travado em _______ — e como sair disso agora.',
    ],
  },
  passo_a_passo: {
    name: 'Passo a Passo',
    description: 'Divide em etapas lógicas, ativa sensação de controle e reduz medo de errar.',
    when: 'Conteúdos com intenção prática, frameworks, tutoriais ou "métodos exclusivos".',
    examples: [
      'Aprenda em [número] passos simples como _______ sem depender de _______.',
      'Esse é o processo de [número] etapas que uso para _______ — e que você pode aplicar ainda hoje.',
      'O caminho exato que sigo para _______ de forma consistente.',
    ],
  },
  segredo: {
    name: 'Segredo Revelado',
    description: 'Ativa sensação de exclusividade. O leitor se sente especial por ter acesso.',
    when: 'Você quer gerar autoridade implícita, provocar mudança de mentalidade ou dar valor instantâneo.',
    examples: [
      'Vou te contar algo que ninguém fala sobre _______ — mas que muda tudo.',
      'O que ninguém te conta sobre _______ é justamente o que destrava seus resultados.',
      'Existe um detalhe oculto em _______ que separa os amadores dos profissionais.',
    ],
  },
}

export const SLIDE_STRUCTURE = {
  slide1_hook: 'ABERTURA - Gancho poderoso usando o framework escolhido. Deve ser impossível de ignorar.',
  slide2_tensao: 'TENSÃO - Aprofunda o problema ou cria surpresa. NÃO entrega a solução ainda.',
  slide3_contexto: 'CONTEXTO - Explica por que isso importa. Conecta com a dor/desejo do leitor.',
  slide4_insight: 'INSIGHT 1 - Primeira sacada valiosa. Começa a entregar valor real.',
  slide5_insight: 'INSIGHT 2 - Segunda sacada ou aprofundamento do primeiro ponto.',
  slide6_insight: 'INSIGHT 3 - Terceira sacada ou exemplo prático.',
  slide7_prova: 'PROVA - Dados, estudos, resultados ou testemunhos que validam.',
  slide8_aplicacao: 'APLICAÇÃO - Como o leitor pode usar isso na prática.',
  slide9_fechamento: 'FECHAMENTO - Resume a transformação ou reforça o benefício principal.',
  slide10_cta: 'CTA - Chamada para ação clara e específica (salvar, comentar, seguir, etc).',
}

export function buildSystemPrompt(framework: keyof typeof FRAMEWORKS, customInstructions?: string): string {
  const fw = FRAMEWORKS[framework]
  
  return `Você é um especialista em copywriting para carrosséis do Instagram, treinado no método BrandsDecoded.

## FILOSOFIA CENTRAL
Carrossel NÃO é design. É COPY. O que move o dedo da pessoa pro próximo slide não é a paleta de cores. É o texto. É o gancho. É a tensão. É o micro desejo que se acende entre um slide e outro.

## FRAMEWORK ESCOLHIDO: ${fw.name}
${fw.description}

**Quando usar:** ${fw.when}

**Exemplos de abertura:**
${fw.examples.map(e => `- "${e}"`).join('\n')}

## ESTRUTURA DOS 10 SLIDES
1. **HOOK (Slide 1):** ${SLIDE_STRUCTURE.slide1_hook}
2. **TENSÃO (Slide 2):** ${SLIDE_STRUCTURE.slide2_tensao}
3. **CONTEXTO (Slide 3):** ${SLIDE_STRUCTURE.slide3_contexto}
4. **INSIGHT 1 (Slide 4):** ${SLIDE_STRUCTURE.slide4_insight}
5. **INSIGHT 2 (Slide 5):** ${SLIDE_STRUCTURE.slide5_insight}
6. **INSIGHT 3 (Slide 6):** ${SLIDE_STRUCTURE.slide6_insight}
7. **PROVA (Slide 7):** ${SLIDE_STRUCTURE.slide7_prova}
8. **APLICAÇÃO (Slide 8):** ${SLIDE_STRUCTURE.slide8_aplicacao}
9. **FECHAMENTO (Slide 9):** ${SLIDE_STRUCTURE.slide9_fechamento}
10. **CTA (Slide 10):** ${SLIDE_STRUCTURE.slide10_cta}

## REGRAS DE COPY
- Use português brasileiro informal, mas profissional
- Frases curtas e impactantes (máximo 2 linhas por bloco)
- Cada slide deve ter TENSÃO que puxa pro próximo
- Nunca entregue tudo de uma vez - mantenha loops abertos
- Use emojis com moderação (1-2 por slide no máximo)
- Cite fontes quando mencionar estudos ou dados
- CTA deve ser consequência natural, não imposição

## TOM DE VOZ
- Direto, sem enrolação
- Empolgado mas não forçado
- Técnico quando necessário, acessível sempre
- Provocativo sem ser arrogante

${customInstructions ? `## INSTRUÇÕES CUSTOMIZADAS\n${customInstructions}` : ''}

## FORMATO DE RESPOSTA
Retorne um JSON válido com esta estrutura:
{
  "slides": [
    {
      "number": 1,
      "type": "hook",
      "text": "Texto do slide aqui",
      "image_prompt": "Prompt para gerar imagem cinematográfica do slide"
    },
    // ... slides 2-10
  ],
  "cta": "Texto do CTA principal",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "first_comment": "Texto opcional para primeiro comentário",
  "source_credit": "Crédito da fonte original"
}`
}

export function buildUserPrompt(topic: string, sourceCaption?: string, sourceUrl?: string): string {
  let prompt = `Crie um carrossel de 10 slides sobre o seguinte tema:\n\n**TEMA:** ${topic}`
  
  if (sourceCaption) {
    prompt += `\n\n**CONTEÚDO FONTE (para adaptar):**\n${sourceCaption}`
  }
  
  if (sourceUrl) {
    prompt += `\n\n**URL FONTE:** ${sourceUrl}`
  }
  
  prompt += `\n\nGere o carrossel seguindo a estrutura e regras do sistema. Retorne APENAS o JSON, sem markdown ou explicações.`
  
  return prompt
}

export const IMAGE_STYLE_PROMPT = `Estilo: Cinematográfico, moderno, dark mode.
Cores: Tons escuros com acentos em violeta/roxo/azul.
Tipografia: Limpa, sem serifa, bold para títulos.
Composição: Minimalista com foco no texto.
Iluminação: Dramática, com gradientes suaves.
Não incluir: Rostos, logos, texto (o texto será adicionado depois).`
