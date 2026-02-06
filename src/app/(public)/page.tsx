'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Zap, 
  Shield, 
  BarChart3, 
  Users, 
  Calendar, 
  MessageSquare,
  Check,
  ArrowRight,
  Sparkles,
  Globe,
  Rocket,
  Star,
  ChevronDown
} from 'lucide-react'

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const plans = [
    {
      name: 'Starter',
      description: 'Perfeito para freelancers',
      priceMonthly: 97,
      priceAnnual: 77,
      features: [
        '3 clientes',
        '1 usuário',
        '50 conteúdos/mês',
        'Workflow básico',
        'Chat com clientes',
        'Suporte por email',
      ],
      cta: 'Começar Grátis',
      highlighted: false,
    },
    {
      name: 'Pro',
      description: 'Para agências em crescimento',
      priceMonthly: 197,
      priceAnnual: 157,
      features: [
        '10 clientes',
        '5 usuários',
        '200 conteúdos/mês',
        'Workflow avançado',
        'Aprovação externa',
        'Relatórios completos',
        'Integrações',
        'Suporte prioritário',
      ],
      cta: 'Começar Teste Grátis',
      highlighted: true,
      badge: 'Mais Popular',
    },
    {
      name: 'Agency',
      description: 'Para grandes operações',
      priceMonthly: 397,
      priceAnnual: 317,
      features: [
        'Clientes ilimitados',
        'Usuários ilimitados',
        'Conteúdos ilimitados',
        'White-label',
        'API access',
        'Webhooks',
        'Onboarding dedicado',
        'Suporte 24/7',
      ],
      cta: 'Falar com Vendas',
      highlighted: false,
    },
  ]

  const features = [
    {
      icon: Calendar,
      title: 'Calendário Visual',
      description: 'Visualize todos os conteúdos em um calendário intuitivo. Arraste e solte para reagendar.',
    },
    {
      icon: Users,
      title: 'Aprovação de Clientes',
      description: 'Envie para aprovação com um clique. Clientes aprovam direto pelo link, sem cadastro.',
    },
    {
      icon: BarChart3,
      title: 'Workflow Kanban',
      description: 'Gerencie o fluxo de produção com quadros personalizáveis. Do briefing à publicação.',
    },
    {
      icon: MessageSquare,
      title: 'Chat Integrado',
      description: 'Converse com clientes sem sair da plataforma. Histórico completo por conteúdo.',
    },
    {
      icon: Shield,
      title: 'Permissões Granulares',
      description: '13 módulos de permissão. Controle exatamente o que cada membro pode fazer.',
    },
    {
      icon: Zap,
      title: 'Automações',
      description: 'Notificações automáticas, lembretes de prazo e integrações com suas ferramentas.',
    },
  ]

  const testimonials = [
    {
      name: 'Marina Silva',
      role: 'CEO, Agência Digital MKT',
      avatar: '👩‍💼',
      content: 'Reduzimos o tempo de aprovação de 3 dias para 3 horas. Os clientes adoram a facilidade.',
    },
    {
      name: 'Ricardo Oliveira',
      role: 'Diretor, Studio Criativo',
      avatar: '👨‍💻',
      content: 'Finalmente uma ferramenta feita por quem entende a rotina de agência. Simplesmente perfeito.',
    },
    {
      name: 'Carla Mendes',
      role: 'Social Media Manager',
      avatar: '👩‍🎨',
      content: 'O workflow visual mudou minha vida. Consigo gerenciar 15 clientes sozinha agora.',
    },
  ]

  const faqs = [
    {
      q: 'Posso testar antes de assinar?',
      a: 'Sim! Oferecemos 14 dias grátis em todos os planos, sem precisar de cartão de crédito.',
    },
    {
      q: 'Como funciona a aprovação de clientes?',
      a: 'Você envia um link único para o cliente. Ele visualiza o conteúdo e aprova ou solicita ajustes com um clique, sem precisar criar conta.',
    },
    {
      q: 'Posso cancelar a qualquer momento?',
      a: 'Sim, sem multa ou burocracia. Você mantém acesso até o fim do período pago.',
    },
    {
      q: 'Vocês oferecem white-label?',
      a: 'Sim! No plano Agency você pode usar sua própria marca, domínio personalizado e remover nossa logo.',
    },
    {
      q: 'Integra com quais ferramentas?',
      a: 'Instagram, Facebook, LinkedIn, Google Drive, Canva, Notion, Slack, Zapier e muito mais.',
    },
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        {/* Glow Orbs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[150px] opacity-20" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500 rounded-full blur-[150px] opacity-10" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">ContentStudio</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">Preços</a>
            <a href="#testimonials" className="text-sm text-white/60 hover:text-white transition-colors">Depoimentos</a>
            <a href="#faq" className="text-sm text-white/60 hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block"
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

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/60 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Novo: Aprovação externa sem cadastro
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Gerencie conteúdos<br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              como nunca antes
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            A plataforma completa para agências e freelancers gerenciarem 
            conteúdos, aprovações e entregas em um só lugar.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?signup=true"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:opacity-90 transition-all hover:scale-105 hover:shadow-[0_20px_60px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
            >
              Começar Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-lg font-semibold hover:bg-white/10 transition-colors">
              Ver Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['🧑‍💼', '👩‍💻', '👨‍🎨', '👩‍🎤'].map((emoji, i) => (
                  <div key={i} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-base border-2 border-black">
                    {emoji}
                  </div>
                ))}
              </div>
              <span>+500 agências</span>
            </div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              ))}
              <span className="ml-1">4.9/5 (200+ reviews)</span>
            </div>
          </div>
        </div>

        {/* Hero Visual - Floating Cards */}
        <div className="relative max-w-5xl mx-auto mt-20 h-[400px] hidden lg:block">
          {/* Card 1 */}
          <div className="absolute top-0 left-[5%] w-[280px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-float">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">Aprovado!</div>
                <div className="text-xs text-white/40">há 2 minutos</div>
              </div>
            </div>
            <div className="text-sm text-white/60">
              Cliente aprovou o post do dia 15. Pronto para agendar!
            </div>
          </div>

          {/* Card 2 */}
          <div className="absolute top-[15%] right-[5%] w-[260px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-float-delayed">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">Analytics</div>
                <div className="text-xs text-white/40">Este mês</div>
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">156</div>
                <div className="text-xs text-white/40">Conteúdos</div>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">94%</div>
                <div className="text-xs text-white/40">Aprovados</div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="absolute bottom-[10%] left-[20%] w-[300px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-float-slow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">Próximas Entregas</div>
                <div className="text-xs text-white/40">Esta semana</div>
              </div>
            </div>
            <div className="space-y-2">
              {['Academia Fitness - 5 posts', 'Restaurante Sabor - 3 stories', 'Loja Fashion - 8 reels'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-sm text-purple-400 font-medium mb-4">
              Features
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Ferramentas poderosas para transformar sua operação de conteúdo
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group p-8 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-purple-500/30 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 font-medium mb-4">
              Preços
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Plano perfeito para você
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
              Comece grátis, escale conforme cresce
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 border border-white/10 rounded-full">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !isAnnual ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
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

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, i) => (
              <div 
                key={i}
                className={`relative p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-2 ${
                  plan.highlighted 
                    ? 'bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.15)]' 
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-sm font-semibold">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-white/60">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R${isAnnual ? plan.priceAnnual : plan.priceMonthly}
                    </span>
                    <span className="text-white/40">/mês</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-green-400 mt-1">
                      Economia de R${(plan.priceMonthly - plan.priceAnnual) * 12}/ano
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-white/80">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === 'Agency' ? '/contato' : '/login?signup=true'}
                  className={`block w-full py-3.5 rounded-xl text-center font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-sm text-cyan-400 font-medium mb-4">
              Depoimentos
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Amado por agências
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div 
                key={i}
                className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(j => (
                    <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-white/80 mb-6 leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-white/40">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-sm text-orange-400 font-medium mb-4">
              FAQ
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Perguntas frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="border border-white/10 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-white/60 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 sm:p-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-3xl text-center overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
            
            <Rocket className="w-12 h-12 mx-auto mb-6 text-purple-400" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Pronto para transformar sua agência?
            </h2>
            <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
              Junte-se a centenas de agências que já economizam horas por semana 
              com o ContentStudio.
            </p>
            <Link
              href="/login?signup=true"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:opacity-90 transition-all hover:scale-105"
            >
              Começar 14 Dias Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-white/40 mt-4">
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold">ContentStudio</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>

          <div className="text-sm text-white/40">
            © 2026 ContentStudio. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: -2s;
        }
        .animate-float-slow {
          animation: float 8s ease-in-out infinite;
          animation-delay: -4s;
        }
      `}</style>
    </div>
  )
}
