/**
 * Gera mockups DEI (fig. 55–62) em estilo desenhado à mão (sketch/wireframe).
 * Saída: docs/relatorio-assets/screenshots/dei/mockups/figura-NN-*.png
 *
 * Uso: node scripts/generate-sketch-mockups.mjs
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/relatorio-assets/screenshots/dei/mockups');
const MANIFEST = path.join(ROOT, 'docs/relatorio-assets/FIGURAS.json');

const SKETCH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@500;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Patrick Hand', 'Caveat', cursive;
  background: #faf6ef;
  color: #1a1a1a;
  min-height: 100vh;
  background-image:
    linear-gradient(#e5ddd0 1px, transparent 1px);
  background-size: 100% 28px;
}
.sketch-box {
  border: 2.5px solid #2d2d2d;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  background: #fffef9;
  box-shadow: 2px 3px 0 rgba(0,0,0,.08);
}
.sketch-btn {
  border: 2px solid #1e3a5f;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  background: #d4e4f7;
  color: #1e3a5f;
  font-size: 18px;
  padding: 10px 24px;
  font-family: inherit;
}
.sketch-input {
  border: 2px dashed #555;
  border-radius: 8px 20px 12px 18px / 18px 8px 22px 12px;
  background: #fff;
  height: 38px;
  width: 100%;
  padding: 0 12px;
  font-family: inherit;
  font-size: 16px;
  color: #666;
  display: flex;
  align-items: center;
}
.sidebar { width: 200px; border-right: 2px solid #333; padding: 16px 12px; min-height: 100vh; background: #f0ebe3; }
.nav-item { padding: 8px 10px; margin: 4px 0; border: 1.5px dashed #888; border-radius: 6px; font-size: 15px; }
.nav-item.active { border-style: solid; background: #e8f0fa; font-weight: bold; }
.header { padding: 14px 20px; border-bottom: 2px solid #333; display: flex; justify-content: space-between; align-items: center; }
.logo { font-family: 'Caveat', cursive; font-size: 28px; font-weight: 600; color: #1e3a5f; }
.content { padding: 20px; flex: 1; }
.layout { display: flex; min-height: 100vh; }
table.sketch { width: 100%; border-collapse: collapse; font-size: 15px; }
table.sketch th, table.sketch td { border: 1.5px solid #444; padding: 8px 10px; text-align: left; }
table.sketch th { background: #e8e4dc; }
.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-card { padding: 16px; text-align: center; min-height: 90px; }
.kpi-card .val { font-size: 26px; font-weight: bold; color: #1e3a5f; }
.chart-placeholder { height: 200px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #777; }
.map-box { height: 320px; position: relative; }
.map-pin { position: absolute; width: 24px; height: 24px; border: 2px solid #c0392b; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #fadbd8; }
.x-img { width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #aaa; border: 2px dashed #999; }
.label { font-size: 13px; color: #555; margin-bottom: 4px; }
h2.title { font-family: 'Caveat', cursive; font-size: 26px; margin-bottom: 16px; color: #1e3a5f; }
.annotation { font-size: 12px; color: #888; font-style: italic; }
.mobile { max-width: 360px; margin: 0 auto; padding: 16px; }
`;

function wrap(body, w, h) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${SKETCH_CSS}</style></head>
<body style="width:${w}px;min-height:${h}px;margin:0;overflow:hidden">${body}</body></html>`;
}

const screens = [
  {
    fig: 55,
    file: 'figura-55-mockup-login.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div style="display:flex;min-height:800px;align-items:center;justify-content:center;background:linear-gradient(135deg,#e8eef5,#faf6ef)">
        <div class="sketch-box" style="width:420px;padding:36px">
          <div class="logo" style="text-align:center;margin-bottom:24px">ManuCMMS</div>
          <p class="annotation" style="text-align:center;margin-bottom:20px">Gestão de Manutenção · sketch mockup</p>
          <div style="margin-bottom:14px"><div class="label">E-mail corporativo</div><div class="sketch-input">usuario@empresa.com</div></div>
          <div style="margin-bottom:20px"><div class="label">Senha</div><div class="sketch-input">••••••••</div></div>
          <div style="text-align:center"><button class="sketch-btn">Entrar no workspace</button></div>
          <p style="text-align:center;margin-top:16px;font-size:14px;color:#666">Esqueci minha senha · Convite</p>
        </div>
      </div>`, 1280, 800),
  },
  {
    fig: 56,
    file: 'figura-56-mockup-ordens.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div class="layout">
        <aside class="sidebar">
          <div class="logo" style="margin-bottom:20px">ManuCMMS</div>
          <div class="nav-item">Home</div>
          <div class="nav-item active">Ordens de Serviço</div>
          <div class="nav-item">Ativos</div>
          <div class="nav-item">Dashboard</div>
        </aside>
        <main style="flex:1">
          <div class="header"><h2 class="title">Ordens de Serviço</h2><button class="sketch-btn">+ Nova OS</button></div>
          <div class="content">
            <table class="sketch sketch-box" style="border:none;padding:0">
              <tr><th>OS</th><th>Ativo</th><th>Tipo</th><th>Status</th><th>Técnico</th></tr>
              <tr><td>#1042</td><td>Compressor A</td><td>Preditiva</td><td>Em execução</td><td>João</td></tr>
              <tr><td>#1041</td><td>Esteira B</td><td>Corretiva</td><td>Aguardando</td><td>—</td></tr>
              <tr><td>#1038</td><td>Bomba C</td><td>Preventiva</td><td>Concluída</td><td>Maria</td></tr>
            </table>
          </div>
        </main>
      </div>`, 1280, 800),
  },
  {
    fig: 57,
    file: 'figura-57-mockup-os-detalhe.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div class="layout">
        <aside class="sidebar"><div class="logo">ManuCMMS</div><div class="nav-item active">OS #1042</div></aside>
        <main style="flex:1">
          <div class="header"><h2 class="title">Detalhe · OS Preditiva #1042</h2><span class="annotation">RN-02 · RN-13</span></div>
          <div class="content" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="sketch-box" style="padding:16px">
              <div class="label">Descrição do problema</div><div class="sketch-input" style="height:60px;margin-bottom:12px">Temperatura acima do limite IoT</div>
              <div class="label">Evidência (foto)</div><div class="x-img">📷 foto</div>
            </div>
            <div class="sketch-box" style="padding:16px">
              <div class="label">Solução aplicada</div><div class="sketch-input" style="height:60px;margin-bottom:12px">Troca do sensor DHT22</div>
              <div class="label">Assinatura digital</div><div class="x-img" style="height:50px">✍ assinatura</div>
              <div style="margin-top:16px;text-align:right"><button class="sketch-btn">Fechar OS</button></div>
            </div>
          </div>
        </main>
      </div>`, 1280, 800),
  },
  {
    fig: 58,
    file: 'figura-58-mockup-dashboard.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div class="layout">
        <aside class="sidebar"><div class="logo">ManuCMMS</div><div class="nav-item active">Dashboard</div></aside>
        <main style="flex:1">
          <div class="header"><h2 class="title">Dashboard Executivo</h2><span class="annotation">Gestor / Admin · RF-08</span></div>
          <div class="content">
            <div class="kpi">
              <div class="sketch-box kpi-card"><div class="val">94%</div>MTBF</div>
              <div class="sketch-box kpi-card"><div class="val">2.4h</div>MTTR</div>
              <div class="sketch-box kpi-card"><div class="val">87%</div>OEE</div>
              <div class="sketch-box kpi-card"><div class="val">12</div>OS abertas</div>
            </div>
            <div class="sketch-box chart-placeholder">📊 Gráfico · manutenção por tipo</div>
          </div>
        </main>
      </div>`, 1280, 800),
  },
  {
    fig: 59,
    file: 'figura-59-mockup-mapa.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div class="layout">
        <aside class="sidebar"><div class="logo">ManuCMMS</div><div class="nav-item active">Mapa de Ativos</div></aside>
        <main style="flex:1">
          <div class="header"><h2 class="title">Planta · Unidade Fabril</h2></div>
          <div class="content">
            <div class="sketch-box map-box">
              <svg width="100%" height="100%" style="position:absolute;opacity:.3"><path d="M0,100 Q200,50 400,120 T800,80" stroke="#999" fill="none" stroke-width="2"/></svg>
              <div class="map-pin" style="top:80px;left:120px"></div>
              <div class="map-pin" style="top:180px;left:340px"></div>
              <div class="map-pin" style="top:120px;left:520px"></div>
              <div style="position:absolute;bottom:12px;right:16px;font-size:14px">Leaflet · sketch</div>
            </div>
          </div>
        </main>
      </div>`, 1280, 800),
  },
  {
    fig: 60,
    file: 'figura-60-mockup-auditoria.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div class="layout">
        <aside class="sidebar"><div class="logo">ManuCMMS</div><div class="nav-item active">Auditoria</div></aside>
        <main style="flex:1">
          <div class="header"><h2 class="title">Trilha de Auditoria</h2><button class="sketch-btn">Export CSV</button></div>
          <div class="content">
            <table class="sketch">
              <tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th></tr>
              <tr><td>10/06 14:22</td><td>auditor@co</td><td>CONSULTA</td><td>OrdemServico</td></tr>
              <tr><td>10/06 13:01</td><td>gestor@co</td><td>UPDATE</td><td>Ativo</td></tr>
              <tr><td>09/06 18:44</td><td>tecnico@co</td><td>FECHAMENTO</td><td>OS #1040</td></tr>
            </table>
            <p class="annotation" style="margin-top:10px">MongoDB · RF-14 · NF-05</p>
          </div>
        </main>
      </div>`, 1280, 800),
  },
  {
    fig: 61,
    file: 'figura-61-mockup-admin.png',
    w: 1280,
    h: 800,
    html: wrap(`
      <div class="layout">
        <aside class="sidebar"><div class="logo">ManuCMMS</div><div class="nav-item active">Administração</div></aside>
        <main style="flex:1">
          <div class="header"><h2 class="title">Convites e Permissões</h2><button class="sketch-btn">+ Convidar</button></div>
          <div class="content">
            <table class="sketch">
              <tr><th>E-mail</th><th>Perfil</th><th>Unidade</th><th>Status</th></tr>
              <tr><td>tecnico@fabril.com</td><td>Técnico</td><td>Planta 01</td><td>Ativo</td></tr>
              <tr><td>supervisor@fabril.com</td><td>Supervisor</td><td>Planta 01</td><td>Ativo</td></tr>
              <tr><td>novo@fabril.com</td><td>Gestor</td><td>Matriz</td><td>Convite pendente</td></tr>
            </table>
          </div>
        </main>
      </div>`, 1280, 800),
  },
  {
    fig: 62,
    file: 'figura-62-mockup-mobile.png',
    w: 360,
    h: 800,
    html: wrap(`
      <div class="mobile">
        <div class="logo" style="text-align:center;margin:24px 0">ManuCMMS</div>
        <div class="sketch-box" style="padding:20px">
          <p class="annotation" style="text-align:center;margin-bottom:16px">mobile · PWA</p>
          <div class="label">E-mail</div><div class="sketch-input" style="margin-bottom:12px">tecnico@fabril.com</div>
          <div class="label">Senha</div><div class="sketch-input" style="margin-bottom:16px">••••••</div>
          <button class="sketch-btn" style="width:100%">Entrar</button>
        </div>
        <div style="margin-top:20px;text-align:center;font-size:13px;color:#888">NF-03 · 360px</div>
      </div>`, 360, 800),
  },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

const results = [];
for (const s of screens) {
  await page.setViewportSize({ width: s.w, height: s.h });
  await page.setContent(s.html, { waitUntil: 'networkidle' });
  const dest = path.join(OUT, s.file);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`OK figura ${s.fig} → ${dest}`);
  results.push({ figura: s.fig, arquivo: `screenshots/dei/mockups/${s.file}` });
}

await browser.close();

// Atualizar FIGURAS.json
let manifest = {};
try {
  manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {
  manifest = { figuras: {}, apendice_diagramas: {} };
}
const titles = {
  55: 'Mockup login homologação',
  56: 'Mockup lista de ordens',
  57: 'Mockup detalhe de OS',
  58: 'Mockup dashboard KPIs',
  59: 'Mockup mapa de ativos',
  60: 'Mockup auditoria',
  61: 'Mockup administração',
  62: 'Mockup responsivo mobile',
};
for (const r of results) {
  manifest.figuras[String(r.figura)] = {
    secao: 'DEI 4.2',
    titulo: titles[r.figura],
    tipo: 'mockup_sketch',
    arquivo: r.arquivo,
  };
}
manifest.ultima_geracao_mockups_sketch = new Date().toISOString();
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\nFIGURAS.json atualizado (${results.length} mockups sketch)`);
