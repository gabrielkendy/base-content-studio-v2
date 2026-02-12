import { z } from 'zod';

// =====================================================
// VALIDAÇÕES: Campanhas / Planejamento Anual
// =====================================================

// Schema base para campos comuns
const campanhaBaseSchema = {
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  
  ano: z.number()
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano mínimo é 2020')
    .max(2100, 'Ano máximo é 2100'),
  
  mes_inicio: z.number()
    .int()
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12'),
  
  mes_fim: z.number()
    .int()
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12'),
  
  descricao: z.string().max(5000).optional().nullable(),
  objetivo: z.string().max(2000).optional().nullable(),
  acoes_planejadas: z.string().max(10000).optional().nullable(),
  
  tipo: z.enum([
    'campanha', 
    'data_comemorativa', 
    'lancamento', 
    'institucional', 
    'promocao', 
    'awareness'
  ]).default('campanha'),
  
  cor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hex válido (ex: #3B82F6)')
    .default('#3B82F6'),
  
  icone: z.string().max(50).optional().nullable(),
  
  prioridade: z.number()
    .int()
    .min(1, 'Prioridade deve ser 1, 2 ou 3')
    .max(3, 'Prioridade deve ser 1, 2 ou 3')
    .default(2),
  
  meta_principal: z.string().max(500).optional().nullable(),
  meta_secundaria: z.string().max(500).optional().nullable(),
  
  kpi_esperado: z.record(z.string(), z.number()).optional().nullable(),
  
  orcamento: z.number().min(0, 'Orçamento não pode ser negativo').optional().nullable(),
  
  status: z.enum([
    'planejada', 
    'em_andamento', 
    'pausada', 
    'concluida', 
    'cancelada'
  ]).default('planejada'),
  
  progresso: z.number()
    .int()
    .min(0, 'Progresso mínimo é 0')
    .max(100, 'Progresso máximo é 100')
    .default(0),
  
  responsavel_id: z.string().uuid('ID do responsável inválido').optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
};

// Schema para criar campanha
export const campanhaCreateSchema = z.object({
  ...campanhaBaseSchema,
  cliente_id: z.string().uuid('ID do cliente inválido'),
}).refine(
  (data) => data.mes_fim >= data.mes_inicio,
  { 
    message: 'Mês de término deve ser maior ou igual ao mês de início', 
    path: ['mes_fim'] 
  }
);

// Schema para atualizar campanha (todos os campos opcionais exceto os obrigatórios)
export const campanhaUpdateSchema = z.object({
  nome: campanhaBaseSchema.nome.optional(),
  ano: campanhaBaseSchema.ano.optional(),
  mes_inicio: campanhaBaseSchema.mes_inicio.optional(),
  mes_fim: campanhaBaseSchema.mes_fim.optional(),
  descricao: campanhaBaseSchema.descricao,
  objetivo: campanhaBaseSchema.objetivo,
  acoes_planejadas: campanhaBaseSchema.acoes_planejadas,
  tipo: campanhaBaseSchema.tipo.optional(),
  cor: campanhaBaseSchema.cor.optional(),
  icone: campanhaBaseSchema.icone,
  prioridade: campanhaBaseSchema.prioridade.optional(),
  meta_principal: campanhaBaseSchema.meta_principal,
  meta_secundaria: campanhaBaseSchema.meta_secundaria,
  kpi_esperado: campanhaBaseSchema.kpi_esperado,
  orcamento: campanhaBaseSchema.orcamento,
  status: campanhaBaseSchema.status.optional(),
  progresso: campanhaBaseSchema.progresso.optional(),
  responsavel_id: campanhaBaseSchema.responsavel_id,
  data_inicio: campanhaBaseSchema.data_inicio,
  data_fim: campanhaBaseSchema.data_fim,
}).refine(
  (data) => {
    if (data.mes_inicio !== undefined && data.mes_fim !== undefined) {
      return data.mes_fim >= data.mes_inicio;
    }
    return true;
  },
  { 
    message: 'Mês de término deve ser maior ou igual ao mês de início', 
    path: ['mes_fim'] 
  }
);

// Schema para atualizar apenas status
export const campanhaStatusSchema = z.object({
  status: z.enum([
    'planejada', 
    'em_andamento', 
    'pausada', 
    'concluida', 
    'cancelada'
  ]),
  progresso: z.number().int().min(0).max(100).optional(),
});

// Schema para duplicar campanha
export const campanhaDuplicateSchema = z.object({
  novo_ano: z.number().int().min(2020).max(2100),
});

// Schema para vincular conteúdos
export const campanhaConteudosSchema = z.object({
  conteudo_ids: z.array(z.string().uuid()),
});

// Types inferidos dos schemas
export type CampanhaCreateInput = z.infer<typeof campanhaCreateSchema>;
export type CampanhaUpdateInput = z.infer<typeof campanhaUpdateSchema>;
export type CampanhaStatusInput = z.infer<typeof campanhaStatusSchema>;
export type CampanhaDuplicateInput = z.infer<typeof campanhaDuplicateSchema>;
export type CampanhaConteudosInput = z.infer<typeof campanhaConteudosSchema>;

// Helper para validar e retornar erros formatados
export function validateCampanha<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: result.error.issues[0]?.message || 'Dados inválidos',
    issues: result.error.issues,
  };
}
