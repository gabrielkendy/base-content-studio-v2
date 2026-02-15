const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
);

const clienteId = '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead';
const orgId = 'c8835ae5-f251-4f3d-8310-8bf734c442bc';
const basePath = 'C:\\Users\\Gabriel\\Downloads\\EVENTO FLEX MARCO 26\\01_CARROSSEL_LANCAMENTO';

const legenda = `🧡 JORNADA DOS 7 CHAKRAS
Segundo Encontro: CHAKRA SACRAL

Dia 08/03 (Domingo) tem encontro marcado com suas emoções.

O Chakra Sacral é o centro de energia que governa:
✨ Suas emoções
✨ Sua criatividade
✨ Sua fluidez na vida

Quando ele está bloqueado, você sente:
→ Vida sem cor
→ Criatividade travada
→ Quadril e lombar sempre duros
→ Dificuldade em sentir prazer

No segundo encontro da Jornada, vamos destravar tudo isso com:

🔥 Hot Yoga a 40°C
🦵 Posturas de abertura de quadril
🌊 Respiração consciente

60 minutos para reconectar com sua fluidez.

📅 08/03 (Domingo)
⏰ 9h | 10h15 | 11h30
📍 FlexByo ParkShopping Barigüi
💰 R$ 69,00

🔗 Garanta sua vaga: www.flexbyo.com.br

#ChakraSacral #Jornada7Chakras #FlexByo #HotYoga #YogaCuritiba #Svadhisthana`;

async function uploadFile(filePath, destPath) {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from('media')
    .upload(destPath, fileBuffer, { contentType: 'image/png', upsert: true });
  
  if (error) {
    console.log('Erro upload:', error.message);
    return null;
  }
  const { data: urlData } = supabase.storage.from('media').getPublicUrl(destPath);
  return urlData.publicUrl;
}

async function run() {
  const timestamp = Date.now();
  const imageUrls = [];
  
  // Upload das 6 imagens do carrossel
  for (let i = 1; i <= 6; i++) {
    const num = i.toString().padStart(2, '0');
    const filePath = path.join(basePath, num + '.png');
    console.log('Uploading ' + num + '.png...');
    const url = await uploadFile(filePath, 'flexbyo/carrossel-lancamento-' + timestamp + '-' + i + '.png');
    if (url) imageUrls.push(url);
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('Uploads OK: ' + imageUrls.length + ' imagens');
  
  // Criar conteúdo
  const { data: conteudo, error: cErr } = await supabase
    .from('conteudos')
    .insert({
      org_id: orgId,
      empresa_id: clienteId,
      mes: 2,
      ano: 2026,
      titulo: 'Carrossel Lançamento - Chakra Sacral',
      tipo: 'carrossel',
      legenda: legenda,
      status: 'aguardando_aprovacao',
      midia_urls: imageUrls,
      canais: ['instagram'],
      ordem: 0,
      data_publicacao: '2026-02-24'
    })
    .select()
    .single();
  
  if (cErr) { 
    console.log('Erro conteudo:', cErr.message); 
    return; 
  }
  console.log('Conteudo criado:', conteudo.id);
  
  // Criar token de aprovação
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  const { error: lErr } = await supabase
    .from('aprovacoes_links')
    .insert({
      conteudo_id: conteudo.id,
      token: token,
      status: 'pendente',
      expires_at: expiresAt.toISOString()
    });
  
  if (lErr) { 
    console.log('Erro link:', lErr.message); 
    return; 
  }
  
  console.log('');
  console.log('=== CARROSSEL LANCAMENTO ===');
  console.log('Data: 24/02 | Carrossel Lancamento - Chakra Sacral (6 slides)');
  console.log('Link: https://base-content-studio-v2.vercel.app/aprovacao?token=' + token);
}

run().catch(console.error);
