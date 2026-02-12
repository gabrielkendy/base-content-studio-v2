# 🧪 TESTES - Módulo de Planejamento Anual

> **Data:** 2026-02-12
> **Status:** PRONTO PARA TESTES

---

## 📋 CHECKLIST DE TESTES MANUAIS

### 1. CRUD de Campanhas

- [ ] **Criar campanha**
  - Acessar `/clientes/{slug}/planejamento`
  - Clicar em "Nova Campanha"
  - Preencher todos os campos
  - Verificar se campanha aparece na timeline
  - Verificar se aparece na lista

- [ ] **Editar campanha**
  - Clicar em uma campanha existente
  - Modificar campos (nome, período, status)
  - Salvar e verificar se atualizou

- [ ] **Deletar campanha**
  - Clicar no menu (3 pontos) de uma campanha
  - Selecionar "Excluir"
  - Confirmar exclusão
  - Verificar se foi removida

- [ ] **Duplicar campanha**
  - Clicar no menu de uma campanha
  - Selecionar "Duplicar"
  - Escolher ano de destino
  - Verificar se cópia foi criada

### 2. Status e Progresso

- [ ] **Mudar status**
  - Editar campanha
  - Alterar status (planejada → em_andamento → concluída)
  - Verificar se atualiza na interface
  - Verificar se progresso auto-completa quando concluída

- [ ] **Sincronização de progresso**
  - Vincular conteúdos a uma campanha
  - Mudar status dos conteúdos para "publicado"
  - Verificar se progresso da campanha atualiza automaticamente

### 3. Timeline Visual

- [ ] **Visualização timeline**
  - Verificar se campanhas aparecem como barras coloridas
  - Verificar se período está correto
  - Verificar tooltip no hover

- [ ] **Mês atual destacado**
  - Verificar se o mês atual tem indicador visual

- [ ] **Seletor de ano**
  - Navegar entre anos
  - Verificar se dados atualizam

### 4. Resumo do Ano

- [ ] **Cards de estatísticas**
  - Verificar total de campanhas
  - Verificar contagem por status
  - Verificar progresso médio
  - Verificar orçamento total

### 5. Filtros

- [ ] **Filtrar por status**
  - Selecionar apenas "Em andamento"
  - Verificar se filtra corretamente

- [ ] **Filtrar por tipo**
  - Selecionar tipo específico
  - Verificar resultados

### 6. Relacionamento com Conteúdos

- [ ] **Vincular conteúdos**
  - Abrir modal de edição
  - Vincular conteúdos à campanha
  - Verificar contador de conteúdos

- [ ] **Desvincular conteúdos**
  - Remover vínculos
  - Verificar se atualiza

### 7. Dashboard

- [ ] **Campanhas ativas**
  - Verificar se aparecem no dashboard
  - Verificar link para planejamento

- [ ] **Próximas campanhas**
  - Verificar se mostra campanhas do próximo mês

### 8. Portal do Cliente

- [ ] **Acesso readonly**
  - Acessar como cliente
  - Verificar se não há botões de edição
  - Verificar se timeline aparece
  - Verificar se detalhes aparecem

### 9. Notificações

- [ ] **Criação automática**
  - Criar campanha
  - Verificar se notificações foram agendadas

- [ ] **Cancelamento**
  - Cancelar campanha
  - Verificar se notificações pendentes foram removidas

---

## 🔒 TESTES DE RLS (Row Level Security)

### Isolamento de Organização

- [ ] Usuário da Org A não vê campanhas da Org B
- [ ] Usuário da Org A não consegue criar campanha para cliente da Org B
- [ ] Usuário da Org A não consegue editar campanha da Org B

### Permissões por Role

- [ ] **Admin:** Pode fazer tudo
- [ ] **Gestor:** Pode fazer tudo
- [ ] **Designer:** Pode criar, editar, mas não deletar
- [ ] **Cliente:** Apenas visualização (readonly)

---

## ⚡ TESTES DE PERFORMANCE

### Queries

- [ ] Lista de campanhas carrega em < 500ms
- [ ] Timeline renderiza em < 1s
- [ ] Dashboard campanhas carrega em < 500ms

### N+1 Queries

- [ ] Verificar se não há N+1 ao listar campanhas
- [ ] Verificar se joins estão otimizados

---

## 📱 TESTES RESPONSIVOS

- [ ] Desktop (1920px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

---

## 🐛 BUGS CONHECIDOS

_Nenhum bug conhecido no momento._

---

## ✅ RESULTADO DOS TESTES

| Área | Status | Notas |
|------|--------|-------|
| CRUD | ⏳ | - |
| Status/Progresso | ⏳ | - |
| Timeline | ⏳ | - |
| Resumo | ⏳ | - |
| Filtros | ⏳ | - |
| Conteúdos | ⏳ | - |
| Dashboard | ⏳ | - |
| Portal | ⏳ | - |
| Notificações | ⏳ | - |
| RLS | ⏳ | - |
| Performance | ⏳ | - |
| Responsivo | ⏳ | - |

---

## 📝 COMO TESTAR

### 1. Executar migrations no Supabase

```bash
# Arquivos a executar (em ordem):
1. 20260212_planejamento_anual_v3.sql
2. 20260212_campanha_sync.sql
3. 20260212_campanha_notificacoes.sql
```

### 2. Iniciar servidor de desenvolvimento

```bash
cd base-content-studio-v2
npm run dev
```

### 3. Acessar páginas

- Dashboard: `/`
- Planejamento: `/clientes/{slug}/planejamento`
- Portal: `/portal/planejamento`

---

## 🚀 DEPLOY

Após todos os testes passarem:

1. [ ] Commit das mudanças
2. [ ] Push para branch de desenvolvimento
3. [ ] Criar PR para main
4. [ ] Executar migrations em produção
5. [ ] Deploy do frontend
6. [ ] Verificar em produção

---

**Módulo desenvolvido em:** 2026-02-12
**Tempo total:** ~2 horas
**Total de arquivos criados:** 20+
