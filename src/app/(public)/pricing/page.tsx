'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Check, 
  ArrowRight, 
  Sparkles,
  Zap,
  Star,
  ArrowLeft
} from 'lucide-react'
import { PLANS } from '@/types/billing'

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true)

  const plans = Object.values(PLANS)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[150px] opacity-20" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] opacity-20" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">ContentStudio</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/login?signup=true"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para início
          </Link>

          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Escolha o plano ideal<br />
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                para sua agência
              </span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
              Comece com 14 dias grátis. Sem cartão de crédito. 
              Cancele quando quiser.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 border border-white/10 rounded-full">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  !isAnnual ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  isAnnual ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Anual
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20">
            {plans.map((plan, i) => {
              const isPopular = plan.id === 'pro'
              const price = isAnnual ? plan.priceAnnual : plan.priceMonthly
              const savings = (plan.priceMonthly - plan.priceAnnual) * 12

              return (
                <div 
                  key={plan.id}
                  className={`relative p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-2 ${
                    isPopular 
                      ? 'bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.15)]' 
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3" /> Mais Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-white/60">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold">R${price}</span>
                      <span className="text-white/40">/mês</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-green-400 mt-2">
                        Economia de R${savings}/ano
                      </p>
                    )}
                    <p className="text-xs text-white/40 mt-1">
                      {isAnnual ? 'Cobrado anualmente' : 'Cobrado mensalmente'}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-white/80">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.id === 'agency' ? '/contato' : `/signup?plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`}
                    className={`block w-full py-4 rounded-xl text-center font-semibold transition-all flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 hover:scale-[1.02]'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {plan.id === 'agency' ? 'Falar com Vendas' : 'Começar 14 Dias Grátis'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Features Comparison */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl font-bold mb-8 text-center">
              Comparativo Completo
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 pr-4 font-medium text-white/60">Recurso</th>
                    {plans.map(plan => (
                      <th key={plan.id} className="text-center py-4 px-4 font-bold">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <FeatureRow 
                    feature="Clientes" 
                    values={['3', '10', 'Ilimitado']} 
                  />
                  <FeatureRow 
                    feature="Usuários da equipe" 
                    values={['1', '5', 'Ilimitado']} 
                  />
                  <FeatureRow 
                    feature="Conteúdos por mês" 
                    values={['50', '200', 'Ilimitado']} 
                  />
                  <FeatureRow 
                    feature="Workflow Kanban" 
                    values={['Básico', 'Avançado', 'Avançado']} 
                  />
                  <FeatureRow 
                    feature="Aprovação externa" 
                    values={[false, true, true]} 
                  />
                  <FeatureRow 
                    feature="Chat com clientes" 
                    values={[true, true, true]} 
                  />
                  <FeatureRow 
                    feature="Calendário visual" 
                    values={[true, true, true]} 
                  />
                  <FeatureRow 
                    feature="Relatórios" 
                    values={['Básico', 'Completo', 'Completo']} 
                  />
                  <FeatureRow 
                    feature="Integrações" 
                    values={['3', '10', 'Ilimitado']} 
                  />
                  <FeatureRow 
                    feature="White-label" 
                    values={[false, false, true]} 
                  />
                  <FeatureRow 
                    feature="API Access" 
                    values={[false, false, true]} 
                  />
                  <FeatureRow 
                    feature="Webhooks" 
                    values={[false, true, true]} 
                  />
                  <FeatureRow 
                    feature="Suporte" 
                    values={['Email', 'Prioritário', '24/7 Dedicado']} 
                  />
                  <FeatureRow 
                    feature="Onboarding" 
                    values={['Docs', 'Docs + Vídeo', 'Chamada 1:1']} 
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold mb-4">Ainda tem dúvidas?</h2>
            <p className="text-white/60 mb-6">
              Confira nosso{' '}
              <Link href="/#faq" className="text-purple-400 hover:underline">
                FAQ completo
              </Link>
              {' '}ou entre em contato.
            </p>
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors"
            >
              Falar com especialista
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <div>© 2026 ContentStudio. Todos os direitos reservados.</div>
          <div className="flex items-center gap-6">
            <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureRow({ feature, values }: { feature: string; values: (string | boolean)[] }) {
  return (
    <tr>
      <td className="py-4 pr-4 text-sm text-white/80">{feature}</td>
      {values.map((value, i) => (
        <td key={i} className="text-center py-4 px-4">
          {typeof value === 'boolean' ? (
            value ? (
              <Check className="w-5 h-5 text-green-500 mx-auto" />
            ) : (
              <span className="text-white/30">—</span>
            )
          ) : (
            <span className="text-sm text-white/80">{value}</span>
          )}
        </td>
      ))}
    </tr>
  )
}
