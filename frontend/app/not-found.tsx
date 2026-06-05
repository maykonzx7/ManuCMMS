import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">O endereço acessado não existe.</p>
      <Link href="/workspace" className="text-sm text-primary underline">
        Voltar ao início
      </Link>
    </main>
  )
}
