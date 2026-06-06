'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const serviceRoot = path.join(__dirname, '..');
const backendSchema = path.join(
  serviceRoot,
  '..',
  '..',
  'backend',
  'prisma',
  'schema.prisma',
);
const dockerSchema = path.join(serviceRoot, 'prisma', 'schema.prisma');
const sourceSchema = fs.existsSync(backendSchema)
  ? backendSchema
  : dockerSchema;

if (!fs.existsSync(sourceSchema)) {
  console.error('[prisma] schema.prisma não encontrado');
  process.exit(1);
}

const targetDir = path.join(serviceRoot, 'prisma');
const targetSchema = path.join(targetDir, 'schema.prisma');
fs.mkdirSync(targetDir, { recursive: true });

let schemaContent = fs.readFileSync(sourceSchema, 'utf8');
if (!schemaContent.includes('output')) {
  schemaContent = schemaContent.replace(
    'generator client {',
    'generator client {\n  output   = "../node_modules/.prisma/client"',
  );
}
fs.writeFileSync(targetSchema, schemaContent);

execSync(`npx prisma generate --schema "${targetSchema}"`, {
  stdio: 'inherit',
  cwd: serviceRoot,
});
