export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        ManuCMMS
      </p>
      <h1 className="text-2xl font-bold">Você está offline</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
      </p>
    </main>
  )
}
