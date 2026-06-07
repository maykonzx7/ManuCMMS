export type TenantHierarchyStep = {
  ordem: number
  titulo: string
  descricao: string
  onde: string
  quem: string
}

export const TENANT_TERMS = {
  cliente: {
    termo: 'Cliente',
    tecnico: 'Empresa (tenant)',
    descricao: 'Organização contratante do ManuCMMS. Cada cliente tem dados isolados.',
    exemplo: 'Metalúrgica Silva Ltda.',
  },
  unidade: {
    termo: 'Unidade',
    tecnico: 'Unidade fabril / planta',
    descricao: 'Local operacional dentro do cliente: fábrica, filial, CD, polo industrial.',
    exemplo: 'Planta Recife, Matriz SP',
  },
} as const

/** Fluxo oficial de onboarding — do operador da plataforma ao dia a dia do cliente. */
export const ONBOARDING_FLOW_STEPS: TenantHierarchyStep[] = [
  {
    ordem: 1,
    titulo: 'Criar o cliente',
    descricao: 'Cadastra a empresa no sistema e gera o convite do administrador.',
    onde: 'Painel Plataforma → Novo cliente',
    quem: 'Operador ManuCMMS',
  },
  {
    ordem: 2,
    titulo: 'Administrador aceita o convite',
    descricao: 'O responsável cria senha e entra no workspace do cliente.',
    onde: 'Link de convite por e-mail',
    quem: 'Admin do cliente',
  },
  {
    ordem: 3,
    titulo: 'Adicionar unidades (se precisar)',
    descricao: 'A primeira unidade (Matriz) já é criada no passo 1. Cadastre filiais extras aqui.',
    onde: 'Gestão → Unidades ou Painel Admin → Unidades',
    quem: 'Admin / Gestor do cliente',
  },
  {
    ordem: 4,
    titulo: 'Convidar equipe',
    descricao: 'Envie convites vinculando cada pessoa a uma unidade.',
    onde: 'Painel Admin → Convites',
    quem: 'Admin / Gestor do cliente',
  },
]

export const EMPRESA_FLOW_STEPS: TenantHierarchyStep[] = ONBOARDING_FLOW_STEPS.filter(
  (step) => step.ordem >= 3,
)
