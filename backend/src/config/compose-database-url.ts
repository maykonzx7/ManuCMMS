/**
 * Se `DATABASE_URL` não estiver definida, monta a partir do host Supabase + senha do banco
 * (mesma senha exibida no Dashboard → Database).
 */
export function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL?.trim()) {
    return;
  }

  const host = process.env.SUPABASE_DB_HOST?.trim();
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!host || !password) {
    return;
  }

  const user = process.env.SUPABASE_DB_USER?.trim() || 'postgres';
  const database = process.env.SUPABASE_DB_NAME?.trim() || 'postgres';
  const port = process.env.SUPABASE_DB_PORT?.trim() || '5432';

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const base = `postgresql://${u}:${p}@${host}:${port}/${database}`;
  process.env.DATABASE_URL = base.includes('?')
    ? `${base}&sslmode=require`
    : `${base}?sslmode=require`;
}
