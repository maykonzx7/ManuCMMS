/**
 * Gera mockups sketch/wireframe de TODAS as telas do ManuCMMS.
 * Saída: docs/mockups/telas/*.png + docs/mockups/telas/index.json
 *
 * Uso: node scripts/generate-all-mockups.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/mockups/telas');

const SKETCH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@500;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Patrick Hand', 'Caveat', cursive;
  background: #faf6ef;
  color: #1a1a1a;
  min-height: 100vh;
  background-image: linear-gradient(#e5ddd0 1px, transparent 1px);
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
  cursor: default;
}
.sketch-btn-sm { font-size: 14px; padding: 6px 14px; }
.sketch-input {
  border: 2px dashed #555;
  border-radius: 8px 20px 12px 18px / 18px 8px 22px 12px;
  background: #fff;
  min-height: 38px;
  width: 100%;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 16px;
  color: #666;
  display: flex;
  align-items: center;
}
.sidebar { width: 200px; border-right: 2px solid #333; padding: 16px 12px; min-height: 100vh; background: #f0ebe3; flex-shrink: 0; }
.nav-group { font-size: 11px; color: #888; margin: 14px 0 6px 4px; text-transform: uppercase; }
.nav-item { padding: 8px 10px; margin: 4px 0; border: 1.5px dashed #888; border-radius: 6px; font-size: 14px; }
.nav-item.active { border-style: solid; background: #e8f0fa; font-weight: bold; }
.header { padding: 14px 20px; border-bottom: 2px solid #333; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.logo { font-family: 'Caveat', cursive; font-size: 28px; font-weight: 600; color: #1e3a5f; }
.content { padding: 20px; flex: 1; }
.layout { display: flex; min-height: 100vh; }
table.sketch { width: 100%; border-collapse: collapse; font-size: 14px; }
table.sketch th, table.sketch td { border: 1.5px solid #444; padding: 8px 10px; text-align: left; }
table.sketch th { background: #e8e4dc; }
.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-3 { grid-template-columns: repeat(3, 1fr); }
.kpi-card { padding: 16px; text-align: center; min-height: 90px; }
.kpi-card .val { font-size: 26px; font-weight: bold; color: #1e3a5f; }
.chart-placeholder { height: 200px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #777; }
.map-box { height: 320px; position: relative; }
.map-pin { position: absolute; width: 24px; height: 24px; border: 2px solid #c0392b; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #fadbd8; }
.x-img { width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #aaa; border: 2px dashed #999; border-radius: 8px; }
.label { font-size: 13px; color: #555; margin-bottom: 4px; }
h2.title { font-family: 'Caveat', cursive; font-size: 26px; color: #1e3a5f; }
.annotation { font-size: 12px; color: #888; font-style: italic; }
.mobile { max-width: 360px; margin: 0 auto; padding: 16px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.badge { display: inline-block; border: 1.5px solid #555; border-radius: 12px; padding: 2px 10px; font-size: 12px; background: #e8f0fa; }
.kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kanban-col { min-height: 280px; padding: 10px; }
.kanban-card { padding: 10px; margin-bottom: 8px; font-size: 13px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 8px 16px; border: 2px dashed #888; border-radius: 8px; font-size: 14px; }
.tab.active { border-style: solid; background: #e8f0fa; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card-list { display: flex; flex-direction: column; gap: 10px; }
.card-row { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
.status-ok { color: #27ae60; }
.status-warn { color: #e67e22; }
.status-err { color: #c0392b; }
.form-grid { display: grid; gap: 14px; max-width: 560px; }
.switch-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #ccc; }
`;

const NAV = {
  principal: ['Início', 'Ordens de Serviço', 'Agenda / Kanban', 'Ativos', 'Mapa de Ativos', 'Peças / Estoque'],
  gestao: ['Usuários', 'Unidades', 'Permissões', 'Painel Admin'],
  analises: ['Dashboard', 'Métricas Admin', 'Relatórios', 'Auditoria'],
  plataforma: ['Painel Plataforma'],
  sistema: ['Notificações', 'Integrações', 'IoT', 'Configurações'],
};

function wrap(body, w, h) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${SKETCH_CSS}</style></head>
<body style="width:${w}px;min-height:${h}px;margin:0;overflow:hidden">${body}</body></html>`;
}

function sidebar(activeLabel) {
  const groups = [
    { title: 'Principal', items: NAV.principal },
    { title: 'Gestão', items: NAV.gestao },
    { title: 'Análises', items: NAV.analises },
    { title: 'Plataforma', items: NAV.plataforma },
    { title: 'Sistema', items: NAV.sistema },
  ];
  const items = groups
    .map(
      (g) =>
        `<div class="nav-group">${g.title}</div>` +
        g.items
          .map(
            (item) =>
              `<div class="nav-item${item === activeLabel ? ' active' : ''}">${item}</div>`,
          )
          .join(''),
    )
    .join('');
  return `<aside class="sidebar"><div class="logo" style="margin-bottom:16px">ManuCMMS</div>${items}</aside>`;
}

function desktop(active, title, content, headerRight = '') {
  const btn = headerRight ? `<button class="sketch-btn sketch-btn-sm">${headerRight}</button>` : '';
  return wrap(
    `<div class="layout">
      ${sidebar(active)}
      <main style="flex:1;display:flex;flex-direction:column">
        <div class="header"><h2 class="title">${title}</h2>${btn}</div>
        <div class="content">${content}</div>
      </main>
    </div>`,
    1280,
    800,
  );
}

function authCenter(content) {
  return wrap(
    `<div style="display:flex;min-height:800px;align-items:center;justify-content:center;background:linear-gradient(135deg,#e8eef5,#faf6ef)">
      <div class="sketch-box" style="width:440px;padding:36px">${content}</div>
    </div>`,
    1280,
    800,
  );
}

function tableHtml(cols, rows) {
  const th = cols.map((c) => `<th>${c}</th>`).join('');
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table class="sketch">${`<tr>${th}</tr>`}${tr}</table>`;
}

function kpiRow(items) {
  return `<div class="kpi">${items.map(([v, l]) => `<div class="sketch-box kpi-card"><div class="val">${v}</div>${l}</div>`).join('')}</div>`;
}

const screens = [
  {
    id: '01-acesso-login',
    titulo: 'Login — Acesso',
    rota: '/workspace/acesso',
    w: 1280,
    h: 800,
    html: authCenter(`
      <div class="logo" style="text-align:center;margin-bottom:20px">ManuCMMS</div>
      <h2 style="text-align:center;font-size:22px;margin-bottom:6px">Bem-vindo de volta</h2>
      <p class="annotation" style="text-align:center;margin-bottom:20px">Entre com suas credenciais</p>
      <div style="margin-bottom:14px"><div class="label">E-mail corporativo</div><div class="sketch-input">usuario@empresa.com</div></div>
      <div style="margin-bottom:20px"><div class="label">Senha</div><div class="sketch-input">••••••••</div></div>
      <div style="text-align:center"><button class="sketch-btn">Entrar</button></div>
      <p style="text-align:center;margin-top:14px;font-size:14px;color:#666">Google · Esqueci minha senha</p>`),
  },
  {
    id: '02-acesso-empresa',
    titulo: 'Login — Empresa específica',
    rota: '/workspace/acesso/fabril',
    w: 1280,
    h: 800,
    html: authCenter(`
      <div class="logo" style="text-align:center;margin-bottom:12px">ManuCMMS</div>
      <p style="text-align:center;font-size:16px;margin-bottom:20px"><strong>Fabril Indústria</strong></p>
      <div style="margin-bottom:14px"><div class="label">E-mail</div><div class="sketch-input">tecnico@fabril.com</div></div>
      <div style="margin-bottom:20px"><div class="label">Senha</div><div class="sketch-input">••••••••</div></div>
      <div style="text-align:center"><button class="sketch-btn">Entrar na Fabril</button></div>`),
  },
  {
    id: '03-redefinir-senha',
    titulo: 'Redefinir senha',
    rota: '/workspace/acesso/redefinir-senha',
    w: 1280,
    h: 800,
    html: authCenter(`
      <div class="logo" style="text-align:center;margin-bottom:20px">ManuCMMS</div>
      <h2 style="text-align:center;font-size:20px;margin-bottom:16px">Redefinir senha</h2>
      <div style="margin-bottom:14px"><div class="label">E-mail cadastrado</div><div class="sketch-input">usuario@empresa.com</div></div>
      <div style="text-align:center;margin-top:8px"><button class="sketch-btn">Enviar link de recuperação</button></div>
      <p style="text-align:center;margin-top:16px;font-size:14px;color:#666">Voltar ao login</p>`),
  },
  {
    id: '04-convite',
    titulo: 'Aceitar convite',
    rota: '/workspace/convite',
    w: 1280,
    h: 800,
    html: authCenter(`
      <div class="logo" style="text-align:center;margin-bottom:16px">ManuCMMS</div>
      <h2 style="text-align:center;font-size:20px;margin-bottom:8px">Convite para Fabril</h2>
      <p class="annotation" style="text-align:center;margin-bottom:20px">Complete seu cadastro</p>
      <div style="margin-bottom:12px"><div class="label">Nome completo</div><div class="sketch-input">João Silva</div></div>
      <div style="margin-bottom:12px"><div class="label">E-mail</div><div class="sketch-input">joao@fabril.com</div></div>
      <div style="margin-bottom:16px"><div class="label">Nova senha</div><div class="sketch-input">••••••••</div></div>
      <div style="text-align:center"><button class="sketch-btn">Ativar conta</button></div>`),
  },
  {
    id: '05-offline',
    titulo: 'Modo offline (PWA)',
    rota: '/~offline',
    w: 1280,
    h: 800,
    html: wrap(`<div style="display:flex;min-height:800px;align-items:center;justify-content:center;text-align:center;padding:40px">
      <div><div style="font-size:48px;margin-bottom:16px">📡</div>
      <h2 class="title">Você está offline</h2>
      <p style="margin-top:12px;color:#666;font-size:16px">Verifique sua conexão e tente novamente.</p>
      <button class="sketch-btn" style="margin-top:24px">Tentar novamente</button></div></div>`, 1280, 800),
  },
  {
    id: '06-inicio-home',
    titulo: 'Início / Home',
    rota: '/workspace',
    html: desktop(
      'Início',
      'Olá, Maria · Planta 01',
      `${kpiRow([['94%', 'MTBF'], ['2.4h', 'MTTR'], ['87%', 'OEE'], ['12', 'OS abertas']])}
      <div class="grid-2">
        <div class="sketch-box" style="padding:16px"><div class="label">Ordens recentes</div>
          ${tableHtml(['OS', 'Ativo', 'Status'], [['#1042', 'Compressor A', 'Em execução'], ['#1041', 'Esteira B', 'Aguardando']])}</div>
        <div class="sketch-box" style="padding:16px"><div class="label">Ativos em atenção</div>
          ${tableHtml(['Ativo', 'Status'], [['Bomba C', 'Manutenção'], ['Motor D', 'Falha']])}</div>
      </div>`,
    ),
  },
  {
    id: '07-ordens-lista',
    titulo: 'Ordens de Serviço — Lista',
    rota: '/workspace/ordens',
    html: desktop(
      'Ordens de Serviço',
      'Ordens de Serviço',
      `<div class="toolbar"><div class="sketch-input" style="width:220px">🔍 Buscar...</div>
        <span class="badge">Status: Todos</span><span class="badge">Tipo: Todos</span></div>
        ${tableHtml(['OS', 'Ativo', 'Tipo', 'Prioridade', 'Status', 'Técnico', 'SLA'],
          [['#1042', 'Compressor A', 'Preditiva', 'Alta', 'Em execução', 'João', 'OK'],
           ['#1041', 'Esteira B', 'Corretiva', 'Média', 'Aguardando', '—', 'OK'],
           ['#1038', 'Bomba C', 'Preventiva', 'Baixa', 'Concluída', 'Maria', '—']])}`,
      '+ Nova OS',
    ),
  },
  {
    id: '08-ordens-agenda-kanban',
    titulo: 'Agenda / Kanban',
    rota: '/workspace/ordens/agenda',
    html: desktop(
      'Agenda / Kanban',
      'Agenda e Kanban',
      `<div class="tabs"><div class="tab active">Kanban</div><div class="tab">Calendário</div></div>
      <div class="kanban">
        ${['Aguardando', 'Em execução', 'Pausada', 'Concluída'].map((col, i) => `
          <div class="sketch-box kanban-col">
            <div class="label" style="font-weight:bold;margin-bottom:8px">${col}</div>
            <div class="sketch-box kanban-card">#104${i} · Ativo ${String.fromCharCode(65 + i)}<br><span class="badge">${i === 0 ? 'Corretiva' : 'Preventiva'}</span></div>
          </div>`).join('')}</div>`,
    ),
  },
  {
    id: '09-ordens-nova',
    titulo: 'Nova Ordem de Serviço',
    rota: '/workspace/ordens/nova',
    html: desktop(
      'Ordens de Serviço',
      'Nova Ordem de Serviço',
      `<div class="form-grid">
        <div><div class="label">Ativo</div><div class="sketch-input">Compressor A — Linha 1</div></div>
        <div><div class="label">Tipo de manutenção</div><div class="sketch-input">Corretiva</div></div>
        <div><div class="label">Prioridade</div><div class="sketch-input">Alta</div></div>
        <div><div class="label">Descrição do problema</div><div class="sketch-input" style="min-height:80px">Vazamento detectado no selo mecânico</div></div>
        <div><div class="label">Técnico responsável</div><div class="sketch-input">João Silva</div></div>
        <div style="margin-top:8px"><button class="sketch-btn">Criar ordem</button></div></div>`,
    ),
  },
  {
    id: '10-ordens-detalhe',
    titulo: 'Detalhe da OS',
    rota: '/workspace/ordens/:id',
    html: desktop(
      'Ordens de Serviço',
      'OS #1042 · Preditiva',
      `<div style="margin-bottom:12px"><span class="badge">Em execução</span> <span class="badge">Prioridade Alta</span> <span class="badge">SLA OK</span></div>
      <div class="grid-2">
        <div class="sketch-box" style="padding:16px">
          <div class="label">Descrição do problema</div><div class="sketch-input" style="min-height:60px;margin-bottom:12px">Temperatura acima do limite IoT</div>
          <div class="label">Evidência (foto)</div><div class="x-img">📷 foto</div>
        </div>
        <div class="sketch-box" style="padding:16px">
          <div class="label">Solução aplicada</div><div class="sketch-input" style="min-height:60px;margin-bottom:12px">Troca do sensor DHT22</div>
          <div class="label">Peças utilizadas</div>${tableHtml(['Código', 'Qtd'], [['SEN-DHT22', '1'], ['CAB-4P', '2']])}
          <div style="margin-top:16px;text-align:right"><button class="sketch-btn sketch-btn-sm">Concluir OS</button></div>
        </div>
      </div>`,
    ),
  },
  {
    id: '11-ordens-imprimir',
    titulo: 'Impressão da OS',
    rota: '/workspace/ordens/:id/imprimir',
    html: wrap(`<div style="padding:40px;max-width:800px;margin:0 auto">
      <div class="logo" style="margin-bottom:8px">ManuCMMS</div>
      <h2 class="title">Ordem de Serviço #1042</h2>
      <p class="annotation">Fabril Indústria · Planta 01 · 10/06/2026</p>
      <div style="margin:20px 0">${tableHtml(['Campo', 'Valor'],
        [['Ativo', 'Compressor A'], ['Tipo', 'Preditiva'], ['Técnico', 'João Silva'],
         ['Problema', 'Temperatura acima do limite'], ['Solução', 'Troca do sensor DHT22']])}</div>
      <div class="x-img" style="height:60px;margin-top:20px">✍ Assinatura do técnico</div>
    </div>`, 1280, 800),
  },
  {
    id: '12-ativos-lista',
    titulo: 'Ativos — Lista',
    rota: '/workspace/ativos',
    html: desktop(
      'Ativos',
      'Ativos',
      `<div class="toolbar"><div class="sketch-input" style="width:220px">🔍 Buscar ativo...</div><span class="badge">Status: Todos</span></div>
        ${tableHtml(['Código', 'Nome', 'Local', 'Status', 'Última OS'],
          [['ATV-001', 'Compressor A', 'Linha 1', 'Operacional', '#1038'],
           ['ATV-002', 'Esteira B', 'Expedição', 'Manutenção', '#1041'],
           ['ATV-003', 'Bomba C', 'Caldeira', 'Falha', '#1040']])}`,
      '+ Novo Ativo',
    ),
  },
  {
    id: '13-ativos-novo',
    titulo: 'Novo Ativo',
    rota: '/workspace/ativos/novo',
    html: desktop(
      'Ativos',
      'Cadastrar Ativo',
      `<div class="form-grid">
        <div><div class="label">Código</div><div class="sketch-input">ATV-004</div></div>
        <div><div class="label">Nome</div><div class="sketch-input">Motor principal</div></div>
        <div><div class="label">Localização</div><div class="sketch-input">Setor B — Linha 2</div></div>
        <div><div class="label">Coordenadas (mapa)</div><div class="sketch-input">-23.5505, -46.6333</div></div>
        <div><div class="label">Foto do ativo</div><div class="x-img">📷 upload</div></div>
        <div><button class="sketch-btn">Salvar ativo</button></div></div>`,
    ),
  },
  {
    id: '14-ativos-detalhe',
    titulo: 'Detalhe do Ativo',
    rota: '/workspace/ativos/:id',
    html: desktop(
      'Ativos',
      'Compressor A · ATV-001',
      `<div style="margin-bottom:12px"><span class="badge status-ok">Operacional</span></div>
      <div class="grid-2">
        <div class="sketch-box" style="padding:16px">
          <div class="x-img" style="height:140px;margin-bottom:12px">📷 foto do ativo</div>
          <div class="label">Localização</div><div class="sketch-input">Linha 1 · Setor A</div>
        </div>
        <div class="sketch-box" style="padding:16px">
          <div class="label">Histórico de OS</div>
          ${tableHtml(['OS', 'Tipo', 'Data'], [['#1042', 'Preditiva', '10/06'], ['#1038', 'Preventiva', '01/06']])}
        </div>
      </div>`,
      'Editar',
    ),
  },
  {
    id: '15-ativos-editar',
    titulo: 'Editar Ativo',
    rota: '/workspace/ativos/:id/editar',
    html: desktop(
      'Ativos',
      'Editar · Compressor A',
      `<div class="form-grid">
        <div><div class="label">Código</div><div class="sketch-input">ATV-001</div></div>
        <div><div class="label">Nome</div><div class="sketch-input">Compressor A</div></div>
        <div><div class="label">Status</div><div class="sketch-input">Operacional</div></div>
        <div><div class="label">Localização</div><div class="sketch-input">Linha 1 · Setor A</div></div>
        <div><button class="sketch-btn">Salvar alterações</button></div></div>`,
    ),
  },
  {
    id: '16-ativos-mapa',
    titulo: 'Mapa de Ativos',
    rota: '/workspace/ativos/mapa',
    html: desktop(
      'Mapa de Ativos',
      'Mapa · Planta 01',
      `<div class="sketch-box map-box">
        <div class="map-pin" style="top:80px;left:120px"></div>
        <div class="map-pin" style="top:180px;left:340px"></div>
        <div class="map-pin" style="top:120px;left:520px"></div>
        <div style="position:absolute;bottom:12px;right:16px;font-size:14px;color:#888">Leaflet · OpenStreetMap</div>
      </div>`,
    ),
  },
  {
    id: '17-pecas-estoque',
    titulo: 'Peças / Estoque',
    rota: '/workspace/pecas',
    html: desktop(
      'Peças / Estoque',
      'Peças e Estoque',
      `<div class="tabs"><div class="tab active">Catálogo</div><div class="tab">Movimentações</div></div>
        ${tableHtml(['Código', 'Nome', 'Estoque', 'Mínimo', 'Status'],
          [['SEN-DHT22', 'Sensor DHT22', '12', '5', 'OK'],
           ['ROL-6205', 'Rolamento 6205', '3', '5', 'Baixo'],
           ['CAB-4P', 'Cabo 4 vias', '48', '10', 'OK']])}`,
      '+ Nova peça',
    ),
  },
  {
    id: '18-usuarios',
    titulo: 'Usuários',
    rota: '/workspace/usuarios',
    html: desktop(
      'Usuários',
      'Usuários da unidade',
      `<div class="toolbar"><div class="sketch-input" style="width:220px">🔍 Buscar...</div></div>
        ${tableHtml(['Nome', 'E-mail', 'Perfil', 'Status'],
          [['João Silva', 'joao@fabril.com', 'Técnico', 'Ativo'],
           ['Maria Santos', 'maria@fabril.com', 'Gestor', 'Ativo'],
           ['Pedro Lima', 'pedro@fabril.com', 'Supervisor', 'Ativo']])}`,
      '+ Convidar',
    ),
  },
  {
    id: '19-unidades',
    titulo: 'Unidades',
    rota: '/workspace/unidades',
    html: desktop(
      'Unidades',
      'Unidades da empresa',
      `${tableHtml(['Nome', 'Slug', 'Endereço', 'Ativos'],
        [['Matriz', 'matriz', 'São Paulo, SP', '45'],
         ['Planta 01', 'planta-01', 'Campinas, SP', '128'],
         ['Planta 02', 'planta-02', 'Sorocaba, SP', '67']])}`,
      '+ Nova unidade',
    ),
  },
  {
    id: '20-permissoes',
    titulo: 'Permissões',
    rota: '/workspace/permissoes',
    html: desktop(
      'Permissões',
      'Matriz de permissões',
      `${tableHtml(['Permissão', 'Técnico', 'Supervisor', 'Gestor', 'Admin'],
        [['Criar OS', '✓', '✓', '✓', '✓'],
         ['Gerenciar ativos', '—', '✓', '✓', '✓'],
         ['Convidar usuários', '—', '—', '✓', '✓'],
         ['Auditoria', '—', '—', '✓', '✓']])}`,
    ),
  },
  {
    id: '21-admin',
    titulo: 'Painel Admin',
    rota: '/workspace/admin',
    html: desktop(
      'Painel Admin',
      'Administração da empresa',
      `${kpiRow([['156', 'Usuários'], ['3', 'Unidades'], ['5', 'Convites pendentes'], ['99.2%', 'Uptime']])}
      <div class="card-list">
        <div class="sketch-box card-row"><span>Convites pendentes</span><button class="sketch-btn sketch-btn-sm">Gerenciar</button></div>
        <div class="sketch-box card-row"><span>Configurações da empresa</span><button class="sketch-btn sketch-btn-sm">Abrir</button></div>
        <div class="sketch-box card-row"><span>Chaves de API</span><button class="sketch-btn sketch-btn-sm">Ver</button></div>
      </div>`,
    ),
  },
  {
    id: '22-dashboard',
    titulo: 'Dashboard Executivo',
    rota: '/workspace/dashboard',
    html: desktop(
      'Dashboard',
      'Dashboard Executivo',
      `${kpiRow([['94%', 'MTBF'], ['2.4h', 'MTTR'], ['87%', 'OEE'], ['96%', 'Disponibilidade']])}
      <div class="sketch-box chart-placeholder">📊 Gráfico · manutenção por tipo (30 dias)</div>`,
    ),
  },
  {
    id: '23-metricas',
    titulo: 'Métricas Admin',
    rota: '/workspace/metricas',
    html: desktop(
      'Métricas Admin',
      'Métricas da plataforma',
      `${kpiRow([['1.2k', 'Requisições/dia'], ['45ms', 'Latência p95'], ['0.1%', 'Erros'], ['128', 'Empresas']])}
      <div class="grid-2">
        <div class="sketch-box chart-placeholder" style="height:160px">📈 Throughput API</div>
        <div class="sketch-box chart-placeholder" style="height:160px">📉 Filas RabbitMQ</div>
      </div>`,
    ),
  },
  {
    id: '24-relatorios',
    titulo: 'Relatórios',
    rota: '/workspace/relatorios',
    html: desktop(
      'Relatórios',
      'Relatórios e exportações',
      `<div class="card-list">
        ${['Ordens de serviço (CSV/PDF)', 'Ativos e histórico', 'Peças e movimentações', 'Indicadores MTBF/MTTR'].map((r) =>
          `<div class="sketch-box card-row"><span>${r}</span><button class="sketch-btn sketch-btn-sm">Exportar</button></div>`).join('')}
      </div>`,
    ),
  },
  {
    id: '25-auditoria',
    titulo: 'Auditoria',
    rota: '/workspace/auditoria',
    html: desktop(
      'Auditoria',
      'Trilha de Auditoria',
      `${tableHtml(['Data', 'Usuário', 'Ação', 'Entidade', 'IP'],
        [['10/06 14:22', 'auditor@co', 'CONSULTA', 'OrdemServico', '192.168.1.10'],
         ['10/06 13:01', 'gestor@co', 'UPDATE', 'Ativo', '192.168.1.5'],
         ['09/06 18:44', 'tecnico@co', 'FECHAMENTO', 'OS #1040', '10.0.0.22']])}`,
      'Export CSV',
    ),
  },
  {
    id: '26-platform',
    titulo: 'Painel Plataforma',
    rota: '/workspace/platform',
    html: desktop(
      'Painel Plataforma',
      'Operações da plataforma',
      `${kpiRow([['128', 'Empresas'], ['1.842', 'Usuários'], ['12', 'Alertas'], ['OK', 'Saúde geral']])}
      ${tableHtml(['Empresa', 'Plano', 'Usuários', 'Status'],
        [['Fabril Ind.', 'Pro', '156', 'Ativa'],
         ['MetalCorp', 'Starter', '23', 'Ativa'],
         ['AgroTech', 'Pro', '89', 'Trial']])}`,
    ),
  },
  {
    id: '27-notificacoes',
    titulo: 'Notificações',
    rota: '/workspace/notificacoes',
    html: desktop(
      'Notificações',
      'Central de notificações',
      `<div class="card-list">
        <div class="sketch-box card-row"><span><strong>OS #1042</strong> · Atribuída a você</span><span class="annotation">há 5 min</span></div>
        <div class="sketch-box card-row"><span><strong>Estoque baixo</strong> · Rolamento 6205</span><span class="annotation">há 2 h</span></div>
        <div class="sketch-box card-row"><span><strong>SLA</strong> · OS #1035 próxima do limite</span><span class="annotation">ontem</span></div>
      </div>`,
      'Marcar lidas',
    ),
  },
  {
    id: '28-integracoes',
    titulo: 'Integrações',
    rota: '/workspace/integracoes',
    html: desktop(
      'Integrações',
      'Integrações e webhooks',
      `<div class="grid-2">
        ${['RabbitMQ', 'MongoDB', 'Redis', 'SMTP', 'Gateway IoT'].map((s, i) =>
          `<div class="sketch-box card-row"><span>${s}</span><span class="${i === 4 ? 'status-warn' : 'status-ok'}">${i === 4 ? 'Degradado' : 'OK'}</span></div>`).join('')}
      </div>
      <div class="sketch-box" style="padding:16px;margin-top:16px">
        <div class="label">Webhook URL</div><div class="sketch-input">https://api.empresa.com/webhooks/manucmms</div>
        <div class="label" style="margin-top:12px">API Key</div><div class="sketch-input">mcms_••••••••••••</div>
      </div>`,
    ),
  },
  {
    id: '29-iot',
    titulo: 'IoT',
    rota: '/workspace/iot',
    html: desktop(
      'IoT',
      'Sensores e telemetria',
      `${tableHtml(['Sensor', 'Ativo', 'Última leitura', 'Status'],
        [['TEMP-001', 'Compressor A', '78°C · 2 min', 'Alerta'],
         ['VIB-002', 'Esteira B', '0.3 mm/s · 1 min', 'OK'],
         ['PRESS-003', 'Bomba C', '4.2 bar · 30 s', 'OK']])}`,
    ),
  },
  {
    id: '30-configuracoes',
    titulo: 'Configurações',
    rota: '/workspace/configuracoes',
    html: desktop(
      'Configurações',
      'Configurações da unidade',
      `<div class="sketch-box" style="padding:20px">
        <div class="switch-row"><span>Notificações por e-mail</span><span class="badge">Ativo</span></div>
        <div class="switch-row"><span>SLA padrão (horas)</span><span>24</span></div>
        <div class="switch-row"><span>Fuso horário</span><span>America/Sao_Paulo</span></div>
        <div class="switch-row"><span>Idioma</span><span>Português (BR)</span></div>
      </div>`,
    ),
  },
  {
    id: '31-perfil',
    titulo: 'Perfil do usuário',
    rota: '/workspace/perfil',
    html: desktop(
      'Configurações',
      'Meu perfil',
      `<div class="form-grid">
        <div><div class="label">Nome</div><div class="sketch-input">Maria Santos</div></div>
        <div><div class="label">E-mail</div><div class="sketch-input">maria@fabril.com</div></div>
        <div><div class="label">Perfil</div><div class="sketch-input">Gestor</div></div>
        <div><div class="label">Unidade atual</div><div class="sketch-input">Planta 01</div></div>
        <div><button class="sketch-btn sketch-btn-sm">Alterar senha</button></div></div>`,
    ),
  },
  {
    id: '32-cliente-handoff',
    titulo: 'Handoff cliente',
    rota: '/workspace/cliente/:slug',
    html: wrap(`<div style="display:flex;min-height:800px;align-items:center;justify-content:center;text-align:center;padding:40px">
      <div class="sketch-box" style="padding:40px;max-width:480px">
        <div class="logo" style="margin-bottom:16px">ManuCMMS</div>
        <h2 class="title">Redirecionando...</h2>
        <p style="margin-top:12px;color:#666">Entrando no workspace da Fabril Indústria</p>
      </div></div>`, 1280, 800),
  },
  {
    id: '33-acesso-mobile',
    titulo: 'Login mobile (PWA)',
    rota: '/workspace/acesso',
    w: 360,
    h: 800,
    html: wrap(`<div class="mobile">
      <div class="logo" style="text-align:center;margin:24px 0">ManuCMMS</div>
      <div class="sketch-box" style="padding:20px">
        <p class="annotation" style="text-align:center;margin-bottom:16px">mobile · PWA · 360px</p>
        <div class="label">E-mail</div><div class="sketch-input" style="margin-bottom:12px">tecnico@fabril.com</div>
        <div class="label">Senha</div><div class="sketch-input" style="margin-bottom:16px">••••••</div>
        <button class="sketch-btn" style="width:100%">Entrar</button>
      </div></div>`, 360, 800),
  },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

const manifest = {
  geradoEm: new Date().toISOString(),
  total: screens.length,
  pasta: 'docs/mockups/telas',
  telas: [],
};

for (const s of screens) {
  const w = s.w ?? 1280;
  const h = s.h ?? 800;
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(s.html, { waitUntil: 'networkidle' });
  const filename = `${s.id}.png`;
  const dest = path.join(OUT, filename);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`OK ${s.id} → ${dest}`);
  manifest.telas.push({
    id: s.id,
    titulo: s.titulo,
    rota: s.rota,
    arquivo: filename,
    largura: w,
    altura: h,
  });
}

await browser.close();

await writeFile(path.join(OUT, 'index.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${screens.length} mockups gerados em ${OUT}`);
