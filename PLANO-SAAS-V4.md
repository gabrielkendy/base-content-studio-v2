# 🚀 BASE Content Studio — Plano de Evolução SaaS v4.0

## Visão
Transformar o Content Studio numa **plataforma completa de gestão de conteúdo + publicação** (tipo mLabs), escalável pra vender como SaaS.

## Stack Atual
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deploy:** Vercel
- **Publicação:** Upload-Post API (a integrar)

---

## 🏗️ FASE 1 — Integração Upload-Post + Agendamento (Sprints 8-10)

### Sprint 8: Conexão de Contas Sociais
**Objetivo:** Cliente/admin conecta redes sociais dentro do Studio
**Prioridade:** 🔴 Alta | **Complexidade:** Alta | **Estimativa:** 4-6h

**Tasks:**
- [ ] Criar tabela `social_accounts` (org_id, cliente_id, platform, profile_id, profile_name, avatar_url, access_token, connected_at, status)
- [ ] Página `/clientes/[slug]/redes` — grid de plataformas (Instagram, TikTok, YouTube, Facebook, LinkedIn, X, Threads, Pinterest)
- [ ] Integração com Upload-Post API para conectar contas via OAuth
- [ ] Flow: Cliente clica "Conectar" → redireciona pro OAuth da plataforma → callback salva token
- [ ] Badge de status (conectado/desconectado) por plataforma
- [ ] Suporte a múltiplos perfis por cliente
- [ ] Página no **Portal do Cliente** (`/portal/redes`) pra cliente conectar suas próprias contas

**Schema:**
```sql
CREATE TABLE social_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  platform varchar(50) NOT NULL, -- instagram, tiktok, youtube, facebook, linkedin, x, threads, pinterest
  profile_id varchar(255), -- ID na plataforma
  profile_name varchar(255),
  profile_avatar varchar(500),
  upload_post_user_id varchar(255), -- ID do user no Upload-Post
  access_token text, -- encrypted
  status varchar(20) DEFAULT 'active',
  connected_at timestamptz DEFAULT now(),
  UNIQUE(cliente_id, platform, profile_id)
);
```

---

### Sprint 9: Agendamento e Publicação de Posts
**Objetivo:** Agendar e publicar conteúdo direto nas redes via Upload-Post API
**Prioridade:** 🔴 Alta | **Complexidade:** Alta | **Estimativa:** 6-8h

**Tasks:**
- [ ] Criar tabela `scheduled_posts` (conteudo_id, platforms[], scheduled_at, status, upload_post_response, published_urls)
- [ ] Tela de agendamento dentro do conteúdo — seleciona canais + data/hora
- [ ] Preview do post por plataforma (como mLabs faz)
- [ ] Integração Upload-Post API: POST /api/upload com multipart
- [ ] Suporte a: imagem, carrossel, vídeo/reels, stories
- [ ] Status tracking: agendado → publicando → publicado / erro
- [ ] Webhook do Upload-Post pra receber confirmação de publicação
- [ ] Campo legenda por plataforma (pode variar)
- [ ] Seleção de "Melhores horários" (baseado em analytics futuros)
- [ ] Calendário visual de posts agendados (`/calendario` com integração)

**Schema:**
```sql
CREATE TABLE scheduled_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  conteudo_id uuid REFERENCES conteudos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  platforms jsonb NOT NULL, -- [{platform: "instagram", profile_id: "xxx", caption: "..."}]
  media_urls text[],
  scheduled_at timestamptz NOT NULL,
  published_at timestamptz,
  status varchar(30) DEFAULT 'scheduled', -- scheduled, publishing, published, failed, cancelled
  upload_post_response jsonb,
  published_urls jsonb, -- [{platform: "instagram", url: "https://..."}]
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

**API Endpoints:**
- `POST /api/posts/schedule` — agenda post
- `POST /api/posts/publish-now` — publica imediatamente
- `POST /api/webhooks/upload-post` — recebe callback
- `GET /api/posts/calendar` — lista agendamentos

---

### Sprint 10: Analytics das Redes Sociais
**Objetivo:** Dashboard de métricas por plataforma (como mLabs)
**Prioridade:** 🟡 Média | **Complexidade:** Média | **Estimativa:** 4-6h

**Tasks:**
- [ ] Criar tabela `analytics_snapshots` (account_id, date, followers, views, likes, comments, engagement_rate, reach)
- [ ] Cron job diário pra buscar métricas via Upload-Post API
- [ ] Dashboard Analytics por cliente (`/clientes/[slug]/analytics`)
  - Resumo geral do perfil (seguidores, alcance, engajamento)
  - Gráfico de crescimento de seguidores
  - Top posts por engajamento
  - Métricas por tipo (reels, posts, stories)
  - Comparativo mensal
- [ ] Analytics no **Portal do Cliente** (`/portal/analytics`)
- [ ] Widget de métricas rápidas no Dashboard admin
- [ ] Export de relatório em PDF (futuro)

---

## 🗂️ FASE 2 — Repositório de Brand Assets (Sprints 11-12)

### Sprint 11: Repositório de Arquivos por Cliente
**Objetivo:** Cada cliente tem pastas organizadas com seus assets
**Prioridade:** 🔴 Alta | **Complexidade:** Média | **Estimativa:** 4-5h

**Tasks:**
- [ ] Criar tabela `client_assets` (cliente_id, folder, filename, file_url, file_type, file_size, tags, uploaded_by)
- [ ] Estrutura de pastas padrão: Logos, Fontes, Paleta, Fotos, Vídeos, Documentos, Briefings
- [ ] Página `/clientes/[slug]/repositorio` — file browser com:
  - Grid/lista de arquivos com thumbnails
  - Upload drag-n-drop (multiple files)
  - Criar/renomear pastas
  - Mover arquivos entre pastas
  - Tags e busca
  - Preview inline (imagens, PDFs)
  - Download individual e em lote
- [ ] Supabase Storage buckets organizados por org/cliente/pasta
- [ ] Limite de storage por plano (SaaS)

**Schema:**
```sql
CREATE TABLE client_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  folder varchar(255) DEFAULT '/',
  filename varchar(500) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(100), -- image/png, application/pdf, etc
  file_size bigint,
  thumbnail_url text,
  tags text[],
  description text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

---

### Sprint 12: Perfil Avançado do Cliente (Brand Book)
**Objetivo:** Cada cliente tem perfil completo — identidade visual, guidelines, personas
**Prioridade:** 🟡 Média | **Complexidade:** Média | **Estimativa:** 3-4h

**Tasks:**
- [ ] Expandir tabela `clientes` com campos:
  - `brand_guidelines` (jsonb) — tom de voz, do's e don'ts, referências
  - `color_palette` (jsonb) — primária, secundária, accent, backgrounds
  - `fonts` (jsonb) — principal, secundária, decorativa
  - `personas` (jsonb) — público-alvo detalhado
  - `bio` (text) — descrição completa do negócio
  - `social_links` (jsonb) — links oficiais
- [ ] Página `/clientes/[slug]/brand` — Brand Book digital:
  - Paleta de cores (click to copy hex)
  - Tipografia com preview
  - Logos (do repositório)
  - Tom de voz e guidelines
  - Personas do público
- [ ] Portal do cliente pode ver (read-only) seu próprio brand book
- [ ] Template de Brand Book exportável em PDF

---

## ⚡ FASE 3 — Refinamento Avançado + SaaS Ready (Sprints 13-16)

### Sprint 13: UX/UI Premium + Mobile First
**Objetivo:** Interface polida, animações, dark mode, 100% mobile
**Prioridade:** 🟡 Média | **Complexidade:** Média | **Estimativa:** 4-5h

**Tasks:**
- [ ] Dark mode completo (toggle no header)
- [ ] Animações suaves (Framer Motion) — transições de página, modais, cards
- [ ] Skeleton loaders em todas as páginas
- [ ] Responsividade 100% mobile (testar cada página)
- [ ] PWA (Progressive Web App) — instalar no celular
- [ ] Favicon e splash screen personalizados por org
- [ ] Onboarding wizard pra primeiro acesso (tour da plataforma)
- [ ] Empty states bonitos e úteis
- [ ] Toast/notificações mais ricas (com ações inline)
- [ ] Atalhos de teclado (K pra busca, N pra novo, etc)

---

### Sprint 14: Sistema de Planos e Billing (SaaS)
**Objetivo:** Multi-tenant com planos, limites e cobrança
**Prioridade:** 🔴 Alta (pra vender) | **Complexidade:** Alta | **Estimativa:** 6-8h

**Tasks:**
- [ ] Definir planos: Free, Starter, Pro, Agency
  - **Free:** 1 cliente, 5 conteúdos/mês, 1 usuário, sem agendamento
  - **Starter:** 3 clientes, 30 conteúdos/mês, 3 usuários, 2 perfis sociais — R$97/mês
  - **Pro:** 10 clientes, ilimitado, 10 usuários, 5 perfis — R$197/mês
  - **Agency:** Ilimitado tudo, whitelabel, API — R$397/mês
- [ ] Tabela `subscriptions` (org_id, plan, status, started_at, expires_at, stripe_id)
- [ ] Integração Stripe (checkout, portal, webhooks)
- [ ] Middleware de limites (checar plano antes de criar cliente/conteúdo)
- [ ] Página de pricing pública (`/pricing`)
- [ ] Dashboard de billing (`/configuracoes/billing`)
- [ ] Trial de 14 dias pro Starter

---

### Sprint 15: Whitelabel + Domínio Customizado
**Objetivo:** Cada agência pode ter sua própria marca no Studio
**Prioridade:** 🟡 Média | **Complexidade:** Média | **Estimativa:** 3-4h

**Tasks:**
- [ ] Customização completa: logo, cores, nome, favicon
- [ ] Domínio customizado (CNAME → Vercel)
- [ ] Email templates com branding da org
- [ ] Remoção de "BASE Content Studio" — marca da agência em tudo
- [ ] Landing page customizável da org

---

### Sprint 16: API Pública + Integrações
**Objetivo:** API REST pra terceiros integrarem com o Studio
**Prioridade:** 🟢 Baixa | **Complexidade:** Alta | **Estimativa:** 5-6h

**Tasks:**
- [ ] API keys por org
- [ ] Endpoints: /api/v1/conteudos, /api/v1/clientes, /api/v1/schedule
- [ ] Documentação Swagger/OpenAPI
- [ ] Webhook events (conteúdo criado, aprovado, publicado)
- [ ] Integração n8n nativa
- [ ] Zapier/Make templates

---

## 📋 RESUMO EXECUTIVO

| Fase | Sprints | Foco | Estimativa |
|------|---------|------|------------|
| **Fase 1** | 8-10 | Upload-Post + Agendamento + Analytics | 14-20h |
| **Fase 2** | 11-12 | Repositório + Brand Book | 7-9h |
| **Fase 3** | 13-16 | UI Premium + SaaS + Whitelabel + API | 18-23h |
| **TOTAL** | 9 sprints | Plataforma completa vendável | 39-52h |

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Sprint 8** — Conectar contas sociais (fundação pra tudo)
2. **Sprint 9** — Agendamento + publicação (killer feature)
3. **Sprint 11** — Repositório de arquivos (valor imediato pro Kendy)
4. **Sprint 12** — Brand Book por cliente
5. **Sprint 10** — Analytics
6. **Sprint 13** — UI/UX Premium
7. **Sprint 14** — Billing/SaaS (quando for vender)
8. **Sprint 15** — Whitelabel
9. **Sprint 16** — API pública

## 💰 MODELO DE RECEITA PROJETADO

Com 50 agências pagando média R$197/mês:
- **MRR:** R$9.850/mês
- **ARR:** R$118.200/ano
- **Custos estimados:** ~R$500/mês (Vercel Pro + Supabase Pro + Upload-Post)
- **Margem:** ~95%

---

*Plano criado em 01/02/2026. Aprovação pendente do Kendy.*
