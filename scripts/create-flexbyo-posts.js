const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
);

const clienteId = '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead';
const orgId = 'c8835ae5-f251-4f3d-8310-8bf734c442bc';
const basePath = 'C:\\Users\\Gabriel\\Downloads\\flexbyo fevereiro 2026\\promos';

const posts = [
  {
    folder: 'promo creditos',
    feed: 'feed1.png',
    story: 'STORY1.png',
    titulo: 'Promo Creditos - Pacotes Bonus',
    legenda: `ULTIMA CHAMADA - Fevereiro esta acabando!

Garanta suas aulas extras antes que seja tarde:
- 10+2 aulas
- 20+5 aulas  
- 40+15 aulas

Promocao valida ate 28/02!

Nao deixe pra depois. Seu corpo agradece.

Garanta seu bonus: (41) 99704-9069

#flexbyo #pilates #hotyoga #promocao #curitiba`
  },
  {
    folder: '10+10',
    feed: 'FEED2.png',
    story: 'STORY2.png',
    titulo: 'Pacote 10+10 - Recuperacao',
    legenda: `ULTIMA CHAMADA!

A gente ainda ta aqui. E voce?

Seu pacote 10+10 ainda esta disponivel.
Mas so ate o fim do mes.

PACOTE EXCLUSIVO DE RECUPERACAO
10+10 Aulas

Ultimos dias, nao perca!

Volte agora: (41) 99704-9069

#flexbyo #pilates #voltaastreinar #curitiba`
  },
  {
    folder: '19,90',
    feed: 'FEED3.png',
    story: 'STORY3.png',
    titulo: 'Restart R$19,90',
    legenda: `RESTART

2 aulas por R$19,90
Seu corpo vai te agradecer!

Pilates ou Hot Yoga - escolha, experimente e descubra o que o movimento pode fazer por voce.

- Ambiente acolhedor
- Turmas pequenas
- Atencao de verdade

Cuidar de voce pode (e deve) ser simples.

Agende suas aulas: (41) 99704-9069

#flexbyo #pilates #hotyoga #curitiba #bemestar`
  },
  {
    folder: 'pilates ind',
    feed: 'FEED4.png',
    story: 'STORY4.png',
    titulo: 'Pilates Individual - 30% OFF',
    legenda: `PILATES INDIVIDUAL

Atencao exclusiva. Evolucao no seu ritmo.

30% OFF no primeiro mes!
Para planos a partir de 2x por semana.

- Acompanhamento personalizado
- Correcao precisa
- Resultados que voce sente desde a primeira aula

O cuidado que seu corpo merece.

Agende sua aula experimental: (41) 99704-9069

#flexbyo #pilates #pilatesindividual #curitiba`
  }
];

async function uploadFile(filePath, destPath) {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from('media')
    .upload(destPath, fileBuffer, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (error) {
    console.log('Erro upload ' + destPath + ':', error.message);
    return null;
  }
  
  const { data: urlData } = supabase.storage.from('media').getPublicUrl(destPath);
  return urlData.publicUrl;
}

async function run() {
  const results = [];
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log('Processando:', post.titulo);
    
    // Upload feed
    const feedPath = path.join(basePath, post.folder, post.feed);
    const feedUrl = await uploadFile(feedPath, `flexbyo/${Date.now()}-feed-${i+1}.png`);
    
    // Pequeno delay para evitar mesmo timestamp
    await new Promise(r => setTimeout(r, 100));
    
    // Upload story
    const storyPath = path.join(basePath, post.folder, post.story);
    const storyUrl = await uploadFile(storyPath, `flexbyo/${Date.now()}-story-${i+1}.png`);
    
    // Criar conteudo
    const { data, error } = await supabase
      .from('conteudos')
      .insert({
        org_id: orgId,
        empresa_id: clienteId,
        mes: 2,
        ano: 2026,
        titulo: post.titulo,
        tipo: 'post',
        legenda: post.legenda,
        status: 'aguardando_aprovacao',
        midia_urls: [feedUrl, storyUrl].filter(Boolean),
        canais: ['instagram'],
        ordem: i + 1
      })
      .select()
      .single();
    
    if (error) {
      console.log('Erro criar conteudo:', error.message);
    } else {
      console.log('Criado ID:', data.id);
      results.push({
        titulo: post.titulo,
        id: data.id
      });
    }
  }
  
  console.log('\n=== LINKS DE APROVACAO ===');
  results.forEach(r => {
    console.log(r.titulo + ':');
    console.log('https://base-content-studio-v2.vercel.app/aprovacao?id=' + r.id);
    console.log('');
  });
}

run().catch(console.error);
