/**
 * Garante variáveis mínimas para testes (unit + e2e) sem projeto Supabase real.
 * Em runtime com `.env` real, estes valores não sobrescrevem o que já estiver definido.
 */
if (!process.env.SUPABASE_JWT_SECRET) {
  process.env.SUPABASE_JWT_SECRET =
    'test-jwt-secret-for-automated-tests-min-32-chars';
}
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://test-project-ref.supabase.co';
}
