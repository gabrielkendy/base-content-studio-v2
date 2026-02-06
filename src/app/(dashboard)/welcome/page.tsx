'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  PartyPopper,
  Users,
  Building2,
  FileText,
  Calendar,
  Rocket
} from 'lucide-react'

export default function WelcomePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      icon: Building2,
      title: 'Adicione seu primeiro cliente',
      description: 'Comece adicionando um cliente para organizar seus conteúdos.',
      action: 'Adicionar cliente',
      href: '/clientes?new=true',
    },
    {
      icon: Users,
      title: 'Convide sua equipe',
      description: 'Traga seus designers e gestores para colaborar.',
      action: 'Convidar equipe',
      href: '/equipe?invite=true',
    },
    {
      icon: FileText,
      title: 'Crie seu primeiro conteúdo',
      description: 'Monte seu primeiro post e veja a mágica acontecer.',
      action: 'Criar conteúdo',
      href: '/workflow?new=true',
    },
    {
      icon: Calendar,
      title: 'Explore o calendário',
      description: 'Visualize todos os conteúdos em um calendário interativo.',
      action: 'Ver calendário',
      href: '/calendario',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-500/5 to-transparent">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl mb-6">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            Bem-vindo ao ContentStudio! 🎉
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Sua conta está pronta! Siga os passos abaixo para começar 
            a transformar sua gestão de conteúdos.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep

            return (
              <div
                key={index}
                className={`p-6 rounded-2xl border transition-all ${
                  isCurrent 
                    ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/5' 
                    : isCompleted
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-card border-border opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCompleted 
                      ? 'bg-green-500' 
                      : isCurrent
                      ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                      : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className="w-6 h-6 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Passo {index + 1}</span>
                      {isCompleted && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded-full">
                          Concluído
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{step.description}</p>
                    
                    {isCurrent && (
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
                      >
                        {step.action} <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Skip */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Prefere explorar por conta própria?
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 rounded-xl font-medium transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Ir para o Dashboard
          </Link>
        </div>

        {/* Tips */}
        <div className="mt-16 p-6 bg-card border rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-semibold">Dicas rápidas</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              Use o <strong>Workflow</strong> para organizar conteúdos por status
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              Envie para aprovação com <strong>um clique</strong> - o cliente não precisa criar conta
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              Use o <strong>Chat</strong> para conversar diretamente nos conteúdos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              Defina <strong>permissões</strong> para cada membro da equipe
            </li>
          </ul>
        </div>

        {/* Help */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Precisa de ajuda?{' '}
          <Link href="/docs" className="text-purple-500 hover:underline">
            Veja a documentação
          </Link>
          {' '}ou{' '}
          <Link href="/contato" className="text-purple-500 hover:underline">
            fale com o suporte
          </Link>
        </div>
      </div>
    </div>
  )
}
