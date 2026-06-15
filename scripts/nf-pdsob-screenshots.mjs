/**
 * Capturas em alta resolução para figuras do relatório PDSOB (DEI + Manual).
 * deviceScaleFactor=2 → PNG efetivo 2560×1600 (desktop) / 720×1600 (mobile).
 */
import { chromium } from 'playwright';
import { mkdir, copyFile, access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'docs/relatorio-assets');
const OUT_DEI = path.join(ASSETS, 'screenshots/dei');
const OUT_MANUAL = path.join(ASSETS, 'screenshots/manual');
const MANIFEST_PATH = path.join(ASSETS, 'FIGURAS.json');
const FRONT = process.env.FRONTEND_BASE_URL ?? 'https://manucmms.vercel.app';
const EMAIL = process.env.PDSOB_TEST_EMAIL ?? '';
const PASSWORD = process.env.PDSOB_TEST_PASSWORD ?? '';
const SCALE = Number(process.env.SCREENSHOT_SCALE ?? '2');

const captures = [
  { fig: 40, out: 'figura-40-login.png', dir: OUT_DEI, path: '/workspace/acesso', w: 1280, h: 800 },
  { fig: 41, out: 'figura-41-home.png', dir: OUT_DEI, path: '/workspace', w: 1280, h: 800, auth: true },
  { fig: 42, out: 'figura-42-ordens.png', dir: OUT_DEI, path: '/workspace/ordens', w: 1280, h: 800, auth: true },
  { fig: 47, out: 'figura-47-dashboard.png', dir: OUT_DEI, path: '/workspace/dashboard', w: 1280, h: 800, auth: true },
  { fig: 52, out: 'figura-52-integracoes.png', dir: OUT_DEI, path: '/workspace/integracoes', w: 1280, h: 800, auth: true },
  { fig: 101, out: 'figura-101-acesso.png', dir: OUT_MANUAL, path: '/workspace/acesso', w: 1280, h: 800 },
  { fig: 102, out: 'figura-102-senha.png', dir: OUT_MANUAL, path: '/workspace/acesso/redefinir-senha', w: 1280, h: 800 },
  { fig: 62, out: 'figura-62-mobile.png', dir: OUT_DEI, path: '/workspace/acesso', w: 360, h: 800 },
];

await mkdir(OUT_DEI, { recursive: true });
await mkdir(OUT_MANUAL, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  deviceScaleFactor: SCALE,
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();

async function tryLogin() {
  if (!EMAIL || !PASSWORD) return false;
  await page.goto(`${FRONT}/workspace/acesso`, { waitUntil: 'networkidle', timeout: 60000 });
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  if ((await emailInput.count()) === 0) return false;
  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  return !page.url().includes('/workspace/acesso');
}

const loggedIn = await tryLogin();
console.log(loggedIn ? 'Login OK' : 'Sem login (PDSOB_TEST_EMAIL/PASSWORD para telas autenticadas)');

const results = [];

for (const item of captures) {
  if (item.auth && !loggedIn) {
    console.log(`SKIP figura ${item.fig} (auth): ${item.path}`);
    results.push({ figura: item.fig, status: 'skipped_auth' });
    continue;
  }
  await page.setViewportSize({ width: item.w, height: item.h });
  try {
    await page.goto(`${FRONT}${item.path}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const dest = path.join(item.dir, item.out);
    await page.screenshot({ path: dest, fullPage: false, type: 'png' });
    console.log(`OK figura ${item.fig} (${item.w * SCALE}px) → ${dest}`);
    results.push({ figura: item.fig, status: 'ok', arquivo: path.relative(ASSETS, dest), scale: SCALE });
  } catch (e) {
    console.error(`FAIL figura ${item.fig}:`, e.message);
    results.push({ figura: item.fig, status: 'error', error: String(e.message) });
  }
}

// Mockups em alta resolução quando rotas exigem login
const mockupFallbacks = [
  { fig: 41, src: 'mockups/figura-56-mockup-ordens.png', dest: path.join(OUT_DEI, 'figura-41-home.png') },
  { fig: 42, src: 'mockups/figura-56-mockup-ordens.png', dest: path.join(OUT_DEI, 'figura-42-ordens.png') },
  { fig: 47, src: 'mockups/figura-58-mockup-dashboard.png', dest: path.join(OUT_DEI, 'figura-47-dashboard.png') },
  { fig: 52, src: 'mockups/figura-61-mockup-admin.png', dest: path.join(OUT_DEI, 'figura-52-integracoes.png') },
];

for (const { fig, src, dest } of mockupFallbacks) {
  const skipped = results.find((r) => r.figura === fig && (r.status === 'skipped_auth' || r.status === 'error'));
  if (!skipped) continue;
  const mockSrc = path.join(OUT_DEI, src);
  let replace = true;
  try {
    const { stat } = await import('node:fs/promises');
    const st = await stat(dest);
    const mockSt = await stat(mockSrc);
    // Substitui PNG antigo de baixa resolução (ex.: fallback NF-03 duplicado)
    replace = st.size < mockSt.size * 0.8;
    if (!replace) {
      console.log(`MOCKUP skip figura ${fig} (ja existe em HD): ${dest}`);
      continue;
    }
  } catch {
    /* missing dest or mock — tenta copiar */
  }
  try {
    await copyFile(mockSrc, dest);
    console.log(`MOCKUP figura ${fig} ← ${src}`);
    results.push({ figura: fig, status: 'mockup_fallback', arquivo: path.relative(ASSETS, dest) });
  } catch (e) {
    console.warn(`MOCKUP fail figura ${fig}:`, e.message);
  }
}

// Fallback NF-03 só se arquivo não existir (não sobrescreve captura boa)
const fallbacks = [
  ['acesso-1280.png', path.join(OUT_DEI, 'figura-40-login.png')],
  ['workspace-1280.png', path.join(OUT_DEI, 'figura-41-home.png')],
  ['ordens-1280.png', path.join(OUT_DEI, 'figura-42-ordens.png')],
  ['integracoes-1280.png', path.join(OUT_DEI, 'figura-52-integracoes.png')],
  ['acesso-360.png', path.join(OUT_DEI, 'figura-62-mobile.png')],
  ['acesso-1280.png', path.join(OUT_MANUAL, 'figura-101-acesso.png')],
  ['acesso-1280.png', path.join(OUT_MANUAL, 'figura-102-senha.png')],
];

for (const [name, dest] of fallbacks) {
  try {
    await access(dest);
    continue;
  } catch {
    /* missing */
  }
  const src = path.join(ROOT, 'docs/evidencias/NF-03-screenshots', name);
  try {
    await copyFile(src, dest);
    console.log(`FALLBACK ${path.basename(dest)} ← ${name}`);
  } catch {
    /* NF-03 ausente */
  }
}

await browser.close();

let manifest = {};
try {
  manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
} catch {
  manifest = { figuras: {} };
}
manifest.ultima_captura_screenshots = new Date().toISOString();
manifest.screenshot_scale = SCALE;
manifest.capturas_recentes = results;
await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`\nManifesto: ${MANIFEST_PATH}`);
