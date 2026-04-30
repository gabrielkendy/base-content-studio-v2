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

## Workflow padrão pro Claude operar

```
1. Pergunta do usuário: "Sobe um post pra Padaria do Zé com essa legenda…"
   └─ POST /api/agent/conteudos                       ← cria card
   └─ Resposta: { conteudo: { id: "..." } }

2. "Agora gera o link de aprovação"
   └─ POST /api/agent/approvals/link                  ← link público
   └─ Resposta: { link: "https://studio…/aprovacao?token=…" }
   └─ Eu te devolvo o link colado

3. "Manda no WhatsApp pro cliente"
   └─ POST /api/agent/approvals/send                  ← dispara Z-API/n8n

4. Cliente aprova no /aprovacao?token=…
   └─ Status do conteúdo vira "aprovado" automaticamente

5. (Opcional) "Agora publica nas redes"
   └─ POST /api/agent/posts/publish-now
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
