# 🛠️ PLANO TÉCNICO DETALHADO
## Módulo de Planejamento Anual — BASE Content Studio v2

> **Status:** AGUARDANDO APROVAÇÃO FINAL
> **Data:** 12/02/2026
> **Estimativa Total:** 10-12 horas
> **Prioridade:** Alta

---

# 📋 ÍNDICE

1. [Fase 1: Banco de Dados](#fase-1-banco-de-dados)
2. [Fase 2: Backend - Server Actions](#fase-2-backend-server-actions)
3. [Fase 3: Tipos e Validações](#fase-3-tipos-e-validações)
4. [Fase 4: Componentes UI](#fase-4-componentes-ui)
5. [Fase 5: Páginas](#fase-5-páginas)
6. [Fase 6: Integrações e Sincronização](#fase-6-integrações-e-sincronização)
7. [Fase 7: Notificações](#fase-7-notificações)
8. [Fase 8: Portal do Cliente](#fase-8-portal-do-cliente)
9. [Fase 9: Testes e Validação](#fase-9-testes-e-validação)
10. [Checklist Final](#checklist-final)

---

# FASE 1: BANCO DE DADOS
**Tempo estimado:** 1 hora

## Task 1.1: Criar tabela `campanhas`

```sql
-- =====================================================
-- TABELA: campanhas
-- Armazena campanhas/ações planejadas por cliente/ano
-- =====================================================

CREATE TABLE campanhas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Identificação
  nome varchar(255) NOT NULL,
  slug varchar(255),
  descricao text,
  objetivo text,
  acoes_planejadas text,                -- Lista de ações em texto ou markdown
  
  -- Período
  ano int NOT NULL,
  mes_inicio int NOT NULL CHECK (mes_inicio >= 1 AND mes_inicio <= 12),
  mes_fim int NOT NULL CHECK (mes_fim >= 1 AND mes_fim <= 12),
  data_inicio date,                      -- Data específica (opcional)
  data_fim date,                         -- Data específica (opcional)
  
  -- Categorização
  tipo varchar(50) DEFAULT 'campanha',   -- campanha, data_comemorativa, lancamento, institucional, promocao, awareness
  cor varchar(7) DEFAULT '#3B82F6',      -- Cor hex para visualização
  icone varchar(50),                     -- Emoji ou nome do ícone
  prioridade int DEFAULT 2,              -- 1=baixa, 2=média, 3=alta
  
  -- Metas e Orçamento
  meta_principal text,
  meta_secundaria text,
  kpi_esperado jsonb,                    -- {"engajamento": 30, "leads": 50, "vendas": 10000}
  orcamento decimal(12,2),
  
  -- Status e Progresso
  status varchar(30) DEFAULT 'planejada', -- planejada, em_andamento, pausada, concluida, cancelada
  progresso int DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  
  -- Relacionamentos
  responsavel_id uuid REFERENCES auth.users(id),
  
  -- Metadados
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT mes_fim_valido CHECK (mes_fim >= mes_inicio OR mes_fim < mes_inicio) -- permite campanhas que cruzam o ano
);

-- Comentários
COMMENT ON TABLE campanhas IS 'Campanhas e ações planejadas por cliente/ano';
COMMENT ON COLUMN campanhas.kpi_esperado IS 'KPIs esperados em formato JSON';
COMMENT ON COLUMN campanhas.acoes_planejadas IS 'Lista de ações em markdown';
```

## Task 1.2: Criar tabela `campanha_conteudos` (relacionamento)

```sql
-- =====================================================
-- TABELA: campanha_conteudos
-- Relaciona campanhas com conteúdos específicos
-- =====================================================

CREATE TABLE campanha_conteudos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  conteudo_id uuid NOT NULL REFERENCES conteudos(id) ON DELETE CASCADE,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(campanha_id, conteudo_id)
);

COMMENT ON TABLE campanha_conteudos IS 'Relacionamento N:N entre campanhas e conteúdos';
```

## Task 1.3: Criar tabela `campanha_historico` (auditoria)

```sql
-- =====================================================
-- TABELA: campanha_historico
-- Log de alterações nas campanhas
-- =====================================================

CREATE TABLE campanha_historico (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  acao varchar(50) NOT NULL,             -- created, updated, status_changed, deleted
  campo_alterado varchar(100),
  valor_anterior text,
  valor_novo text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campanha_historico_campanha ON campanha_historico(campanha_id);
```

## Task 1.4: Criar índices

```sql
-- Índices para performance
CREATE INDEX idx_campanhas_org ON campanhas(org_id);
CREATE INDEX idx_campanhas_cliente ON campanhas(cliente_id);
CREATE INDEX idx_campanhas_ano ON campanhas(ano);
CREATE INDEX idx_campanhas_status ON campanhas(status);
CREATE INDEX idx_campanhas_periodo ON campanhas(ano, mes_inicio, mes_fim);
CREATE INDEX idx_campanhas_cliente_ano ON campanhas(cliente_id, ano);

-- Índice para busca por texto
CREATE INDEX idx_campanhas_nome_search ON campanhas USING gin(to_tsvector('portuguese', nome));
```

## Task 1.5: Configurar RLS (Row Level Security)

```sql
-- Habilitar RLS
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para campanhas
CREATE POLICY "Usuários podem ver campanhas da sua org"
  ON campanhas FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar campanhas na sua org"
  ON campanhas FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar campanhas da sua org"
  ON campanhas FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar campanhas da sua org"
  ON campanhas FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

-- Políticas similares para campanha_conteudos e campanha_historico
CREATE POLICY "Usuários podem ver relações de campanhas da sua org"
  ON campanha_conteudos FOR SELECT
  USING (campanha_id IN (
    SELECT id FROM campanhas WHERE org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Usuários podem gerenciar relações de campanhas da sua org"
  ON campanha_conteudos FOR ALL
  USING (campanha_id IN (
    SELECT id FROM campanhas WHERE org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  ));
```

## Task 1.6: Criar triggers

```sql
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_campanhas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campanhas_updated_at
  BEFORE UPDATE ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION update_campanhas_updated_at();

-- Trigger para gerar slug automático
CREATE OR REPLACE FUNCTION generate_campanha_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(unaccent(NEW.nome), '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campanhas_generate_slug
  BEFORE INSERT ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION generate_campanha_slug();

-- Trigger para log de histórico
CREATE OR REPLACE FUNCTION log_campanha_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO campanha_historico (campanha_id, acao, user_id)
    VALUES (NEW.id, 'created', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO campanha_historico (campanha_id, acao, campo_alterado, valor_anterior, valor_novo, user_id)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, NEW.updated_by);
    END IF;
    -- Log outras mudanças importantes
    IF OLD.nome IS DISTINCT FROM NEW.nome THEN
      INSERT INTO campanha_historico (campanha_id, acao, campo_alterado, valor_anterior, valor_novo, user_id)
      VALUES (NEW.id, 'updated', 'nome', OLD.nome, NEW.nome, NEW.updated_by);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO campanha_historico (campanha_id, acao, user_id)
    VALUES (OLD.id, 'deleted', auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campanhas_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON campanhas
  FOR EACH ROW
  EXECUTE FUNCTION log_campanha_changes();
```

## Task 1.7: Criar views úteis

```sql
-- View: Campanhas com estatísticas
CREATE OR REPLACE VIEW v_campanhas_stats AS
SELECT 
  c.*,
  COUNT(cc.id) as total_conteudos,
  COUNT(CASE WHEN cont.status = 'publicado' THEN 1 END) as conteudos_publicados,
  ROUND(COUNT(CASE WHEN cont.status = 'publicado' THEN 1 END)::numeric / 
        NULLIF(COUNT(cc.id), 0) * 100, 0) as percentual_publicado
FROM campanhas c
LEFT JOIN campanha_conteudos cc ON c.id = cc.campanha_id
LEFT JOIN conteudos cont ON cc.conteudo_id = cont.id
GROUP BY c.id;

-- View: Resumo anual por cliente
CREATE OR REPLACE VIEW v_planejamento_anual AS
SELECT 
  cliente_id,
  ano,
  COUNT(*) as total_campanhas,
  COUNT(CASE WHEN status = 'planejada' THEN 1 END) as planejadas,
  COUNT(CASE WHEN status = 'em_andamento' THEN 1 END) as em_andamento,
  COUNT(CASE WHEN status = 'concluida' THEN 1 END) as concluidas,
  COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas,
  SUM(orcamento) as orcamento_total
FROM campanhas
GROUP BY cliente_id, ano;
```

## Task 1.8: Criar função para verificar conflitos

```sql
-- Função para verificar campanhas no mesmo período
CREATE OR REPLACE FUNCTION get_campanhas_conflitantes(
  p_cliente_id uuid,
  p_ano int,
  p_mes_inicio int,
  p_mes_fim int,
  p_excluir_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, nome varchar, mes_inicio int, mes_fim int) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.nome, c.mes_inicio, c.mes_fim
  FROM campanhas c
  WHERE c.cliente_id = p_cliente_id
    AND c.ano = p_ano
    AND c.id IS DISTINCT FROM p_excluir_id
    AND (
      (p_mes_inicio BETWEEN c.mes_inicio AND c.mes_fim)
      OR (p_mes_fim BETWEEN c.mes_inicio AND c.mes_fim)
      OR (c.mes_inicio BETWEEN p_mes_inicio AND p_mes_fim)
    );
END;
$$ LANGUAGE plpgsql;
```

---

# FASE 2: BACKEND - SERVER ACTIONS
**Tempo estimado:** 2-3 horas

## Task 2.1: Criar types

**Arquivo:** `src/types/campanha.ts`

```typescript
// Types para Campanhas
export type CampanhaTipo = 
  | 'campanha' 
  | 'data_comemorativa' 
  | 'lancamento' 
  | 'institucional' 
  | 'promocao' 
  | 'awareness';

export type CampanhaStatus = 
  | 'planejada' 
  | 'em_andamento' 
  | 'pausada' 
  | 'concluida' 
  | 'cancelada';

export type CampanhaPrioridade = 1 | 2 | 3; // baixa, média, alta

export interface CampanhaKPI {
  engajamento?: number;
  leads?: number;
  vendas?: number;
  alcance?: number;
  [key: string]: number | undefined;
}

export interface Campanha {
  id: string;
  org_id: string;
  cliente_id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  objetivo: string | null;
  acoes_planejadas: string | null;
  ano: number;
  mes_inicio: number;
  mes_fim: number;
  data_inicio: string | null;
  data_fim: string | null;
  tipo: CampanhaTipo;
  cor: string;
  icone: string | null;
  prioridade: CampanhaPrioridade;
  meta_principal: string | null;
  meta_secundaria: string | null;
  kpi_esperado: CampanhaKPI | null;
  orcamento: number | null;
  status: CampanhaStatus;
  progresso: number;
  responsavel_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampanhaComStats extends Campanha {
  total_conteudos: number;
  conteudos_publicados: number;
  percentual_publicado: number;
}

export interface CampanhaInput {
  nome: string;
  cliente_id: string;
  ano: number;
  mes_inicio: number;
  mes_fim: number;
  descricao?: string;
  objetivo?: string;
  acoes_planejadas?: string;
  tipo?: CampanhaTipo;
  cor?: string;
  icone?: string;
  prioridade?: CampanhaPrioridade;
  meta_principal?: string;
  meta_secundaria?: string;
  kpi_esperado?: CampanhaKPI;
  orcamento?: number;
  status?: CampanhaStatus;
  responsavel_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface PlanejamentoAnualStats {
  cliente_id: string;
  ano: number;
  total_campanhas: number;
  planejadas: number;
  em_andamento: number;
  concluidas: number;
  canceladas: number;
  orcamento_total: number;
}

export interface CampanhaHistorico {
  id: string;
  campanha_id: string;
  acao: string;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  user_id: string | null;
  created_at: string;
}

// Constantes
export const CAMPANHA_TIPOS: Record<CampanhaTipo, { label: string; cor: string; icone: string }> = {
  campanha: { label: 'Campanha', cor: '#3B82F6', icone: '🎯' },
  data_comemorativa: { label: 'Data Comemorativa', cor: '#F97316', icone: '📅' },
  lancamento: { label: 'Lançamento', cor: '#22C55E', icone: '🚀' },
  institucional: { label: 'Institucional', cor: '#8B5CF6', icone: '🏢' },
  promocao: { label: 'Promoção', cor: '#EF4444', icone: '🏷️' },
  awareness: { label: 'Awareness', cor: '#EAB308', icone: '💡' },
};

export const CAMPANHA_STATUS: Record<CampanhaStatus, { label: string; cor: string; icone: string }> = {
  planejada: { label: 'Planejada', cor: '#6B7280', icone: '📋' },
  em_andamento: { label: 'Em Andamento', cor: '#3B82F6', icone: '🔄' },
  pausada: { label: 'Pausada', cor: '#F59E0B', icone: '⏸️' },
  concluida: { label: 'Concluída', cor: '#22C55E', icone: '✅' },
  cancelada: { label: 'Cancelada', cor: '#EF4444', icone: '❌' },
};

export const MESES = [
  { value: 1, label: 'Janeiro', short: 'Jan' },
  { value: 2, label: 'Fevereiro', short: 'Fev' },
  { value: 3, label: 'Março', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Maio', short: 'Mai' },
  { value: 6, label: 'Junho', short: 'Jun' },
  { value: 7, label: 'Julho', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Setembro', short: 'Set' },
  { value: 10, label: 'Outubro', short: 'Out' },
  { value: 11, label: 'Novembro', short: 'Nov' },
  { value: 12, label: 'Dezembro', short: 'Dez' },
];
```

## Task 2.2: Criar validações com Zod

**Arquivo:** `src/lib/validations/campanha.ts`

```typescript
import { z } from 'zod';

export const campanhaInputSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255),
  cliente_id: z.string().uuid('ID do cliente inválido'),
  ano: z.number().int().min(2020).max(2100),
  mes_inicio: z.number().int().min(1).max(12),
  mes_fim: z.number().int().min(1).max(12),
  descricao: z.string().max(5000).optional().nullable(),
  objetivo: z.string().max(2000).optional().nullable(),
  acoes_planejadas: z.string().max(10000).optional().nullable(),
  tipo: z.enum(['campanha', 'data_comemorativa', 'lancamento', 'institucional', 'promocao', 'awareness']).default('campanha'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').default('#3B82F6'),
  icone: z.string().max(50).optional().nullable(),
  prioridade: z.number().int().min(1).max(3).default(2),
  meta_principal: z.string().max(500).optional().nullable(),
  meta_secundaria: z.string().max(500).optional().nullable(),
  kpi_esperado: z.record(z.number()).optional().nullable(),
  orcamento: z.number().min(0).optional().nullable(),
  status: z.enum(['planejada', 'em_andamento', 'pausada', 'concluida', 'cancelada']).default('planejada'),
  responsavel_id: z.string().uuid().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
}).refine(
  (data) => data.mes_fim >= data.mes_inicio,
  { message: 'Mês fim deve ser maior ou igual ao mês início', path: ['mes_fim'] }
);

export const campanhaUpdateSchema = campanhaInputSchema.partial().omit({ cliente_id: true });

export type CampanhaInputValidated = z.infer<typeof campanhaInputSchema>;
```

## Task 2.3: Criar Server Actions

**Arquivo:** `src/lib/actions/campanhas.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { campanhaInputSchema, campanhaUpdateSchema } from '@/lib/validations/campanha';
import type { Campanha, CampanhaComStats, CampanhaInput, PlanejamentoAnualStats } from '@/types/campanha';

// ==========================================
// QUERIES
// ==========================================

/**
 * Busca todas as campanhas de um cliente em um ano
 */
export async function getCampanhasByClienteAno(
  clienteId: string, 
  ano: number
): Promise<{ data: CampanhaComStats[] | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('v_campanhas_stats')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('ano', ano)
    .order('mes_inicio', { ascending: true })
    .order('prioridade', { ascending: false });

  if (error) {
    console.error('Erro ao buscar campanhas:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Busca uma campanha específica por ID
 */
export async function getCampanhaById(
  id: string
): Promise<{ data: CampanhaComStats | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('v_campanhas_stats')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar campanha:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Busca campanhas de um mês específico
 */
export async function getCampanhasByMes(
  clienteId: string,
  ano: number,
  mes: number
): Promise<{ data: Campanha[] | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('campanhas')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('ano', ano)
    .lte('mes_inicio', mes)
    .gte('mes_fim', mes)
    .order('prioridade', { ascending: false });

  if (error) {
    console.error('Erro ao buscar campanhas do mês:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Busca estatísticas do planejamento anual
 */
export async function getPlanejamentoAnualStats(
  clienteId: string,
  ano: number
): Promise<{ data: PlanejamentoAnualStats | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('v_planejamento_anual')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('ano', ano)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Erro ao buscar stats:', error);
    return { data: null, error: error.message };
  }

  // Se não houver dados, retorna zeros
  if (!data) {
    return {
      data: {
        cliente_id: clienteId,
        ano,
        total_campanhas: 0,
        planejadas: 0,
        em_andamento: 0,
        concluidas: 0,
        canceladas: 0,
        orcamento_total: 0,
      },
      error: null,
    };
  }

  return { data, error: null };
}

/**
 * Busca histórico de alterações de uma campanha
 */
export async function getCampanhaHistorico(
  campanhaId: string
): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('campanha_historico')
    .select('*, user:auth.users(email)')
    .eq('campanha_id', campanhaId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Erro ao buscar histórico:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Cria uma nova campanha
 */
export async function createCampanha(
  input: CampanhaInput
): Promise<{ data: Campanha | null; error: string | null }> {
  // Validação
  const parsed = campanhaInputSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  
  // Buscar org_id do cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('org_id')
    .eq('id', input.cliente_id)
    .single();

  if (!cliente) {
    return { data: null, error: 'Cliente não encontrado' };
  }

  // Buscar user atual
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('campanhas')
    .insert({
      ...parsed.data,
      org_id: cliente.org_id,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar campanha:', error);
    return { data: null, error: error.message };
  }

  // Revalidar cache
  revalidatePath(`/clientes/[slug]/planejamento`, 'page');
  revalidatePath(`/clientes/[slug]`, 'page');

  return { data, error: null };
}

/**
 * Atualiza uma campanha existente
 */
export async function updateCampanha(
  id: string,
  input: Partial<CampanhaInput>
): Promise<{ data: Campanha | null; error: string | null }> {
  // Validação
  const parsed = campanhaUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  
  // Buscar user atual
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('campanhas')
    .update({
      ...parsed.data,
      updated_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar campanha:', error);
    return { data: null, error: error.message };
  }

  // Revalidar cache
  revalidatePath(`/clientes/[slug]/planejamento`, 'page');
  revalidatePath(`/clientes/[slug]`, 'page');

  return { data, error: null };
}

/**
 * Atualiza apenas o status de uma campanha
 */
export async function updateCampanhaStatus(
  id: string,
  status: string,
  progresso?: number
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const updateData: any = { 
    status, 
    updated_by: user?.id 
  };
  
  if (progresso !== undefined) {
    updateData.progresso = progresso;
  }
  
  // Auto-completar progresso se status for concluída
  if (status === 'concluida') {
    updateData.progresso = 100;
  }

  const { error } = await supabase
    .from('campanhas')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/clientes/[slug]/planejamento`, 'page');
  return { success: true, error: null };
}

/**
 * Deleta uma campanha
 */
export async function deleteCampanha(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('campanhas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar campanha:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/clientes/[slug]/planejamento`, 'page');
  revalidatePath(`/clientes/[slug]`, 'page');

  return { success: true, error: null };
}

/**
 * Duplica uma campanha para outro ano
 */
export async function duplicateCampanha(
  id: string,
  novoAno: number
): Promise<{ data: Campanha | null; error: string | null }> {
  const supabase = await createClient();
  
  // Buscar campanha original
  const { data: original, error: fetchError } = await supabase
    .from('campanhas')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !original) {
    return { data: null, error: 'Campanha não encontrada' };
  }

  // Buscar user atual
  const { data: { user } } = await supabase.auth.getUser();

  // Criar cópia
  const { id: _, created_at, updated_at, slug, ...campanhaData } = original;
  
  const { data, error } = await supabase
    .from('campanhas')
    .insert({
      ...campanhaData,
      ano: novoAno,
      nome: `${original.nome} (${novoAno})`,
      status: 'planejada',
      progresso: 0,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao duplicar campanha:', error);
    return { data: null, error: error.message };
  }

  revalidatePath(`/clientes/[slug]/planejamento`, 'page');
  return { data, error: null };
}

// ==========================================
// RELACIONAMENTO CAMPANHA <-> CONTEÚDOS
// ==========================================

/**
 * Vincula conteúdos a uma campanha
 */
export async function vincularConteudosCampanha(
  campanhaId: string,
  conteudoIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Remove vínculos existentes
  await supabase
    .from('campanha_conteudos')
    .delete()
    .eq('campanha_id', campanhaId);

  // Cria novos vínculos
  if (conteudoIds.length > 0) {
    const vinculos = conteudoIds.map((conteudoId, index) => ({
      campanha_id: campanhaId,
      conteudo_id: conteudoId,
      ordem: index,
    }));

    const { error } = await supabase
      .from('campanha_conteudos')
      .insert(vinculos);

    if (error) {
      console.error('Erro ao vincular conteúdos:', error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath(`/clientes/[slug]/planejamento`, 'page');
  return { success: true, error: null };
}

/**
 * Busca conteúdos vinculados a uma campanha
 */
export async function getConteudosCampanha(
  campanhaId: string
): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campanha_conteudos')
    .select(`
      ordem,
      conteudo:conteudos(
        id, titulo, tipo, status, data_publicacao,
        thumbnail_url
      )
    `)
    .eq('campanha_id', campanhaId)
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar conteúdos da campanha:', error);
    return { data: null, error: error.message };
  }

  return { data: data?.map(d => d.conteudo) || [], error: null };
}
```

---

# FASE 3: TIPOS E VALIDAÇÕES
**Tempo estimado:** 30 min

✅ Já incluído na Task 2.1 e 2.2

---

# FASE 4: COMPONENTES UI
**Tempo estimado:** 2-3 horas

## Task 4.1: Timeline Anual

**Arquivo:** `src/components/planejamento/timeline-anual.tsx`

```typescript
// Componente visual da timeline com barras horizontais
// - Mostra os 12 meses no eixo X
// - Cada campanha é uma barra colorida
// - Hover mostra tooltip com detalhes
// - Click abre modal de edição
```

## Task 4.2: Card de Campanha

**Arquivo:** `src/components/planejamento/campanha-card.tsx`

```typescript
// Card individual de campanha
// - Cor lateral indicando tipo
// - Nome, período, status
// - Barra de progresso
// - Ações: editar, duplicar, excluir
```

## Task 4.3: Modal Criar/Editar Campanha

**Arquivo:** `src/components/planejamento/campanha-modal.tsx`

```typescript
// Modal completo com formulário
// - Campos conforme especificação
// - Validação em tempo real
// - Preview da cor/ícone
// - Salvar e cancelar
```

## Task 4.4: Resumo do Ano

**Arquivo:** `src/components/planejamento/resumo-ano.tsx`

```typescript
// Cards de resumo
// - Total de campanhas
// - Por status (planejadas, em andamento, concluídas)
// - Orçamento total (se houver)
```

## Task 4.5: Seletor de Período

**Arquivo:** `src/components/planejamento/periodo-selector.tsx`

```typescript
// Componente para selecionar mês início e fim
// - Dropdowns estilizados
// - Validação de período válido
```

## Task 4.6: Badge de Campanha (para cards de mês)

**Arquivo:** `src/components/planejamento/campanha-badge.tsx`

```typescript
// Badge pequeno para mostrar nos cards de mês
// - Cor e ícone do tipo
// - Nome truncado
// - Click abre detalhes
```

---

# FASE 5: PÁGINAS
**Tempo estimado:** 1-2 horas

## Task 5.1: Página de Planejamento

**Arquivo:** `src/app/(dashboard)/clientes/[slug]/planejamento/page.tsx`

```typescript
// Página principal do planejamento
// - Header com ano (seletor)
// - Resumo do ano
// - Timeline visual
// - Lista de campanhas
// - Botão nova campanha
```

## Task 5.2: Atualizar página do cliente (abas)

**Arquivo:** Modificar `src/app/(dashboard)/clientes/[slug]/page.tsx`

```typescript
// Atualizar array de abas
// - Remover "Acessos"
// - Adicionar "Planejamento"
```

## Task 5.3: Atualizar Visão Anual (cards de mês)

**Arquivo:** Modificar componente de visão anual

```typescript
// Adicionar badges de campanhas nos cards
// - Buscar campanhas do mês
// - Mostrar até 3 badges
// - "+X" se houver mais
```

---

# FASE 6: INTEGRAÇÕES E SINCRONIZAÇÃO
**Tempo estimado:** 1 hora

## Task 6.1: Sincronizar status de conteúdos com campanha

```typescript
// Quando todos os conteúdos de uma campanha forem publicados,
// automaticamente atualizar progresso da campanha

// Trigger ou função que:
// 1. Verifica se todos conteúdos vinculados estão publicados
// 2. Atualiza progresso da campanha
// 3. Opcionalmente muda status para "concluída"
```

## Task 6.2: Atualizar dashboard com campanhas

```typescript
// No dashboard principal, mostrar:
// - Campanhas em andamento
// - Próximas campanhas (próximo mês)
// - Campanhas atrasadas
```

## Task 6.3: Integrar com calendário existente

```typescript
// No calendário, mostrar indicador visual de campanhas
// - Período da campanha destacado
// - Cor de fundo ou borda
```

---

# FASE 7: NOTIFICAÇÕES
**Tempo estimado:** 1 hora

## Task 7.1: Criar tabela de notificações de campanha

```sql
-- Notificações automáticas
CREATE TABLE campanha_notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid REFERENCES campanhas(id) ON DELETE CASCADE,
  tipo varchar(50) NOT NULL,           -- inicio_proximo, prazo_vencendo, status_alterado
  mensagem text NOT NULL,
  enviada boolean DEFAULT false,
  enviar_em timestamptz NOT NULL,
  enviada_em timestamptz,
  created_at timestamptz DEFAULT now()
);
```

## Task 7.2: Criar função de agendamento de notificações

```typescript
// Quando criar/atualizar campanha:
// - Agendar notificação 7 dias antes do início
// - Agendar notificação no dia do início
// - Agendar notificação 7 dias antes do fim (se não concluída)
```

## Task 7.3: Integrar com sistema de notificações existente

```typescript
// Usar o sistema de notificações existente
// - Criar notificação no app
// - Opcionalmente enviar email
// - Opcionalmente enviar push
```

---

# FASE 8: PORTAL DO CLIENTE
**Tempo estimado:** 1 hora

## Task 8.1: Página de Planejamento no Portal

**Arquivo:** `src/app/(portal)/portal/planejamento/page.tsx`

```typescript
// Versão somente leitura para o cliente
// - Timeline visual
// - Lista de campanhas
// - Sem botões de ação
// - Pode comentar/aprovar (futuro)
```

## Task 8.2: Atualizar navegação do portal

```typescript
// Adicionar link "Planejamento" no menu do portal
```

---

# FASE 9: TESTES E VALIDAÇÃO
**Tempo estimado:** 1 hora

## Task 9.1: Testes manuais

- [ ] Criar campanha
- [ ] Editar campanha
- [ ] Deletar campanha
- [ ] Duplicar campanha
- [ ] Mudar status
- [ ] Vincular conteúdos
- [ ] Visualizar timeline
- [ ] Filtrar por status
- [ ] Testar responsividade
- [ ] Testar no portal do cliente

## Task 9.2: Verificar RLS

- [ ] Usuário só vê campanhas da sua org
- [ ] Usuário não consegue acessar campanhas de outra org
- [ ] Cliente no portal só vê suas campanhas

## Task 9.3: Verificar performance

- [ ] Timeline carrega rápido com muitas campanhas
- [ ] Não há N+1 queries
- [ ] Cache funcionando corretamente

---

# ✅ CHECKLIST FINAL

## Banco de Dados
- [ ] Tabela `campanhas` criada
- [ ] Tabela `campanha_conteudos` criada
- [ ] Tabela `campanha_historico` criada
- [ ] Índices criados
- [ ] RLS configurado
- [ ] Triggers funcionando
- [ ] Views criadas

## Backend
- [ ] Types definidos
- [ ] Validações com Zod
- [ ] Server Actions funcionando
- [ ] Revalidação de cache

## Frontend
- [ ] Página de planejamento
- [ ] Timeline visual
- [ ] Modal criar/editar
- [ ] Cards de campanha
- [ ] Resumo do ano
- [ ] Badges nos cards de mês
- [ ] Aba "Acessos" removida

## Integrações
- [ ] Sincronização com conteúdos
- [ ] Dashboard atualizado
- [ ] Calendário integrado

## Notificações
- [ ] Tabela criada
- [ ] Agendamento funcionando
- [ ] Integração com sistema existente

## Portal do Cliente
- [ ] Página de planejamento
- [ ] Navegação atualizada

---

# 📊 RESUMO DE ESTIMATIVAS

| Fase | Tempo |
|------|-------|
| 1. Banco de Dados | 1h |
| 2. Backend / Actions | 2-3h |
| 3. Types e Validações | 30min |
| 4. Componentes UI | 2-3h |
| 5. Páginas | 1-2h |
| 6. Integrações | 1h |
| 7. Notificações | 1h |
| 8. Portal Cliente | 1h |
| 9. Testes | 1h |
| **TOTAL** | **10-12h** |

---

**AGUARDANDO APROVAÇÃO PARA INICIAR IMPLEMENTAÇÃO!** 🚀
