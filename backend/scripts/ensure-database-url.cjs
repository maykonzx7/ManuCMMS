'use strict';

const { loadEnvFile } = require('./load-env-file.cjs');

loadEnvFile();

if (!process.env.DATABASE_URL?.trim()) {
  const host = process.env.SUPABASE_DB_HOST?.trim();
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (host && password) {
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
}

const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
if (
  process.env.NODE_ENV === 'production' &&
  databaseUrl &&
  /@(?:localhost|127\.0\.0\.1|postgres)(?::|\/)/i.test(databaseUrl)
) {
  console.error(
    '[database] DATABASE_URL aponta para host local/docker ("localhost", "127.0.0.1" ou "postgres").',
  );
  console.error(
    '[database] No Render, use a connection string do Supabase (Dashboard → Database → URI) ou defina SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD.',
  );
  process.exit(1);
}
