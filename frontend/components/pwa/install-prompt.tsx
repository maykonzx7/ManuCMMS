'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'manucmms-pwa-install-dismissed'

function isIosDevice() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || isStandaloneMode()) return
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return

    if (isIosDevice()) {
      setShowIosHint(true)
      setVisible(true)
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  const onInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          {showIosHint ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium leading-snug">Instale o ManuCMMS no celular</p>
          {showIosHint ? (
            <p className="text-sm text-muted-foreground">
              No Safari, toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Acesse ordens e ativos como um app, direto da tela inicial.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!showIosHint ? (
              <Button size="sm" onClick={() => void onInstall()}>
                Instalar app
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={dismiss}>
              Agora não
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismiss}>
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </div>
    </div>
  )
}
