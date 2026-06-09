/**
 * NF-11 — varredura a11y com axe-core injetado via Playwright.
 * Uso: FRONTEND_BASE_URL=https://manucmms.vercel.app node scripts/nf-axe-playwright.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/evidencias/NF-11-a11y');
const FRONT = process.env.FRONTEND_BASE_URL ?? 'https://manucmms.vercel.app';
const DATE = new Date().toISOString().slice(0, 10);
const AXE_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js';

const pages = [
  { name: 'acesso', path: '/workspace/acesso' },
  { name: 'convite', path: '/workspace/convite' },
  { name: 'workspace', path: '/workspace' },
  { name: 'ordens', path: '/workspace/ordens' },
];

async function runAxe(page) {
  await page.addScriptTag({ url: AXE_CDN });
  return page.evaluate(async () => {
    // @ts-expect-error axe injetado no browser
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
  });
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const resumo = [];

for (const pageDef of pages) {
  const page = await browser.newPage();
  const url = `${FRONT}${pageDef.path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const results = await runAxe(page);
  const outfile = path.join(OUT, `axe-${pageDef.name}-${DATE}.json`);
  await writeFile(outfile, JSON.stringify(results, null, 2));
  const critical = (results.violations ?? []).filter((v) =>
    ['critical', 'serious'].includes(v.impact),
  );
  resumo.push({
    pagina: pageDef.name,
    url,
    violacoes_total: results.violations?.length ?? 0,
    violacoes_criticas_serias: critical.length,
    arquivo: path.basename(outfile),
  });
  console.log(
    `${pageDef.name}: ${results.violations?.length ?? 0} violações (${critical.length} critical/serious)`,
  );
  await page.close();
}

await browser.close();

const summaryPath = path.join(OUT, `resumo-${DATE}.json`);
await writeFile(
  summaryPath,
  JSON.stringify(
    {
      data: new Date().toISOString(),
      frontend: FRONT,
      ferramenta: 'axe-core 4.10.3 + Playwright',
      paginas: resumo,
      aceite: '0 violações critical/serious nas páginas públicas',
    },
    null,
    2,
  ),
);
console.log(`Resumo: ${summaryPath}`);
