# 🔐 Configuração de Variáveis de Ambiente

## Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Stripe (Pagamentos)

### 1. Crie uma conta no Stripe
- Acesse: https://dashboard.stripe.com

### 2. Obtenha as chaves
```env
STRIPE_SECRET_KEY=sk_live_...      # ou sk_test_... para desenvolvimento
STRIPE_WEBHOOK_SECRET=whsec_...    # Configurado em Webhooks
```

### 3. Crie os produtos e preços no Stripe Dashboard

**Produto: ContentStudio Starter**
- Preço Mensal: R$97/mês → copie o price_id
- Preço Anual: R$924/ano (R$77/mês) → copie o price_id

**Produto: ContentStudio Pro**
- Preço Mensal: R$197/mês → copie o price_id
- Preço Anual: R$1.884/ano (R$157/mês) → copie o price_id

**Produto: ContentStudio Agency**
- Preço Mensal: R$397/mês → copie o price_id
- Preço Anual: R$3.804/ano (R$317/mês) → copie o price_id

```env
NEXT_PUBLIC_STRIPE_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_STARTER_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRO_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_AGENCY_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL=price_...
```

### 4. Configure o Webhook no Stripe
- URL: `https://seu-dominio.com/api/billing/webhook`
- Eventos para escutar:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

### 5. Configure o Customer Portal
- Ative em: https://dashboard.stripe.com/settings/billing/portal
- Permita: Cancelar assinatura, Trocar plano, Ver faturas

## Google OAuth (opcional)

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Configure no Supabase:
1. Dashboard → Authentication → Providers → Google
2. Cole Client ID e Secret
3. Adicione redirect URL no Google Console

## reCAPTCHA (opcional)

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...
RECAPTCHA_SECRET_KEY=6Le...
```

## Email (Resend)

```env
RESEND_API_KEY=re_...
EMAIL_FROM=ContentStudio <noreply@seudominio.com>
```

## App

```env
NEXT_PUBLIC_APP_URL=https://app.seudominio.com
```

---

## 📋 Checklist de Setup

### Stripe
- [ ] Conta criada
- [ ] Produtos criados (Starter, Pro, Agency)
- [ ] Preços criados (mensal e anual para cada)
- [ ] Webhook configurado
- [ ] Customer Portal ativado
- [ ] Chaves adicionadas no .env

### Supabase
- [ ] Projeto criado
- [ ] Tabelas criadas (rodar migration)
- [ ] RLS policies configuradas
- [ ] Google OAuth configurado (opcional)

### Vercel
- [ ] Projeto conectado ao GitHub
- [ ] Variáveis de ambiente adicionadas
- [ ] Domínio configurado

---

## 🚀 Deploy Checklist

1. Configure todas as variáveis no Vercel
2. Rode a migration SQL no Supabase
3. Configure o webhook do Stripe com a URL de produção
4. Teste um checkout completo
5. Verifique se os webhooks estão chegando
