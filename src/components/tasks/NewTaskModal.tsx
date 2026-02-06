'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  X,
  Plus,
  Loader2,
  Calendar,
  User,
  Building2,
  Flag,
  ListTodo,
  Trash2,
  GripVertical,
} from 'lucide-react'
import type { Member, Cliente } from '@/types/database'

interface NewTaskModalProps {
  open: boolean
  onClose: () => void
  orgId: string
  currentUserId: string
  members: Member[]
  clientes: Cliente[]
  onCreated: () => void
}

export function NewTaskModal({
  open,
  onClose,
  orgId,
  currentUserId,
  members,
  clientes,
  onCreated,
}: NewTaskModalProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setTitulo('')
    setDescricao('')
    setPrioridade('normal')
    setAssignedTo('')
    setDueDate('')
    setClienteId('')
    setChecklist([])
    setNewChecklistItem('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setChecklist([
      ...checklist,
      { id: crypto.randomUUID(), text: newChecklistItem.trim(), done: false }
    ])
    setNewChecklistItem('')
  }

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          prioridade,
          assigned_to: assignedTo || null,
          created_by: currentUserId,
          due_date: dueDate || null,
          cliente_id: clienteId || null,
          checklist,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      onCreated()
      handleClose()
    } catch (err) {
      console.error('Erro ao criar tarefa:', err)
      alert('Erro ao criar tarefa')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-orange-500" />
            Nova Tarefa
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="O que precisa ser feito?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes, instruções, links..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Prioridade & Prazo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Flag className="w-4 h-4 inline mr-1" /> Prioridade
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="baixa">⚪ Baixa</option>
                <option value="normal">🔵 Normal</option>
                <option value="alta">🟠 Alta</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" /> Prazo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Atribuir & Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" /> Atribuir para
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Não atribuído</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" /> Cliente (opcional)
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Nenhum</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Checklist (opcional)
            </label>
            {checklist.length > 0 && (
              <div className="space-y-2 mb-3">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="flex-1 text-sm text-gray-700">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Adicionar item..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={saving || !titulo.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Criar Tarefa
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
