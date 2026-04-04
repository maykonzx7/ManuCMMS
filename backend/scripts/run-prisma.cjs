'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

require('./ensure-database-url.cjs');

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    'Defina DATABASE_URL ou SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD no backend/.env',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: node scripts/run-prisma.cjs <argumentos do prisma>');
  process.exit(1);
}

const cwd = path.join(__dirname, '..');
const result = spawnSync('npx', ['prisma', ...args], {
  cwd,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
