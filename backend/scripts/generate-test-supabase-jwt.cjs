'use strict';

const jwt = require('jsonwebtoken');
const { loadEnvFile } = require('./load-env-file.cjs');

loadEnvFile();

const DEFAULT_SECRET = 'test-jwt-secret-for-automated-tests-min-32-chars';
const DEFAULT_URL = 'https://test-project-ref.supabase.co';

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const secret = (process.env.SUPABASE_JWT_SECRET || DEFAULT_SECRET).trim();
const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_URL)
  .trim()
  .replace(/\/$/, '');
const sub = readArg('sub', '00000000-0000-4000-8000-000000000001');
const email = readArg('email', 'teste@manucmms.local');
const role = readArg('role', 'authenticated');
const expiresIn = readArg('expires-in', '15m');

const token = jwt.sign(
  {
    sub,
    email,
    role,
  },
  secret,
  {
    algorithm: 'HS256',
    issuer: `${supabaseUrl}/auth/v1`,
    audience: 'authenticated',
    expiresIn,
  },
);

process.stdout.write(token);
