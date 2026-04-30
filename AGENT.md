# Agent API — Como subir posts e administrar via Claude

API consolidada em `/api/agent/*` que permite operar a plataforma BASE Content
Studio programaticamente. Pensada pra eu (Claude) atuar como agente operacional:
criar clientes, subir conteúdos, gerar links de aprovação, publicar nas redes.

## Setup

Adicione no Vercel (ou `.env.local`):

```env
AGENT_API_TOKEN=<gere um token forte: openssl rand -hex 32>
AGENT_ORG_ID=<uuid da org principal>   # opcional — pega a primeira se não setado
ADMIN_EMAILS=gabriel.kend@gmail.com    # já existe; sessão admin também autentica
```

`AGENT_API_TOKEN` aceita CSV pra rotação: `token1,token2`.

## Auth

Todo endpoint aceita um dos dois:
1. **Token bearer** (recomendado pra agente):
   ```
   Authorization: Bearer <AGENT_API_TOKEN>
   ```
   Ou via query string: `?token=<AGENT_API_TOKEN>`
2. **Sessão de email admin** (cookie + email em `ADMIN_EMAILS`).

## Base URL

- Produção: `https://app.agenciabase.tech/api/agent`
- Dev:      `http://localhost:3000/api/agent`

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET  | `/api/agent` | Descritor (lista os endpoints) |
| GET  | `/api/agent/clientes?q=` | Lista clientes |
| POST | `/api/agent/clientes` | Cria cliente + perfil Upload-Post |
| GET  | `/api/agent/clientes/:slug` | Detalhe + redes + aprovadores |
| GET  | `/api/agent/conteudos?cliente=&status=` | Lista conteúdos |
| POST | `/api/agent/conteudos` | Cria conteúdo (card workflow) |
| GET  | `/api/agent/demandas?cliente=&status=` | Lista solicitações |
| POST | `/api/agent/demandas` | Cria solicitação (briefing do cliente) |
| POST | `/api/agent/posts/publish-now` | Publica imediatamente nas redes |
| POST | `/api/agent/posts/schedule` | Agenda post pra futuro |
| POST | `/api/agent/approvals/link` | Gera link público |
| POST | `/api/agent/approvals/send` | Gera link + envia WhatsApp |
| GET  | `/api/agent/approvals/:conteudo_id` | Status dos links de aprovação |
| GET  | `/api/agent/social/:slug` | Status das redes conectadas |
| POST | `/api/agent/media` | Sobe arquivo/URL/base64 → URL pública no storage |

## Identificação de cliente

Os endpoints aceitam:
- `cliente: "slug-do-cliente"` (string — atalho)
- `cliente_slug: "slug"`
- `cliente_id: "uuid"`
- `cliente_nome: "Nome exato do cliente"`

## Exemplos práticos

### Criar cliente novo
```bash
curl -X POST https://app.agenciabase.tech/api/agent/clientes \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Padaria do Zé",
    "contato": "(11) 98765-4321",
    "email_cliente": "ze@padaria.com"
  }'
```

### Criar conteúdo (card no workflow)
```bash
curl -X POST https://app.agenciabase.tech/api/agent/conteudos \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": "padaria-do-ze",
    "titulo": "Promo de pão de queijo — Sexta",
    "legenda": "Sextou com pão de queijo quentinho! 🧀\n\n#padariadoze #paodequeijo",
    "canais": ["instagram", "facebook"],
    "data_publicacao": "2026-05-09",
    "midia_urls": ["https://storage.../pao.jpg"],
    "status": "producao"
  }'
```

### Gerar link de aprovação pra mandar pro cliente
```bash
curl -X POST https://app.agenciabase.tech/api/agent/approvals/link \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "conteudo_id": "<uuid>" }'

# Resposta:
# { "success": true, "link": "https://studio.agenciabase.tech/aprovacao?token=...", "expires_at": "..." }
```

### Enviar aprovação via WhatsApp pros aprovadores cadastrados
```bash
curl -X POST https://app.agenciabase.tech/api/agent/approvals/send \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "conteudo_id": "<uuid>" }'
```

### Publicar agora nas redes
```bash
curl -X POST https://app.agenciabase.tech/api/agent/posts/publish-now \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": "padaria-do-ze",
    "platforms": ["instagram", "facebook"],
    "caption": "Sextou! 🧀",
    "hashtags": ["#paodequeijo", "#sextou"],
    "media_urls": ["https://storage.../pao.jpg"]
  }'
```

### Agendar post pra dia/hora específicos
```bash
curl -X POST https://app.agenciabase.tech/api/agent/posts/schedule \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": "padaria-do-ze",
    "platforms": ["instagram"],
    "caption": "Bom dia! ☕",
    "media_urls": ["https://..."],
    "scheduled_at": "2026-05-12T08:00",
    "timezone": "America/Sao_Paulo"
  }'
```

### Verificar redes conectadas antes de publicar
```bash
curl -H "Authorization: Bearer $AGENT_API_TOKEN" \
  https://app.agenciabase.tech/api/agent/social/padaria-do-ze
```

### Subir uma imagem/vídeo pro storage (3 modos)

**A) Arquivo local (multipart):**
```bash
curl -X POST https://app.agenciabase.tech/api/agent/media \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -F "file=@/caminho/foto.jpg" \
  -F "cliente=padaria-do-ze"
# → { "url": "https://...supabase.../post-media/.../foto.jpg", ... }
```

**B) Fazer mirror de uma URL externa (Drive público, Imgur, etc.):**
```bash
curl -X POST https://app.agenciabase.tech/api/agent/media \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": "padaria-do-ze",
    "source_url": "https://i.imgur.com/abc123.jpg",
    "filename": "promo-sexta.jpg"
  }'
```

**C) Base64 (útil quando o agente recebe imagem inline):**
```bash
curl -X POST https://app.agenciabase.tech/api/agent/media \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": "padaria-do-ze",
    "filename": "post.jpg",
    "base64": "data:image/jpeg;base64,/9j/4AAQ..."
  }'
```

## Workflow padrão pro Claude operar

Cenário típico — usuário diz: *"Sobe um post pra Padaria do Zé com essa imagem
e essa legenda"*

```
1. POST /api/agent/media                             ← sobe a(s) imagem(ns)
   body: { cliente: "padaria-do-ze", source_url: "https://..." }
   →  { url: "https://...supabase.../foto.jpg" }

2. POST /api/agent/conteudos                         ← cria card no workflow
   body: {
     cliente: "padaria-do-ze",
     titulo: "Promo Sexta",
     legenda: "Sextou! 🧀 #pão",
     midia_urls: ["https://...supabase.../foto.jpg"],
     canais: ["instagram", "facebook"],
     status: "aprovacao"
   }
   →  { conteudo: { id: "<uuid>" } }

3. POST /api/agent/approvals/link                    ← gera link público
   body: { conteudo_id: "<uuid>" }
   →  { link: "https://studio.agenciabase.tech/aprovacao?token=..." }
   ← devolve esse link colado pro usuário

4. (opcional) POST /api/agent/approvals/send         ← manda WhatsApp também

5. Cliente abre o link, aprova → status do conteúdo vira "aprovacao"

6. (opcional) POST /api/agent/posts/publish-now      ← publica nas redes
   body: { cliente, platforms, caption, media_urls, cover_url }
```

## Status válidos

Conteúdo: `backlog | ideia | producao | aprovacao_interna | aprovacao | agendado | publicado`

Demandas: `pendente | aceita | em_producao | concluida | cancelada | recusada`

Prioridades demanda: `baixa | normal | alta | urgente`

Categorias: `post_social | material_grafico | apresentacao | video_offline`

## Segurança

- Service role bypassa RLS — todos os endpoints filtram por `org_id` no código.
- Token deve ser secreto. Rotacione com CSV: `AGENT_API_TOKEN=novo,velho` durante a transição.
- Logs de uso ficam em `Vercel → Logs` por padrão.
