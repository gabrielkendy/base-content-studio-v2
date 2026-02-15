const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
);

const clienteId = '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead'; // FlexByo
const orgId = 'c8835ae5-f251-4f3d-8310-8bf734c442bc'; // BASE
const basePath = 'C:\\Users\\Gabriel\\Downloads\\EVENTO FLEX MARCO 26';

const posts = [
  // CONTEÚDO 01 - O que é Chakra Sacral?
  {
    folder: '02_POSTS_CONTEUDO',
    file: 'Post 01.png',
    titulo: 'Conteúdo 01 - O que é Chakra Sacral?',
    data_publicacao: '2026-02-25',
    legenda: `Você sabe o que é Chakra Sacral? 🧡

É o centro de energia que controla suas EMOÇÕES e CRIATIVIDADE.

Quando ele está bloqueado, você sente:

▪️ Dificuldade em expressar emoções
▪️ Bloqueios criativos constantes
▪️ Sensação de "vida sem cor"
▪️ Quadril e lombar sempre travados
▪️ Dificuldade em sentir prazer real

Se você marcou 3 ou mais... seu corpo está pedindo atenção.

E no dia 08/03 (domingo), a gente vai trabalhar exatamente isso no segundo encontro da Jornada dos 7 Chakras.

Hot Yoga a 40°C + posturas que abrem o quadril + respiração consciente.

60 minutos para desbloquear o que está travado. 🔥

🗓 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

Link na bio ou acesse: www.flexbyo.com.br

#ChakraSacral #Svadhisthana #FlexByo #HotYoga #Jornada7Chakras #YogaCuritiba #BemEstar`
  },
  // CONTEÚDO 02 - 5 sinais de emoções travadas
  {
    folder: '02_POSTS_CONTEUDO',
    file: 'Post 02.png',
    titulo: 'Conteúdo 02 - 5 sinais de emoções travadas',
    data_publicacao: '2026-02-26',
    legenda: `5 sinais de que suas emoções estão travadas. ⚠️

Seu corpo guarda tudo. Você está ouvindo?

1️⃣ Não lembra a última vez que chorou de verdade
2️⃣ A vida perdeu a graça (tudo parece "meh")
3️⃣ Ideias não vêm. Criatividade zerada.
4️⃣ Quadril e lombar SEMPRE travados
5️⃣ Medo de se entregar nos relacionamentos

Se você se viu em 3 ou mais...

Seu Chakra Sacral está pedindo atenção.

E no dia 08/03, vamos trabalhar exatamente isso:

🔥 Hot Yoga a 40°C
🦵 Posturas de abertura de quadril
🌊 Respiração para liberar emoções presas

Segundo encontro da Jornada dos 7 Chakras.

📅 08/03 (Domingo) | 📍 FlexByo
⏰ 9h | 10h15 | 11h30
💰 R$ 69,00

Garanta sua vaga: www.flexbyo.com.br

#ChakraSacral #Emoções #FlexByo #HotYoga #Jornada7Chakras #BemEstar #YogaCuritiba`
  },
  // CONTEÚDO 03 - Você perdeu a fluidez?
  {
    folder: '02_POSTS_CONTEUDO',
    file: 'Post 03.png',
    titulo: 'Conteúdo 03 - Você perdeu a FLUIDEZ?',
    data_publicacao: '2026-02-27',
    legenda: `Você perdeu a fluidez da vida? 🌊

Quando tudo parece pesado demais.
Quando nada flui como deveria.
Quando você só... funciona.

A água não força. Ela contorna.
Ela encontra caminho onde parece impossível.
Ela dança com os obstáculos.

E você? Está forçando ou fluindo?

O Chakra Sacral é o centro da fluidez.
Quando ele trava, a vida endurece.

No dia 08/03, vamos reativar esse fluxo.

🔥 Hot Yoga a 40°C
🌊 Posturas que abrem o quadril
🧘‍♀️ Respiração para reconectar com sua fluidez

Segundo encontro da Jornada dos 7 Chakras.

📅 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

Inscrições: www.flexbyo.com.br

#ChakraSacral #Fluidez #FlexByo #HotYoga #Jornada7Chakras #YogaCuritiba #BemEstar`
  },
  // TRÁFEGO 01 - Banner Jornada
  {
    folder: '03_POSTS_TRAFEGO',
    file: 'Trafego - Banner.png',
    titulo: 'Tráfego 01 - Jornada dos 7 Chakras (Banner)',
    data_publicacao: '2026-03-01',
    legenda: `JORNADA DOS 7 CHAKRAS 🧡
Segundo Encontro: CHAKRA SACRAL

60 minutos para desbloquear suas emoções.

🔥 Hot Yoga a 40°C
🦵 Posturas de abertura de quadril
🌊 Respiração consciente

Sem emoção, nada te move.
Sem criatividade, nada se renova.

📅 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

🔗 Garanta sua vaga: www.flexbyo.com.br

#Jornada7Chakras #ChakraSacral #FlexByo #HotYoga #YogaCuritiba`
  },
  // TRÁFEGO 02 - Svadhisthana
  {
    folder: '03_POSTS_TRAFEGO',
    file: 'Trafego 02.png',
    titulo: 'Tráfego 02 - Svadhisthana',
    data_publicacao: '2026-03-03',
    legenda: `JORNADA DOS 7 CHAKRAS 🧡
SVADHISTHANA — O Chakra Sacral

É o encontro que desbloqueia suas emoções.

Hot Yoga a 40°C + posturas que abrem o quadril + respiração consciente.

Você vai sair diferente de como entrou. 🔥

📅 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

🔗 Garanta sua vaga: www.flexbyo.com.br

#ChakraSacral #Svadhisthana #FlexByo #HotYoga #Jornada7Chakras`
  },
  // TRÁFEGO 03 - Chakra Sacral
  {
    folder: '03_POSTS_TRAFEGO',
    file: 'Trafego 03.png',
    titulo: 'Tráfego 03 - Chakra Sacral',
    data_publicacao: '2026-03-03',
    legenda: `CHAKRA SACRAL 🧡

O centro de energia que controla suas EMOÇÕES e CRIATIVIDADE.

Quando bloqueado: rigidez, bloqueio criativo e vida "sem cor".

SEGUNDO ENCONTRO da Jornada dos 7 Chakras.

🔥 Hot Yoga a 40°C
🦵 Posturas de abertura de quadril
🌊 Respiração consciente para desbloquear e fluir novamente

📅 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

Faça sua inscrição: www.flexbyo.com.br

#ChakraSacral #FlexByo #HotYoga #Jornada7Chakras #BemEstar`
  },
  // TRÁFEGO 04 - Últimas Vagas
  {
    folder: '03_POSTS_TRAFEGO',
    file: 'Trafego 04.png',
    titulo: 'Tráfego 04 - ÚLTIMAS VAGAS',
    data_publicacao: '2026-03-05',
    legenda: `⚠️ ÚLTIMAS VAGAS

O segundo encontro da Jornada dos 7 Chakras está quase esgotando.

08/03 (Domingo) — Chakra Sacral

✔️ Derreter rigidez com Hot Yoga a 40°C
✔️ Liberar emoções presas no quadril
✔️ Reconectar com sua fluidez natural

📅 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

🚨 Garanta sua vaga AGORA: www.flexbyo.com.br

#UltimasVagas #ChakraSacral #Jornada7Chakras #FlexByo #HotYoga`
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
  const timestamp = Date.now();
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log('Processando:', post.titulo);
    
    // Upload imagem
    const filePath = path.join(basePath, post.folder, post.file);
    
    if (!fs.existsSync(filePath)) {
      console.log('Arquivo não encontrado:', filePath);
      continue;
    }
    
    const imageUrl = await uploadFile(filePath, `flexbyo/chakra-sacral-${timestamp}-${i+1}.png`);
    
    if (!imageUrl) {
      console.log('Falha no upload');
      continue;
    }
    
    // Pequeno delay
    await new Promise(r => setTimeout(r, 100));
    
    // Criar conteúdo
    const { data, error } = await supabase
      .from('conteudos')
      .insert({
        org_id: orgId,
        empresa_id: clienteId,
        mes: 3,
        ano: 2026,
        titulo: post.titulo,
        tipo: 'post',
        legenda: post.legenda,
        status: 'aguardando_aprovacao',
        midia_urls: [imageUrl],
        canais: ['instagram'],
        ordem: i + 1,
        data_publicacao: post.data_publicacao
      })
      .select()
      .single();
    
    if (error) {
      console.log('Erro criar conteúdo:', error.message);
    } else {
      console.log('✓ Criado ID:', data.id);
      results.push({
        titulo: post.titulo,
        id: data.id,
        data: post.data_publicacao
      });
    }
  }
  
  console.log('\n========================================');
  console.log('LINKS DE APROVAÇÃO - FLEXBYO (Março 2026)');
  console.log('Evento: Jornada dos 7 Chakras - Chakra Sacral');
  console.log('========================================\n');
  
  results.forEach(r => {
    console.log(`📅 ${r.data} | ${r.titulo}`);
    console.log(`🔗 https://base-content-studio-v2.vercel.app/aprovacao?id=${r.id}`);
    console.log('');
  });
  
  // Link geral de aprovação
  console.log('\n📋 LINK GERAL (todos os posts):');
  console.log('https://base-content-studio-v2.vercel.app/aprovacao?cliente=flexbyo&mes=3&ano=2026');
}

run().catch(console.error);
