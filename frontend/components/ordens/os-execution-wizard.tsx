'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Play,
  ShieldCheck,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useIsMobile } from '@/components/ui/use-mobile'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { MaintenanceType, UserRole } from '@/types'

type PecaCatalogItem = {
  id: string
  codigo: string
  nome: string
  quantidadeEstoque: number
}

type TecnicoInfo = {
  nome: string
  avatar?: string | null
  perfil?: UserRole | string
  cargo?: string | null
}

function wizardDialogClass(isMobile: boolean) {
  return cn(
    isMobile
      ? 'flex h-[100dvh] max-h-[100dvh] max-w-[100vw] flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-h-[90vh] sm:max-w-lg sm:gap-4 sm:rounded-lg sm:border sm:p-6'
      : 'max-h-[90vh] max-w-lg gap-4 overflow-y-auto',
  )
}

function wizardSectionClass(isMobile: boolean, area: 'header' | 'body' | 'footer') {
  if (area === 'footer') {
    return cn(
      'flex gap-2',
      isMobile
        ? 'shrink-0 flex-col-reverse border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
        : 'justify-between',
    )
  }

  if (!isMobile) return undefined

  if (area === 'header') return 'shrink-0 space-y-4 px-4 pt-4'
  return 'min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3'
}

function wizardButtonClass(isMobile: boolean, extra?: string) {
  return cn(isMobile && 'h-12 w-full text-base', extra)
}

function StepIndicator({ steps, current, isMobile }: { steps: string[]; current: number; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {steps.map((label, index) => (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
              <div
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  index < current && 'bg-emerald-500',
                  index === current && 'bg-primary',
                  index > current && 'bg-muted',
                )}
              />
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{steps[current]}</p>
          <p className="text-xs text-muted-foreground">
            Passo {current + 1} de {steps.length}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((label, index) => (
        <div key={label} className="flex shrink-0 items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
              index < current && 'bg-emerald-500 text-white',
              index === current && 'bg-primary text-primary-foreground',
              index > current && 'bg-muted text-muted-foreground',
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              'text-xs',
              index === current ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
          {index < steps.length - 1 ? (
            <span className="text-muted-foreground">→</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function WizardConfirmCheckbox({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  isMobile,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description?: string
  isMobile: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className={isMobile ? 'mt-1 h-5 w-5 shrink-0' : 'mt-0.5 shrink-0'}
      />
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className={cn('leading-snug', isMobile && 'text-base')}>
          {label}
        </Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}

function pickImage(onChange: (file: File | null) => void, useCamera: boolean) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  if (useCamera) input.capture = 'environment'
  input.onchange = () => onChange(input.files?.[0] ?? null)
  input.click()
}

function PhotoCaptureField({
  label,
  file,
  onChange,
  previewLabel,
  isMobile,
}: {
  label: string
  file: File | null
  onChange: (file: File | null) => void
  previewLabel: string
  isMobile: boolean
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="space-y-3">
      <Label className={isMobile ? 'text-base' : undefined}>{label}</Label>
      <div className="flex flex-col gap-3">
        <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'flex-row flex-wrap')}>
          <Button
            type="button"
            variant="default"
            className={wizardButtonClass(isMobile, 'flex-1')}
            onClick={() => pickImage(onChange, true)}
          >
            <Camera className="mr-2 h-5 w-5" />
            Tirar foto
          </Button>
          <Button
            type="button"
            variant="outline"
            className={wizardButtonClass(isMobile, 'flex-1')}
            onClick={() => pickImage(onChange, false)}
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            Escolher da galeria
          </Button>
        </div>
        {previewUrl ? (
          <div className="overflow-hidden rounded-lg border">
            <img
              src={previewUrl}
              alt={previewLabel}
              className={cn('w-full object-cover', isMobile ? 'h-56' : 'h-40 sm:h-48')}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Fotografe o equipamento ou selecione uma imagem salva no dispositivo.
          </p>
        )}
      </div>
    </div>
  )
}

function TecnicoAssinaturaCard({ tecnico, isMobile }: { tecnico: TecnicoInfo; isMobile: boolean }) {
  const initials = tecnico.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const perfilLabel =
    tecnico.perfil && tecnico.perfil in USER_ROLE_LABELS
      ? USER_ROLE_LABELS[tecnico.perfil as UserRole]
      : tecnico.perfil

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
      <Avatar className={cn('rounded-lg', isMobile ? 'h-14 w-14' : 'h-12 w-12')}>
        <AvatarImage src={tecnico.avatar ?? undefined} alt={tecnico.nome} />
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{tecnico.nome}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {perfilLabel ? <Badge variant="outline">{perfilLabel}</Badge> : null}
          {tecnico.cargo ? <Badge variant="secondary">{tecnico.cargo}</Badge> : null}
        </div>
      </div>
      <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
    </div>
  )
}

// --- Fluxo contínuo após iniciar ---

type OsFluxoContinuoPromptProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumero: string
  onConcluirAgora: () => void
}

export function OsFluxoContinuoPrompt({
  open,
  onOpenChange,
  orderNumero,
  onConcluirAgora,
}: OsFluxoContinuoPromptProps) {
  const isMobile = useIsMobile()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(wizardDialogClass(isMobile), 'max-w-md')}>
        <div className={wizardSectionClass(isMobile, 'header')}>
          <DialogHeader>
            <DialogTitle>OS {orderNumero} iniciada</DialogTitle>
            <DialogDescription>
              O reparo já foi concluído no local? Você pode registrar a resolução agora sem sair do fluxo.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className={wizardSectionClass(isMobile, 'body')}>
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>Se ainda vai executar o serviço, escolha &quot;Concluir depois&quot; e retome quando terminar.</p>
          </div>
        </div>
        <div className={cn(wizardSectionClass(isMobile, 'footer'), !isMobile && 'justify-end')}>
          <Button
            variant="outline"
            className={wizardButtonClass(isMobile)}
            onClick={() => onOpenChange(false)}
          >
            Concluir depois
          </Button>
          <Button
            className={wizardButtonClass(isMobile)}
            onClick={() => {
              onOpenChange(false)
              onConcluirAgora()
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Concluir agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Iniciar OS ---

export type OsIniciarWizardResult = {
  fotoProblema?: File
  descricaoProblema?: string
}

type OsIniciarWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumero: string
  orderTipo: MaintenanceType
  submitting?: boolean
  onConfirm: (data: OsIniciarWizardResult) => Promise<void>
}

export function OsIniciarWizard({
  open,
  onOpenChange,
  orderNumero,
  orderTipo,
  submitting = false,
  onConfirm,
}: OsIniciarWizardProps) {
  const isMobile = useIsMobile()
  const isCorretiva = orderTipo === 'CORRETIVA'
  const stepLabels = isCorretiva
    ? ['Orientação', 'Foto do problema', 'Descrição', 'Confirmar']
    : ['Orientação', 'Confirmar']

  const [step, setStep] = useState(0)
  const [fotoProblema, setFotoProblema] = useState<File | null>(null)
  const [descricaoProblema, setDescricaoProblema] = useState('')

  useEffect(() => {
    if (!open) {
      setStep(0)
      setFotoProblema(null)
      setDescricaoProblema('')
    }
  }, [open])

  const canAdvance = () => {
    if (!isCorretiva) return true
    if (step === 1) return fotoProblema !== null
    if (step === 2) return descricaoProblema.trim().length >= 10
    return true
  }

  const handleConfirm = async () => {
    await onConfirm(
      isCorretiva
        ? { fotoProblema: fotoProblema!, descricaoProblema: descricaoProblema.trim() }
        : {},
    )
  }

  const confirmStep = stepLabels.length - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wizardDialogClass(isMobile)}>
        <div className={wizardSectionClass(isMobile, 'header')}>
          <DialogHeader>
            <DialogTitle>Iniciar {orderNumero}</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para registrar o início da intervenção.
            </DialogDescription>
          </DialogHeader>

          <StepIndicator steps={stepLabels} current={step} isMobile={isMobile} />
        </div>

        <div className={cn(wizardSectionClass(isMobile, 'body'), !isMobile && 'min-h-[180px] py-2')}>
          {step === 0 && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-4 text-sm">
              <p className="font-medium">O que vai acontecer:</p>
              <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                {isCorretiva ? (
                  <>
                    <li>Registrar foto do problema encontrado no ativo</li>
                    <li>Descrever o defeito identificado</li>
                    <li>Iniciar a execução da OS</li>
                    <li>Após o reparo, registrar resolução e foto da correção</li>
                  </>
                ) : (
                  <>
                    <li>Confirmar início da manutenção</li>
                    <li>Ao concluir, registrar descrição e foto da intervenção</li>
                  </>
                )}
              </ol>
            </div>
          )}

          {isCorretiva && step === 1 && (
            <PhotoCaptureField
              label="Foto do problema (obrigatória)"
              file={fotoProblema}
              onChange={setFotoProblema}
              previewLabel="Prévia do problema"
              isMobile={isMobile}
            />
          )}

          {isCorretiva && step === 2 && (
            <div className="space-y-2">
              <Label className={isMobile ? 'text-base' : undefined}>
                Descrição do problema (obrigatória)
              </Label>
              <Textarea
                rows={isMobile ? 5 : 4}
                value={descricaoProblema}
                onChange={(e) => setDescricaoProblema(e.target.value)}
                placeholder="Descreva o defeito, sintomas e condição do ativo..."
                className={isMobile ? 'text-base' : undefined}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
            </div>
          )}

          {((isCorretiva && step === 3) || (!isCorretiva && step === 1)) && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Play className="h-4 w-4 text-primary" />
                Pronto para iniciar
              </div>
              {isCorretiva ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Foto do problema anexada</li>
                  <li>✓ Descrição registrada</li>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  A OS passará para o status &quot;Em andamento&quot;.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={wizardSectionClass(isMobile, 'footer')}>
          <Button
            variant="outline"
            disabled={step === 0 || submitting}
            className={wizardButtonClass(isMobile)}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          {step < confirmStep ? (
            <Button
              disabled={!canAdvance() || submitting}
              className={wizardButtonClass(isMobile)}
              onClick={() => setStep((s) => s + 1)}
            >
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              disabled={submitting}
              className={wizardButtonClass(isMobile)}
              onClick={() => void handleConfirm()}
            >
              {submitting ? 'Iniciando...' : 'Iniciar OS'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Concluir OS ---

export type OsConcluirWizardResult = {
  descricaoSolucao: string
  fotoSolucao?: File
  fotoAnexo?: File
  confirmacaoConclusao: boolean
  pecasConsumidas: Array<{ pecaId: string; quantidade: number }>
}

type OsConcluirWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumero: string
  orderTipo: MaintenanceType
  tecnico: TecnicoInfo
  pecasCatalog: PecaCatalogItem[]
  submitting?: boolean
  onConfirm: (data: OsConcluirWizardResult) => Promise<void>
}

export function OsConcluirWizard({
  open,
  onOpenChange,
  orderNumero,
  orderTipo,
  tecnico,
  pecasCatalog,
  submitting = false,
  onConfirm,
}: OsConcluirWizardProps) {
  const isMobile = useIsMobile()
  const isCorretiva = orderTipo === 'CORRETIVA'
  const hasPecas = pecasCatalog.length > 0
  const stepLabels = hasPecas
    ? isCorretiva
      ? ['Resolução', 'Foto da resolução', 'Peças', 'Confirmar']
      : ['Resolução', 'Foto da intervenção', 'Peças', 'Confirmar']
    : isCorretiva
      ? ['Resolução', 'Foto da resolução', 'Confirmar']
      : ['Resolução', 'Foto da intervenção', 'Confirmar']

  const confirmStep = stepLabels.length - 1
  const pecasStep = hasPecas ? 2 : -1
  const fotoStep = 1

  const [step, setStep] = useState(0)
  const [descricaoSolucao, setDescricaoSolucao] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [pecasConsumo, setPecasConsumo] = useState<Record<string, number>>({})
  const [confirmacao, setConfirmacao] = useState(false)

  useEffect(() => {
    if (!open) {
      setStep(0)
      setDescricaoSolucao('')
      setFotoFile(null)
      setPecasConsumo({})
      setConfirmacao(false)
    }
  }, [open])

  const canAdvance = () => {
    if (step === 0) return descricaoSolucao.trim().length >= 10
    if (step === fotoStep) return fotoFile !== null
    return true
  }

  const handleConfirm = async () => {
    if (!confirmacao) return
    const consumo = Object.entries(pecasConsumo)
      .filter(([, qty]) => qty > 0)
      .map(([pecaId, quantidade]) => ({ pecaId, quantidade }))

    await onConfirm({
      descricaoSolucao: descricaoSolucao.trim(),
      ...(isCorretiva ? { fotoSolucao: fotoFile! } : { fotoAnexo: fotoFile! }),
      confirmacaoConclusao: true,
      pecasConsumidas: consumo,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wizardDialogClass(isMobile)}>
        <div className={wizardSectionClass(isMobile, 'header')}>
          <DialogHeader>
            <DialogTitle>Concluir {orderNumero}</DialogTitle>
            <DialogDescription>
              Registre a resolução, evidência fotográfica e confirme a conclusão.
            </DialogDescription>
          </DialogHeader>

          <StepIndicator steps={stepLabels} current={step} isMobile={isMobile} />
        </div>

        <div className={cn(wizardSectionClass(isMobile, 'body'), !isMobile && 'min-h-[180px] py-2')}>
          {step === 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                O que foi feito?
              </div>
              <Textarea
                rows={isMobile ? 5 : 4}
                value={descricaoSolucao}
                onChange={(e) => setDescricaoSolucao(e.target.value)}
                placeholder="Descreva a solução aplicada, peças trocadas e testes realizados..."
                className={isMobile ? 'text-base' : undefined}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
            </div>
          )}

          {step === fotoStep && (
            <PhotoCaptureField
              label={isCorretiva ? 'Foto da resolução (obrigatória)' : 'Foto da intervenção (obrigatória)'}
              file={fotoFile}
              onChange={setFotoFile}
              previewLabel="Prévia da resolução"
              isMobile={isMobile}
            />
          )}

          {step === pecasStep && (
            <div className="space-y-2">
              <Label className={isMobile ? 'text-base' : undefined}>Peças consumidas (opcional)</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {pecasCatalog.map((peca) => (
                  <div key={peca.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{peca.codigo} — {peca.nome}</p>
                      <p className="text-xs text-muted-foreground">Estoque: {peca.quantidadeEstoque}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={peca.quantidadeEstoque}
                      className={cn('rounded-md border px-2 py-1', isMobile ? 'h-10 w-24 text-base' : 'w-20')}
                      value={pecasConsumo[peca.id] ?? 0}
                      onChange={(e) => {
                        const qty = Math.max(0, Number(e.target.value) || 0)
                        setPecasConsumo((prev) => ({ ...prev, [peca.id]: qty }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === confirmStep && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/20 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Resumo da conclusão
                </div>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>Resolução descrita</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>Foto da {isCorretiva ? 'resolução' : 'intervenção'} anexada</span>
                  </li>
                  {hasPecas ? (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>Peças registradas (se aplicável)</span>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="space-y-2">
                <p className={cn('font-medium', isMobile && 'text-base')}>Assinatura do técnico</p>
                <TecnicoAssinaturaCard tecnico={tecnico} isMobile={isMobile} />
              </div>

              <WizardConfirmCheckbox
                id="confirmacao-conclusao-wizard"
                checked={confirmacao}
                onCheckedChange={setConfirmacao}
                label="Confirmo que concluí esta intervenção conforme descrito"
                description="Sua confirmação será registrada com nome, cargo e foto de perfil."
                isMobile={isMobile}
              />
            </div>
          )}
        </div>

        <div className={wizardSectionClass(isMobile, 'footer')}>
          <Button
            variant="outline"
            disabled={step === 0 || submitting}
            className={wizardButtonClass(isMobile)}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          {step < confirmStep ? (
            <Button
              disabled={!canAdvance() || submitting}
              className={wizardButtonClass(isMobile)}
              onClick={() => setStep((s) => s + 1)}
            >
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              disabled={!confirmacao || submitting}
              className={wizardButtonClass(isMobile)}
              onClick={() => void handleConfirm()}
            >
              {submitting ? 'Concluindo...' : 'Confirmar conclusão'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
