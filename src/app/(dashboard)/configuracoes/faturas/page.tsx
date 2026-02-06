'use client'

import { useState, useEffect } from 'react'
import { 
  Receipt, 
  Download, 
  ExternalLink, 
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react'

interface Invoice {
  id: string
  stripe_invoice_id: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  invoice_url?: string
  invoice_pdf?: string
  period_start: string
  period_end: string
  created_at: string
}

export default function FaturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/billing/invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: Invoice['status']) => {
    const configs = {
      paid: { 
        icon: CheckCircle2, 
        label: 'Pago', 
        bg: 'bg-green-500/20', 
        text: 'text-green-500' 
      },
      open: { 
        icon: Clock, 
        label: 'Pendente', 
        bg: 'bg-amber-500/20', 
        text: 'text-amber-500' 
      },
      draft: { 
        icon: FileText, 
        label: 'Rascunho', 
        bg: 'bg-zinc-500/20', 
        text: 'text-zinc-500' 
      },
      void: { 
        icon: XCircle, 
        label: 'Cancelado', 
        bg: 'bg-zinc-500/20', 
        text: 'text-zinc-500' 
      },
      uncollectible: { 
        icon: XCircle, 
        label: 'Não cobrado', 
        bg: 'bg-red-500/20', 
        text: 'text-red-500' 
      },
    }
    return configs[status] || configs.draft
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Receipt className="w-7 h-7 text-purple-500" />
          Histórico de Faturas
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize e baixe suas faturas anteriores
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-4 bg-card border rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Total Pago</span>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(
              invoices
                .filter(i => i.status === 'paid')
                .reduce((sum, i) => sum + i.amount, 0),
              'brl'
            )}
          </div>
        </div>
        <div className="p-4 bg-card border rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Total de Faturas</span>
          </div>
          <div className="text-2xl font-bold">{invoices.length}</div>
        </div>
        <div className="p-4 bg-card border rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Última Fatura</span>
          </div>
          <div className="text-2xl font-bold">
            {invoices.length > 0 
              ? new Date(invoices[0].created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
              : '—'}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        {invoices.length > 0 ? (
          <div className="divide-y divide-border">
            {invoices.map(invoice => {
              const statusConfig = getStatusConfig(invoice.status)
              const StatusIcon = statusConfig.icon

              return (
                <div 
                  key={invoice.id}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Status Icon */}
                  <div className={`w-10 h-10 ${statusConfig.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                      <span className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded-full`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.period_start && invoice.period_end 
                        ? formatPeriod(invoice.period_start, invoice.period_end)
                        : new Date(invoice.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Baixar PDF"
                      >
                        <Download className="w-5 h-5 text-muted-foreground" />
                      </a>
                    )}
                    {invoice.invoice_url && (
                      <a
                        href={invoice.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Ver no Stripe"
                      >
                        <ExternalLink className="w-5 h-5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma fatura ainda</h3>
            <p className="text-muted-foreground text-sm">
              Suas faturas aparecerão aqui após a primeira cobrança
            </p>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="text-center text-sm text-muted-foreground">
        Precisa de uma fatura específica?{' '}
        <a href="mailto:financeiro@contentstudio.com" className="text-purple-500 hover:underline">
          Entre em contato
        </a>
      </div>
    </div>
  )
}
