export type CepLookupResult = {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export function normalizeCep(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 8)
}

export function formatCep(raw: string): string {
  const digits = normalizeCep(raw)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export async function lookupCep(rawCep: string): Promise<CepLookupResult | null> {
  const cep = normalizeCep(rawCep)
  if (cep.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = (await res.json()) as Record<string, unknown>
  if (data.erro === true) return null

  return {
    cep: String(data.cep ?? ''),
    logradouro: String(data.logradouro ?? ''),
    bairro: String(data.bairro ?? ''),
    localidade: String(data.localidade ?? ''),
    uf: String(data.uf ?? ''),
  }
}
