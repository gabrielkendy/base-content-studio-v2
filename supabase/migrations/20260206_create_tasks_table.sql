-- ============================================
-- MAX TASKS - Sistema de Tarefas
-- ============================================

-- Tabela principal de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  -- Atribuição
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Prazos
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Vínculos opcionais
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  conteudo_id UUID REFERENCES conteudos(id) ON DELETE SET NULL,
  solicitacao_id UUID REFERENCES solicitacoes(id) ON DELETE SET NULL,
  -- Metadados
  tags TEXT[] DEFAULT '{}',
  checklist JSONB DEFAULT '[]',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_cliente_id ON tasks(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tasks_conteudo_id ON tasks(conteudo_id);

-- Comentários de tarefa (opcional, para futuro)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Política: membros da org podem ver todas as tarefas da org
CREATE POLICY "Members can view org tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = tasks.org_id 
      AND members.user_id = auth.uid()
    )
  );

-- Política: membros podem criar tarefas
CREATE POLICY "Members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = tasks.org_id 
      AND members.user_id = auth.uid()
    )
  );

-- Política: membros podem atualizar tarefas (atribuídas a eles ou se tiverem permissão full)
CREATE POLICY "Members can update tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = tasks.org_id 
      AND members.user_id = auth.uid()
    )
  );

-- Política: apenas admin/gestor podem deletar tarefas
CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = tasks.org_id 
      AND members.user_id = auth.uid()
      AND members.role IN ('admin', 'gestor')
    )
  );

-- Políticas para comentários
CREATE POLICY "Members can view task comments" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = task_comments.org_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create task comments" ON task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.org_id = task_comments.org_id 
      AND members.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
