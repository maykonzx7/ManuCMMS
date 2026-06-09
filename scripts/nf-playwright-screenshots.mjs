/**
 * NF-03 — screenshots responsivos via Playwright (sem Chromium do sistema).
 * Uso: FRONTEND_BASE_URL=https://manucmms.vercel.app node scripts/nf-playwright-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/evidencias/NF-03-screenshots');
const FRONT = process.env.FRONTEND_BASE_URL ?? 'https://manucmms.vercel.app';

const captures = [
  { name: 'acesso-360', path: '/workspace/acesso', width: 360, height: 800 },
  { name: 'convite-360', path: '/workspace/convite', width: 360, height: 800 },
  { name: 'workspace-360', path: '/workspace', width: 360, height: 800 },
  { name: 'ordens-360', path: '/workspace/ordens', width: 360, height: 800 },
  { name: 'acesso-768', path: '/workspace/acesso', width: 768, height: 1024 },
  { name: 'workspace-768', path: '/workspace', width: 768, height: 1024 },
  { name: 'ordens-768', path: '/workspace/ordens', width: 768, height: 1024 },
  { name: 'acesso-1280', path: '/workspace/acesso', width: 1280, height: 800 },
  { name: 'workspace-1280', path: '/workspace', width: 1280, height: 800 },
  { name: 'ordens-1280', path: '/workspace/ordens', width: 1280, height: 800 },
  { name: 'integracoes-1280', path: '/workspace/integracoes', width: 1280, height: 800 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const files = [];

for (const item of captures) {
  const page = await browser.newPage({
    viewport: { width: item.width, height: item.height },
  });
  await page.goto(`${FRONT}${item.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  const file = `${item.name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  files.push(file);
  console.log(`OK ${file} (${item.width}x${item.height})`);
  await page.close();
}

await browser.close();

const manifest = {
  data: new Date().toISOString(),
  frontend: FRONT,
  viewports: ['360x800', '768x1024', '1280x800'],
  capturas: files,
  nota: 'Rotas protegidas redirecionam para login — evidência de shell responsivo e páginas públicas.',
};
await writeFile(
  path.join(OUT, `manifest-${new Date().toISOString().slice(0, 10)}.json`),
  JSON.stringify(manifest, null, 2),
);
console.log(`Manifesto: ${files.length} capturas em ${OUT}`);
