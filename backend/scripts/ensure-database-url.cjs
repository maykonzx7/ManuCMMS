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
