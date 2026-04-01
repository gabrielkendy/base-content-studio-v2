# 🔴 RELATÓRIO DE BUGS — BASE Content Studio V2

**Data:** 2026-03-31 | **Autor:** MAX (análise completa do código)
**Repo:** `C:\Users\Gabriel\base-content-studio-v2`
**Deploy:** https://app.agenciabase.tech (Vercel)

---

## BUG #1 — CRÍTICO: Cron de publicação NÃO EXISTE

### Problema
Posts agendados NUNCA são publicados automaticamente.

### Causa Raiz
O `vercel.json` tem apenas 2 crons, mas **FALTA o cron principal**:

```json
// vercel.json ATUAL (QUEBRADO)
{
  "crons": [
    { "path": "/api/cron/trial-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" }
  ]
}
```

A rota `/api/posts/process-scheduled` **EXISTE no código** (`src/app/api/posts/process-scheduled/route.ts`) e funciona perfeitamente — mas **ninguém a chama**.

### Fluxo Quebrado
```
Usuário agenda post → salva em scheduled_posts (status: "scheduled") → ??? → NUNCA PUBLICA
```

### Fix
```json
// vercel.json CORRETO
{
  "crons": [
    { "path": "/api/cron/trial-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" },
    { "path": "/api/posts/process-scheduled", "schedule": "*/5 * * * *" }
  ]
}
```

### Arquivos envolvidos
- `vercel.json` ← EDITAR AQUI
- `src/app/api/posts/process-scheduled/route.ts` ← já existe, não precisa mudar
- `src/app/api/posts/schedule/route.ts` ← salva corretamente, não precisa mudar

---

## BUG #2 — CRÍTICO: `CRON_SECRET` não existe no `.env.local`

### Problema
Mesmo adicionando o cron no `vercel.json`, a rota `/api/posts/process-scheduled` vai retornar **401 Unauthorized** porque valida o `CRON_SECRET`:

```typescript
// process-scheduled/route.ts — linhas relevantes
const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 })
}
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Fix
1. Gerar um secret: qualquer string segura (ex: UUID)
2. Adicionar no `.env.local`:
   ```
   CRON_SECRET=seu-secret-aqui
   ```
3. **IMPORTANTE:** Adicionar também nas **Environment Variables do Vercel** (Settings → Environment Variables)

> **Nota:** O Vercel injeta automaticamente `Authorization: Bearer <CRON_SECRET>` nos cron jobs, então basta a variável existir no Vercel.

---

## BUG #3 — MÉDIO: Username inconsistente entre rotas

### Problema
Duas rotas usam lógicas DIFERENTES para montar o username do Upload-Post:

| Rota | Arquivo | Como monta username |
|------|---------|-------------------|
| `social/status` | `src/app/api/social/status/route.ts` | `cliente.slug` direto |
| `social/connect-url` | `src/app/api/social/connect-url/route.ts` | `buildUsername(org_id, cliente_id, slug)` |
| `process-scheduled` | `src/app/api/posts/process-scheduled/route.ts` | `buildUsername(org_id, cliente_id, slug)` |

### O que `buildUsername()` faz:
```typescript
// upload-post.ts
export function buildUsername(orgId: string, clienteId: string, clienteSlug?: string): string {
  const base = clienteSlug || clienteId.substring(0, 20)
  return base.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove acentos
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
```

Se o slug do NECHIO é `nechio`, então `buildUsername()` retorna `nechio` e `slug` direto também retorna `nechio` — **neste caso específico funciona**, mas é uma bomba-relógio para slugs com acentos/espaços.

### Fix
Padronizar TODAS as rotas para usar `buildUsername()`:
- `src/app/api/social/status/route.ts` → trocar `cliente.slug` por `buildUsername(cliente.org_id, cliente.id, cliente.slug)`

---

## BUG #4 — MÉDIO: `UPLOAD_POST_API_KEY` pode não estar no Vercel

### Problema
A key existe no `.env.local` (local), mas **precisa verificar se está nas Environment Variables do Vercel** (produção).

### Variável no `.env.local`:
```
UPLOAD_POST_API_KEY=eyJhbGciOiJIUzI1NiIs... (JWT válido, email: gabriel.kend@gmail.com)
```

### Fix
Verificar no Vercel Dashboard:
1. Ir em https://vercel.com → projeto `base-content-studio-v2`
2. Settings → Environment Variables
3. Confirmar que `UPLOAD_POST_API_KEY` e `UPLOAD_POST_API_URL` existem em **Production**

---

## BUG #5 — BAIXO: Upload-Post app login é magic link

### Status
Upload-Post está **100% online e funcionando**:
- ✅ API responde (`401 Authorization required` = online)
- ✅ App carrega (`app.upload-post.com`)
- ✅ Login por magic link funciona (testei com `gabriel.kend@gmail.com`)
- ✅ Login por Google também disponível

### Como logar
1. Acessar https://app.upload-post.com
2. Digitar `gabriel.kend@gmail.com`
3. Clicar "Sign in with Email"
4. Checar inbox/spam → clicar no link (expira em 30 min)

---

## RESUMO — O QUE O CLAUDE CODE PRECISA FAZER

### Prioridade 1 (CRÍTICO — sem isso nada publica):
```
1. vercel.json → Adicionar cron para /api/posts/process-scheduled (*/5 * * * *)
2. Gerar CRON_SECRET e adicionar em .env.local
3. Adicionar CRON_SECRET no Vercel Dashboard (Environment Variables → Production)
4. Verificar UPLOAD_POST_API_KEY no Vercel Dashboard
```

### Prioridade 2 (MÉDIO — padronizar):
```
5. src/app/api/social/status/route.ts → usar buildUsername() ao invés de slug direto
```

### Prioridade 3 (VERIFICAÇÃO — confirmar que redes estão conectadas):
```
6. Após fix, acessar app → NECHIO → verificar se Instagram/TikTok estão conectados no Upload-Post
7. Se não conectados → gerar link de conexão e reconectar
```

### Teste após deploy:
```bash
# Testar manualmente o process-scheduled (POST também funciona):
curl -X GET "https://app.agenciabase.tech/api/posts/process-scheduled" \
  -H "Authorization: Bearer SEU_CRON_SECRET"

# Resposta esperada (sem posts pendentes):
# { "message": "No posts to process", "processed": 0 }

# Resposta esperada (com posts):
# { "message": "Processed 3 posts", "processed": 3, "success": 3, "failed": 0 }
```

---

## ARQUIVOS-CHAVE (referência rápida)

| Arquivo | Localização | O que faz |
|---------|------------|-----------|
| `vercel.json` | raiz | Define crons do Vercel |
| `process-scheduled/route.ts` | `src/app/api/posts/process-scheduled/` | Processa posts agendados |
| `schedule/route.ts` | `src/app/api/posts/schedule/` | Salva agendamentos |
| `publish-now/route.ts` | `src/app/api/posts/publish-now/` | Publica imediato |
| `upload-post.ts` | `src/lib/` | Lib v1 (buildUsername, ensureProfile, generateJwtUrl) |
| `upload-post-v2.ts` | `src/lib/` | Lib v2 (criarPerfil, postar, verificarConexoes) |
| `status/route.ts` | `src/app/api/social/` | Verifica redes conectadas (⚠️ usa slug direto) |
| `connect-url/route.ts` | `src/app/api/social/` | Gera link conexão (usa buildUsername) |
| `.env.local` | raiz | Variáveis locais |
