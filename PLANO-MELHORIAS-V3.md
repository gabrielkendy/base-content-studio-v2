# 🚀 PLANO DE MELHORIAS V3 - BASE Content Studio

## 📋 Documento de Especificações
**Branch:** `v3-melhorias`
**Backup:** `backup-v2-stable`
**Data:** 05/02/2026
**Status:** ⏳ AGUARDANDO APROVAÇÃO

---

## 🎯 OBJETIVO GERAL
Aprimorar o BASE Content Studio para ter um workflow completo similar ao mLabs, com foco em:
- Fluxo de aprovação robusto (interna + externa)
- Kanban completo com todos os status
- Histórico de ajustes e comentários
- Integração Upload-Post para agendamento
- UX/UI aprimorada

---

## 📊 ANÁLISE DO mLabs (Referência)

### Workflow Kanban - Colunas:
1. **Rascunho** - Demanda criada, aguardando início
2. **Conteúdo** - Em produção (sub-status: Aguardando texto, Aguardando design)
3. **Aprovação interna** - Revisão da equipe
4. **Aprovação do cliente** - Link enviado pro cliente aprovar
5. **Ajustes** - Cliente pediu alterações
6. **Aguardando agendamento** - Aprovado, aguardando agendar
7. **Aprovado e agendado** - Data/hora definidos
8. **Concluídos** - Publicado

### Card de Demanda:
- Título + ícones editar/deletar
- Avatar do cliente + nome
- Ícone da rede social
- Preview da mídia (Ver mídia)
- Data/hora
- Sub-status badges (Aguardando texto ✓, Design concluído ✓)

### Formulário de Criação:
- Título da demanda
- Perfil (cliente)
- Canais (multi-select com ícones)
- Data prevista + hora
- Agendamento automático (toggle)
- Tags
- Briefing (rich text editor)
- Upload de arquivo (até 50mb)

### Filtros:
- Período (date range)
- Perfil (cliente)
- Status
- Filtro avançado (palavra-chave, responsável, data criação, tags)

---

## 🔧 MELHORIAS ORGANIZADAS POR MÓDULO

---

## MÓDULO 1: WORKFLOW KANBAN APRIMORADO

### 1.1 Novos Status do Workflow
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 3-4h

**Atual (8 status):**
```
nova_solicitacao → rascunho → producao → aprovacao → ajuste → aprovado → agendado → publicado
```

**Novo (10 status - igual mLabs):**
```
rascunho → conteudo → aprovacao_interna → aprovacao_cliente → ajuste → aguardando_agendamento → agendado → publicado → cancelado → arquivado
```

**Tasks:**
- [ ] Atualizar `STATUS_CONFIG` em `lib/utils.ts`
- [ ] Criar sub-status para "Conteúdo": `aguardando_texto`, `aguardando_design`, `texto_concluido`, `design_concluido`
- [ ] Adicionar campo `sub_status` na tabela `conteudos`
- [ ] Atualizar componente Kanban com novas colunas
- [ ] Cores e ícones para cada status

---

### 1.2 Kanban Visual Melhorado
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4-6h

**Tasks:**
- [ ] Redesign do card de demanda:
  - Avatar cliente + nome
  - Ícone(s) da rede social
  - Título com ações (editar/deletar)
  - Preview da mídia (thumbnail)
  - Data/hora publicação
  - Badges de sub-status
- [ ] Colunas colapsáveis (clica pra expandir/recolher)
- [ ] Contador de itens por coluna
- [ ] Drag-and-drop entre colunas (muda status automaticamente)
- [ ] Scroll horizontal suave entre colunas
- [ ] Loading skeleton nos cards

---

### 1.3 Filtros Avançados
**Prioridade:** 🟡 ALTA
**Estimativa:** 3-4h

**Tasks:**
- [ ] Filtro por período (date range picker)
- [ ] Filtro por cliente
- [ ] Filtro por status (multi-select)
- [ ] Filtro avançado em sidebar:
  - Palavra-chave
  - Responsável (membro da equipe)
  - Data de criação
  - Tags
- [ ] Botão "Limpar filtros"
- [ ] Persistir filtros na URL (query params)

---

## MÓDULO 2: APROVAÇÃO INTERNA E EXTERNA

### 2.1 Sistema de Aprovação Interna
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4-5h

**Fluxo:**
1. Designer finaliza conteúdo → clica "Enviar para aprovação interna"
2. Gestor recebe notificação
3. Gestor aprova ✓ ou pede ajuste ✗
4. Se aprovado → avança para "Aprovação Cliente"
5. Se ajuste → volta para "Conteúdo" com comentário

**Tasks:**
- [ ] Criar tabela `approvals`:
```sql
CREATE TABLE approvals (
  id uuid PRIMARY KEY,
  conteudo_id uuid REFERENCES conteudos(id),
  type varchar(20), -- 'internal' | 'external'
  status varchar(20), -- 'pending' | 'approved' | 'rejected'
  reviewer_id uuid REFERENCES members(id),
  reviewer_name varchar(255),
  comment text,
  created_at timestamptz,
  reviewed_at timestamptz
);
```
- [ ] Botão "Enviar para aprovação interna" no card/modal
- [ ] Notificação para gestores quando demanda chega
- [ ] Modal de revisão com botões Aprovar/Pedir Ajuste
- [ ] Campo de comentário obrigatório se pedir ajuste
- [ ] Histórico de aprovações visível no conteúdo

---

### 2.2 Sistema de Aprovação Externa (Cliente)
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 5-6h

**Fluxo:**
1. Após aprovação interna → clica "Enviar para cliente"
2. Sistema gera link público de aprovação
3. Cliente recebe link (email/WhatsApp futuro)
4. Cliente visualiza conteúdo e aprova ✓ ou pede ajuste ✗
5. Se aprovado → avança para "Aguardando agendamento"
6. Se ajuste → volta para "Ajustes" com comentário registrado

**Tasks:**
- [ ] Melhorar página `/aprovacao/[token]`:
  - Preview completo do conteúdo
  - Visualização da mídia (imagem/vídeo/carrossel)
  - Legenda formatada
  - Botões grandes: ✓ Aprovar | ✗ Pedir Ajuste
  - Campo de comentário (obrigatório se ajuste)
  - Nome do aprovador (opcional)
- [ ] Registrar TODOS os comentários de ajuste na tabela `approvals`
- [ ] Histórico de ajustes visível para equipe
- [ ] Notificação quando cliente responde
- [ ] Expiração do link (configurável: 7, 14, 30 dias)
- [ ] Reenviar link se expirado

---

### 2.3 Histórico de Ajustes e Comentários
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 2-3h

**Tasks:**
- [ ] Timeline de eventos no modal do conteúdo:
  - Criado por X em DD/MM
  - Enviado para aprovação interna por X
  - Aprovado internamente por X (comentário)
  - Enviado para cliente
  - Cliente pediu ajuste: "comentário aqui"
  - Ajuste feito por X
  - Cliente aprovou
  - Agendado para DD/MM às HH:MM
  - Publicado
- [ ] Componente `<ApprovalTimeline />` reutilizável
- [ ] Expandir/colapsar histórico

---

## MÓDULO 3: CRIAÇÃO E EDIÇÃO DE DEMANDAS

### 3.1 Formulário de Nova Demanda (Estilo mLabs)
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4-5h

**Campos:**
1. Título da demanda
2. Cliente (dropdown)
3. Canais (multi-select visual com ícones)
4. Data prevista + hora
5. Agendamento automático (toggle)
6. Tags (input com autocomplete)
7. Briefing (rich text editor)
8. Upload de arquivo de referência (até 50mb)

**Tasks:**
- [ ] Criar página `/workflow/nova-demanda` ou modal
- [ ] Seletor de canais com ícones das redes
- [ ] Date picker com hora
- [ ] Toggle "Agendar automaticamente após aprovação"
- [ ] Rich text editor para briefing (TipTap ou similar)
- [ ] Upload de arquivos de referência
- [ ] Botões: Voltar | Salvar rascunho | Criar demanda
- [ ] Validações de campos obrigatórios

---

### 3.2 Modal de Edição de Conteúdo Aprimorado
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 5-6h

**Seções do modal:**
1. **Header:** Título editável, cliente, status atual
2. **Mídia:** Upload/preview de imagens/vídeos, carrossel
3. **Texto:** Legenda com formatação, hashtags
4. **Canais:** Selecionar onde publicar
5. **Agendamento:** Data/hora, toggle auto-agendar
6. **Menções e Colabs:** @ menções, colaboradores
7. **Histórico:** Timeline de aprovações/ajustes
8. **Ações:** Salvar | Enviar aprovação | Deletar

**Tasks:**
- [ ] Redesign do modal `/clientes/[slug]/conteudo/[id]`
- [ ] Tabs: Conteúdo | Mídia | Configurações | Histórico
- [ ] Preview por plataforma (como fica no Instagram vs TikTok)
- [ ] Campo de menções (@usuario)
- [ ] Campo de colaboradores
- [ ] Salvar automaticamente (debounce)

---

### 3.3 Upload de Mídia Melhorado
**Prioridade:** 🟡 ALTA
**Estimativa:** 3-4h

**Tasks:**
- [ ] Drag-and-drop de arquivos
- [ ] Preview de imagens antes de salvar
- [ ] Preview de vídeos (thumbnail + player)
- [ ] Suporte a carrossel (múltiplas imagens)
- [ ] Reordenar imagens do carrossel
- [ ] Validação de formatos e tamanhos
- [ ] Progress bar durante upload
- [ ] Compressão de imagens no client (opcional)

---

## MÓDULO 4: VISÃO POR CLIENTE

### 4.1 Dashboard do Cliente Aprimorado
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4-5h

**Seções:**
- **Redes conectadas** (Upload Post whitelabel) ✅ já existe
- **Visão anual** (grid de meses) ✅ já existe, aprimorar
- **Brand Book** ✅ já existe, ajustar cor de fundo
- **Repositório** ✅ já existe, corrigir preview
- **Acessos** ✅ já existe

**Tasks:**
- [ ] Tabs reorganizadas: Visão Anual | Acessos | Analytics | Brand Book | Repositório | Redes Sociais
- [ ] Melhorar visual da visão anual (cards de mês mais informativos)
- [ ] Cada mês mostra: total posts, aprovados, pendentes, publicados
- [ ] Click no mês abre página do mês

---

### 4.2 Página do Mês Aprimorada
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4-5h

**Estrutura:**
1. **Header:** Navegação entre meses, stats do mês
2. **Datas Importantes:** Calendário com datas do nicho do cliente
3. **Solicitações:** Lista de demandas feitas pelo cliente
4. **Posts:** Grid/lista de conteúdos com preview

**Tasks:**
- [ ] Seção "Datas Importantes do Mês" no topo
- [ ] Puxar datas do calendário anual do cliente
- [ ] Separar visualmente: Solicitações vs Posts
- [ ] Preview de cada post (thumbnail + info básica)
- [ ] Filtro por status dentro do mês
- [ ] Ação rápida: criar conteúdo para data específica

---

### 4.3 Calendário Anual de Datas Importantes
**Prioridade:** 🟡 ALTA
**Estimativa:** 3-4h

**Tasks:**
- [ ] Criar tabela `client_calendar_dates`:
```sql
CREATE TABLE client_calendar_dates (
  id uuid PRIMARY KEY,
  cliente_id uuid REFERENCES clientes(id),
  date date NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  priority varchar(20), -- 'critical', 'high', 'medium', 'low'
  category varchar(50), -- 'feriado', 'comercial', 'institucional', etc.
  created_at timestamptz
);
```
- [ ] Interface para adicionar/editar datas
- [ ] Importar datas de template por nicho
- [ ] Visualização de calendário anual (estilo que criamos)
- [ ] Datas refletem na página do mês

---

## MÓDULO 5: SOLICITAÇÕES DO CLIENTE

### 5.1 Portal de Solicitações Aprimorado
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 3-4h

**Já existe** em `/portal/solicitacoes`, mas precisa:

**Tasks:**
- [ ] Formulário de solicitação mais completo:
  - Título
  - Descrição detalhada (rich text)
  - Tipo de conteúdo desejado (post, reels, stories, carrossel)
  - Referências (upload de imagens/links)
  - Prazo desejado
  - Prioridade
- [ ] Cliente vê status de suas solicitações
- [ ] Notificação quando equipe responde
- [ ] Histórico de solicitações anteriores

---

### 5.2 Integração Solicitação → Workflow
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 2-3h

**Fluxo:**
1. Cliente cria solicitação
2. Solicitação aparece em `/solicitacoes` para equipe
3. Equipe aceita → vira demanda no Kanban (status: rascunho)
4. Solicitação fica vinculada ao conteúdo criado

**Tasks:**
- [ ] Botão "Aceitar e criar demanda" na solicitação
- [ ] Auto-preencher dados da demanda com info da solicitação
- [ ] Link entre solicitação e conteúdo criado
- [ ] Cliente vê andamento da solicitação via portal

---

## MÓDULO 6: AGENDAMENTO E PUBLICAÇÃO

### 6.1 Tela de Agendamento Aprimorada
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4-5h

**Fluxo:**
1. Conteúdo aprovado → status "Aguardando agendamento"
2. Clica no conteúdo → abre modal de agendamento
3. Seleciona data/hora
4. Seleciona canais (pode ajustar por canal)
5. Preview final
6. Clica "Agendar" → integra com Upload-Post API
7. Status muda para "Agendado"

**Tasks:**
- [ ] Modal de agendamento dedicado
- [ ] Calendário visual para escolher data
- [ ] Seletor de horário com sugestões (melhores horários)
- [ ] Legenda customizada por plataforma (opcional)
- [ ] Preview do post por plataforma
- [ ] Integração Upload-Post API
- [ ] Confirmação de agendamento
- [ ] Editar/cancelar agendamento

---

### 6.2 Webhook de Publicação
**Prioridade:** 🟡 ALTA
**Estimativa:** 2-3h

**Tasks:**
- [ ] Endpoint `/api/webhooks/upload-post` para receber confirmação
- [ ] Atualizar status para "Publicado" quando webhook receber
- [ ] Salvar URLs dos posts publicados
- [ ] Notificar equipe quando post for publicado
- [ ] Tratar erros de publicação

---

## MÓDULO 7: BRAND BOOK APRIMORADO

### 7.1 Seções do Brand Book
**Prioridade:** 🟡 ALTA
**Estimativa:** 3-4h

**Seções:**
- Gerenciar Marca (nome, slogan, descrição)
- Manual da Marca (do's e don'ts)
- Logos (upload, variações)
- Paleta de Cores (primária, secundária, accent)
- Tipografia (fontes, uso)
- PDF do Manual (upload)

**NÃO precisa de Persona** (removido por solicitação)

**Tasks:**
- [ ] Remover seção de Persona
- [ ] Ajustar cor de fundo da seção Brand Book
- [ ] Upload de PDF do manual da marca
- [ ] Preview do PDF inline
- [ ] Organizar seções em accordion/tabs

---

## MÓDULO 8: REPOSITÓRIO APRIMORADO

### 8.1 Preview de Arquivos
**Prioridade:** 🟡 ALTA
**Estimativa:** 2-3h

**Problema atual:** Preview só aparece quando clica no arquivo

**Tasks:**
- [ ] Thumbnail visível no grid sem precisar clicar
- [ ] Preview de imagens em tamanho maior ao hover
- [ ] Preview de PDFs (primeira página como thumb)
- [ ] Player de vídeo inline
- [ ] Ícones por tipo de arquivo

---

### 8.2 Organização de Arquivos
**Prioridade:** 🟢 MÉDIA
**Estimativa:** 2-3h

**Pastas sugeridas:**
- Logos
- Apresentações
- Cartões de Visita
- Assinaturas de Email
- Materiais Gerais
- Campanhas (por ano/mês)

**Tasks:**
- [ ] Criar pastas padrão ao cadastrar cliente
- [ ] Mover arquivos entre pastas
- [ ] Busca por nome de arquivo
- [ ] Filtro por tipo de arquivo
- [ ] Download em lote (zip)

---

## MÓDULO 9: ACESSOS E NOTIFICAÇÕES

### 9.1 Gestão de Acessos Aprimorada
**Prioridade:** 🟡 ALTA
**Estimativa:** 2-3h

**Tasks:**
- [ ] Lista de membros com acesso ao cliente
- [ ] Convite por email com template bonito
- [ ] Definir permissões por membro:
  - Visualizar
  - Editar conteúdo
  - Aprovar
  - Publicar
- [ ] Revogar acesso com confirmação
- [ ] Log de acessos

---

### 9.2 Sistema de Notificações
**Prioridade:** 🟡 ALTA
**Estimativa:** 3-4h

**Notificações por email quando:**
- Nova solicitação do cliente
- Conteúdo enviado para aprovação
- Cliente aprovou/pediu ajuste
- Post agendado
- Post publicado
- Novo membro convidado

**Tasks:**
- [ ] Templates de email bonitos (HTML)
- [ ] Configuração de notificações por usuário
- [ ] Toggle on/off por tipo de notificação
- [ ] Fila de envio (não bloquear request)
- [ ] Log de emails enviados

---

## MÓDULO 10: UX/UI GERAL

### 10.1 Melhorias de Interface
**Prioridade:** 🟢 MÉDIA
**Estimativa:** 4-5h

**Tasks:**
- [ ] Skeleton loaders em todas as páginas
- [ ] Toast notifications mais ricas
- [ ] Empty states bonitos e úteis
- [ ] Loading states nos botões
- [ ] Animações suaves (transições de página)
- [ ] Mobile-first em todas as telas
- [ ] Dark mode (futuro)

---

### 10.2 Responsividade
**Prioridade:** 🟡 ALTA
**Estimativa:** 3-4h

**Tasks:**
- [ ] Kanban responsivo (scroll horizontal no mobile)
- [ ] Sidebar colapsável
- [ ] Modais adaptáveis ao tamanho da tela
- [ ] Touch-friendly nos cards (swipe)
- [ ] Testar em dispositivos reais

---

## 📊 RESUMO EXECUTIVO

| Módulo | Prioridade | Estimativa | Status |
|--------|------------|------------|--------|
| 1. Workflow Kanban | 🔴 CRÍTICA | 10-14h | ⏳ |
| 2. Aprovações | 🔴 CRÍTICA | 11-14h | ⏳ |
| 3. Criação/Edição | 🔴 CRÍTICA | 12-15h | ⏳ |
| 4. Visão Cliente | 🔴 CRÍTICA | 11-14h | ⏳ |
| 5. Solicitações | 🔴 CRÍTICA | 5-7h | ⏳ |
| 6. Agendamento | 🔴 CRÍTICA | 6-8h | ⏳ |
| 7. Brand Book | 🟡 ALTA | 3-4h | ⏳ |
| 8. Repositório | 🟡 ALTA | 4-6h | ⏳ |
| 9. Acessos/Notif. | 🟡 ALTA | 5-7h | ⏳ |
| 10. UX/UI | 🟢 MÉDIA | 7-9h | ⏳ |
| **TOTAL** | | **74-98h** | |

---

## 🚦 ORDEM DE EXECUÇÃO RECOMENDADA

### Fase 1 - Core (Crítico)
1. **Módulo 1** - Workflow Kanban (fundação)
2. **Módulo 2** - Sistema de Aprovações (diferencial)
3. **Módulo 3** - Criação/Edição de Demandas

### Fase 2 - Cliente
4. **Módulo 4** - Visão por Cliente
5. **Módulo 5** - Solicitações

### Fase 3 - Publicação
6. **Módulo 6** - Agendamento/Upload-Post

### Fase 4 - Complementar
7. **Módulo 7** - Brand Book
8. **Módulo 8** - Repositório
9. **Módulo 9** - Acessos/Notificações
10. **Módulo 10** - UX/UI

---

## ⚠️ IMPORTANTE

1. **NÃO INICIAR** nenhuma alteração sem aprovação do Kendy
2. Trabalhar no branch `v3-melhorias`
3. Commits pequenos e descritivos
4. Testar cada módulo antes de avançar
5. Backup está em `backup-v2-stable`

---

## 🎯 DIFERENCIAL vs mLabs

O que vamos fazer MELHOR:
- **Calendário de datas por nicho** (mLabs não tem)
- **Portal do cliente mais completo** (mLabs é mais básico)
- **Brand Book integrado** (mLabs não tem)
- **Repositório de arquivos** (mLabs não tem)
- **Histórico de ajustes detalhado**
- **Whitelabel pronto** (já temos)

---

*Plano criado em 05/02/2026 por Max*
*Aguardando aprovação do Kendy para iniciar*
