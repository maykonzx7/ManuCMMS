#!/usr/bin/env python3
"""Gera mockups DEI (fig. 55–62) estilo desenhado à mão com Pillow."""
from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/relatorio-assets/screenshots/dei/mockups"
MANIFEST = ROOT / "docs/relatorio-assets/FIGURAS.json"

BG = (250, 246, 239)
INK = (35, 35, 35)
BLUE = (30, 58, 95)
ACCENT = (212, 228, 247)
LINE = (200, 192, 180)
# 2 = 2560×1600 efetivo (impressão / Google Docs)
SCALE = int(__import__("os").environ.get("MOCKUP_SCALE", "2"))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    size = size * SCALE
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    if bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        ] + candidates
    for p in candidates:
        if Path(p).is_file():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _s(v: int | float) -> int:
    return int(v * SCALE)


def save_png(img: Image.Image, path: Path) -> None:
    img.save(path, format="PNG", optimize=False, compress_level=1)


def wobbly_rect(draw: ImageDraw.ImageDraw, xy, fill=(255, 254, 249), outline=INK, w=2):
    x0, y0, x1, y1 = (_s(xy[0]), _s(xy[1]), _s(xy[2]), _s(xy[3]))
    w = max(1, _s(w))
    rng = random.Random(hash(xy) % 99991)
    pts = []
    for side in range(4):
        n = 8
        for i in range(n + 1):
            t = i / n
            if side == 0:
                x, y = x0 + (x1 - x0) * t, y0 + rng.randint(-2, 2)
            elif side == 1:
                x, y = x1 + rng.randint(-2, 2), y0 + (y1 - y0) * t
            elif side == 2:
                x, y = x1 - (x1 - x0) * t, y1 + rng.randint(-2, 2)
            else:
                x, y = x0 + rng.randint(-2, 2), y1 - (y1 - y0) * t
            pts.append((x, y))
    draw.polygon(pts, fill=fill, outline=outline, width=w)


def ruled_bg(img: Image.Image):
    draw = ImageDraw.Draw(img)
    step = _s(28)
    for y in range(step, img.height, step):
        draw.line([(0, y), (img.width, y)], fill=LINE, width=max(1, _s(1)))


def sidebar(draw, h, labels, active=1):
    sw = _s(200)
    wobbly_rect(draw, (0, 0, sw, h), fill=(240, 235, 227))
    draw.line([(sw, 0), (sw, h)], fill=INK, width=max(1, _s(2)))
    draw.text((_s(16), _s(18)), "ManuCMMS", fill=BLUE, font=font(22, True))
    fy = font(14)
    for i, lb in enumerate(labels):
        y = _s(70 + i * 42)
        fill = ACCENT if i == active else (255, 254, 249)
        wobbly_rect(draw, (_s(12), y, _s(188), y + _s(34)), fill=fill)
        draw.text((_s(22), y + _s(8)), lb, fill=INK, font=fy)


def header_bar(draw, w, title, right=""):
    left = _s(200)
    hdr_h = _s(56)
    wobbly_rect(draw, (left, 0, w, hdr_h), fill=(255, 254, 249))
    draw.line([(left, hdr_h), (w, hdr_h)], fill=INK, width=max(1, _s(2)))
    draw.text((_s(220), _s(16)), title, fill=BLUE, font=font(20, True))
    if right:
        wobbly_rect(draw, (w - _s(160), _s(12), w - _s(20), _s(44)), fill=ACCENT)
        draw.text((w - _s(150), _s(20)), right, fill=BLUE, font=font(13))


def table(draw, x0, y0, cols, rows, cw):
    x0, y0, cw = _s(x0), _s(y0), _s(cw)
    rh = _s(32)
    fy = font(13)
    for c, h in enumerate(cols):
        wobbly_rect(draw, (x0 + c * cw, y0, x0 + (c + 1) * cw, y0 + rh), fill=(232, 228, 220))
        draw.text((x0 + c * cw + _s(8), y0 + _s(8)), h, fill=INK, font=fy)
    for r, row in enumerate(rows):
        yy = y0 + rh + r * rh
        for c, cell in enumerate(row):
            wobbly_rect(draw, (x0 + c * cw, yy, x0 + (c + 1) * cw, yy + rh))
            draw.text((x0 + c * cw + _s(8), yy + _s(8)), cell, fill=INK, font=fy)


def gen_login(w, h, path):
    w, h = _s(w), _s(h)
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)
    ruled_bg(img)
    cx, cy = w // 2, h // 2
    wobbly_rect(draw, (cx - _s(210), cy - _s(180), cx + _s(210), cy + _s(200)))
    draw.text((cx - _s(80), cy - _s(150)), "ManuCMMS", fill=BLUE, font=font(28, True))
    draw.text((cx - _s(100), cy - _s(115)), "Acesso corporativo", fill=(120, 120, 120), font=font(12))
    for i, lb in enumerate(["E-mail corporativo", "Senha"]):
        y = cy - _s(70 + i * 70)
        draw.text((cx - _s(170), y), lb, fill=INK, font=font(13))
        wobbly_rect(draw, (cx - _s(170), y + _s(18), cx + _s(170), y + _s(52)))
        draw.text((cx - _s(160), y + _s(28)), "usuario@empresa.com" if i == 0 else "********", fill=(100, 100, 100), font=font(14))
    wobbly_rect(draw, (cx - _s(90), cy + _s(90), cx + _s(90), cy + _s(128)), fill=ACCENT)
    draw.text((cx - _s(72), cy + _s(102)), "Entrar no workspace", fill=BLUE, font=font(14, True))
    save_png(img, path)


def gen_desktop_layout(w, h, path, nav, title, content_fn, header_right=""):
    w, h = _s(w), _s(h)
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)
    ruled_bg(img)
    sidebar(draw, h, nav, active=1)
    header_bar(draw, w, title, header_right)
    content_fn(draw, w, h)
    save_png(img, path)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    specs = []

    p55 = OUT / "figura-55-mockup-login.png"
    gen_login(1280, 800, p55)
    specs.append((55, p55, "Mockup login homologação"))

    def content_ordens(d, w, h):
        table(d, 220, 80, ["OS", "Ativo", "Tipo", "Status", "Técnico"],
              [["#1042", "Compressor A", "Preditiva", "Execução", "João"],
               ["#1041", "Esteira B", "Corretiva", "Aguardando", "—"],
               ["#1038", "Bomba C", "Preventiva", "Concluída", "Maria"]], 170)

    p56 = OUT / "figura-56-mockup-ordens.png"
    gen_desktop_layout(1280, 800, p56, ["Home", "Ordens de Serviço", "Ativos", "Dashboard"],
                       "Ordens de Serviço", content_ordens, "+ Nova OS")
    specs.append((56, p56, "Mockup lista de ordens"))

    def content_os(d, w, h):
        wobbly_rect(d, (_s(220), _s(80), _s(620), _s(340)))
        d.text((_s(240), _s(100)), "Descrição do problema", fill=INK, font=font(13))
        wobbly_rect(d, (_s(240), _s(120), _s(600), _s(170)))
        d.text((_s(250), _s(135)), "Temperatura acima do limite IoT", fill=(90, 90, 90), font=font(13))
        wobbly_rect(d, (_s(240), _s(190), _s(600), _s(280)))
        d.text((_s(300), _s(225)), "foto evidencia", fill=(130, 130, 130), font=font(16))
        wobbly_rect(d, (_s(640), _s(80), _s(1040), _s(340)))
        d.text((_s(660), _s(100)), "Solucao e assinatura", fill=INK, font=font(13))
        wobbly_rect(d, (_s(660), _s(200), _s(1020), _s(250)))
        d.text((_s(720), _s(215)), "assinatura digital", fill=(130, 130, 130), font=font(14))
        wobbly_rect(d, (_s(860), _s(290), _s(1020), _s(325)), fill=ACCENT)
        d.text((_s(880), _s(300)), "Fechar OS", fill=BLUE, font=font(13, True))

    p57 = OUT / "figura-57-mockup-os-detalhe.png"
    gen_desktop_layout(1280, 800, p57, ["Home", "OS #1042", "Ativos"],
                       "Detalhe · OS Preditiva #1042", content_os)
    specs.append((57, p57, "Mockup detalhe de OS"))

    def content_dash(d, w, h):
        labels = [("94%", "MTBF"), ("2.4h", "MTTR"), ("87%", "OEE"), ("12", "OS abertas")]
        for i, (val, lb) in enumerate(labels):
            x = _s(220 + i * 250)
            wobbly_rect(d, (x, _s(80), x + _s(220), _s(170)))
            d.text((x + _s(70), _s(100)), val, fill=BLUE, font=font(26, True))
            d.text((x + _s(80), _s(140)), lb, fill=INK, font=font(13))
        wobbly_rect(d, (_s(220), _s(200), _s(1200), _s(420)))
        d.text((_s(560), _s(290)), "Grafico de indicadores de manutencao", fill=(120, 120, 120), font=font(16))

    p58 = OUT / "figura-58-mockup-dashboard.png"
    gen_desktop_layout(1280, 800, p58, ["Home", "Dashboard", "Relatórios"],
                       "Dashboard Executivo", content_dash)
    specs.append((58, p58, "Mockup dashboard KPIs"))

    def content_map(d, w, h):
        wobbly_rect(d, (_s(220), _s(80), _s(1200), _s(450)))
        for x, y in [(300, 180), (520, 260), (780, 200)]:
            x, y = _s(x), _s(y)
            d.ellipse((x, y, x + _s(20), y + _s(20)), outline=(192, 57, 43), width=max(1, _s(2)), fill=(250, 219, 216))
        d.text((_s(240), _s(100)), "Mapa - Unidade Fabril", fill=INK, font=font(14))

    p59 = OUT / "figura-59-mockup-mapa.png"
    gen_desktop_layout(1280, 800, p59, ["Home", "Ativos", "Mapa"],
                       "Planta · Mapa de Ativos", content_map)
    specs.append((59, p59, "Mockup mapa de ativos"))

    def content_audit(d, w, h):
        table(d, 220, 80, ["Data", "Usuário", "Ação", "Entidade"],
              [["10/06 14:22", "auditor@co", "CONSULTA", "OrdemServico"],
               ["10/06 13:01", "gestor@co", "UPDATE", "Ativo"],
               ["09/06 18:44", "tecnico@co", "FECHAMENTO", "OS #1040"]], 240)
        d.text((_s(220), _s(200)), "Registros de auditoria do sistema", fill=(120, 120, 120), font=font(12))

    p60 = OUT / "figura-60-mockup-auditoria.png"
    gen_desktop_layout(1280, 800, p60, ["Home", "Auditoria"],
                       "Trilha de Auditoria", content_audit, "Export CSV")
    specs.append((60, p60, "Mockup auditoria"))

    def content_admin(d, w, h):
        table(d, 220, 80, ["E-mail", "Perfil", "Unidade", "Status"],
              [["tecnico@fabril.com", "Técnico", "Planta 01", "Ativo"],
               ["supervisor@fabril.com", "Supervisor", "Planta 01", "Ativo"],
               ["novo@fabril.com", "Gestor", "Matriz", "Convite pendente"]], 240)

    p61 = OUT / "figura-61-mockup-admin.png"
    gen_desktop_layout(1280, 800, p61, ["Admin", "Convites", "Permissões"],
                       "Convites e Permissões", content_admin, "+ Convidar")
    specs.append((61, p61, "Mockup administração"))

    p62 = OUT / "figura-62-mockup-mobile.png"
    gen_login(360, 800, p62)
    specs.append((62, p62, "Mockup responsivo mobile"))

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.is_file() else {"figuras": {}}
    for fig, path, title in specs:
        rel = f"screenshots/dei/mockups/{path.name}"
        manifest.setdefault("figuras", {})[str(fig)] = {
            "secao": "DEI 4.2",
            "titulo": title,
            "tipo": "mockup_sketch",
            "arquivo": rel,
        }
        print(f"OK figura {fig} → {path}")

    manifest["ultima_geracao_mockups_sketch"] = __import__("datetime").datetime.now().isoformat()
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n{len(specs)} mockups sketch → {OUT}")


if __name__ == "__main__":
    main()
