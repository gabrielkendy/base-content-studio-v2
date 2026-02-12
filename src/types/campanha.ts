// =====================================================
// TYPES: Campanhas / Planejamento Anual
// =====================================================

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
  slug: string | null;
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
  cliente_nome?: string;
  cliente_slug?: string;
}

export interface CampanhaInput {
  nome: string;
  cliente_id: string;
  ano: number;
  mes_inicio: number;
  mes_fim: number;
  descricao?: string | null;
  objetivo?: string | null;
  acoes_planejadas?: string | null;
  tipo?: CampanhaTipo;
  cor?: string;
  icone?: string | null;
  prioridade?: CampanhaPrioridade;
  meta_principal?: string | null;
  meta_secundaria?: string | null;
  kpi_esperado?: CampanhaKPI | null;
  orcamento?: number | null;
  status?: CampanhaStatus;
  responsavel_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface CampanhaUpdateInput extends Partial<Omit<CampanhaInput, 'cliente_id'>> {}

export interface PlanejamentoAnualStats {
  cliente_id: string;
  ano: number;
  total_campanhas: number;
  planejadas: number;
  em_andamento: number;
  pausadas: number;
  concluidas: number;
  canceladas: number;
  orcamento_total: number;
  progresso_medio: number;
}

export interface CampanhaHistorico {
  id: string;
  campanha_id: string;
  acao: string;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

export interface CampanhaConteudo {
  id: string;
  campanha_id: string;
  conteudo_id: string;
  ordem: number;
  created_at: string;
}

// =====================================================
// CONSTANTES
// =====================================================

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

export const CAMPANHA_PRIORIDADES: Record<CampanhaPrioridade, { label: string; cor: string }> = {
  1: { label: 'Baixa', cor: '#6B7280' },
  2: { label: 'Média', cor: '#F59E0B' },
  3: { label: 'Alta', cor: '#EF4444' },
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

// Helper para obter nome do mês
export function getMesLabel(mes: number, short = false): string {
  const mesObj = MESES.find(m => m.value === mes);
  return mesObj ? (short ? mesObj.short : mesObj.label) : '';
}

// Helper para obter período formatado
export function getPeriodoLabel(mesInicio: number, mesFim: number): string {
  if (mesInicio === mesFim) {
    return getMesLabel(mesInicio);
  }
  return `${getMesLabel(mesInicio, true)} - ${getMesLabel(mesFim, true)}`;
}

// Helper para calcular duração em meses
export function getDuracaoMeses(mesInicio: number, mesFim: number): number {
  return mesFim - mesInicio + 1;
}
