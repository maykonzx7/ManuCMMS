'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const collectionPath = path.join(__dirname, '..', 'bruno');
const target = process.argv[2] || 'auth';

const tokenResult = spawnSync('node', ['scripts/generate-test-supabase-jwt.cjs'], {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  encoding: 'utf8',
});

if (tokenResult.status !== 0) {
  process.stderr.write(tokenResult.stderr || 'Falha ao gerar JWT de teste.\n');
  process.exit(tokenResult.status === null ? 1 : tokenResult.status);
}

const token = tokenResult.stdout.trim();
if (!token) {
  process.stderr.write('JWT de teste vazio.\n');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  [
    'bru',
    'run',
    target,
    '-r',
    '--env-file',
    'environments/local.bru',
    '--env-var',
    `auth_token=${token}`,
    '--tests-only',
  ],
  {
    cwd: collectionPath,
    env: process.env,
    stdio: 'inherit',
  },
);

process.exit(result.status === null ? 1 : result.status);
