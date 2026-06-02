const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const MARGIN_BOTTOM = 52;
const CONTENT_TOP = 778;
const CONTENT_TOP_CONTINUATION = 792;
const LINE_HEIGHT_BODY = 13;
const LINE_HEIGHT_KV = 15;

export type PdfKeyValue = { label: string; value: string };

export type PdfSection = {
  title: string;
  keyValues?: PdfKeyValue[];
  paragraphs?: string[];
  bullets?: string[];
};

export type ProfessionalPdfInput = {
  brand?: string;
  documentTitle: string;
  documentSubtitle?: string;
  generatedAt: string;
  headerMeta?: PdfKeyValue[];
  sections: PdfSection[];
};

type LayoutBlock =
  | { kind: 'banner'; brand: string; title: string; subtitle?: string }
  | { kind: 'meta'; rows: PdfKeyValue[] }
  | { kind: 'section'; title: string }
  | { kind: 'kv'; label: string; value: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'bullet'; lines: string[] }
  | { kind: 'rule' }
  | { kind: 'spacer'; height: number };

function normalizePdfLine(line: string): string {
  return line
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(line: string): string {
  return line
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

export function wrapPdfText(text: string, max = 88): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return ['-'];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function flattenInput(input: ProfessionalPdfInput): LayoutBlock[] {
  const blocks: LayoutBlock[] = [
    {
      kind: 'banner',
      brand: input.brand ?? 'ManuCMMS',
      title: input.documentTitle,
      subtitle: input.documentSubtitle,
    },
  ];

  if (input.headerMeta?.length) {
    blocks.push({ kind: 'meta', rows: input.headerMeta });
    blocks.push({ kind: 'spacer', height: 8 });
  }

  for (const section of input.sections) {
    blocks.push({ kind: 'section', title: section.title });
    if (section.keyValues?.length) {
      for (const row of section.keyValues) {
        blocks.push({
          kind: 'kv',
          label: row.label,
          value: wrapPdfText(row.value, 62).join(' '),
        });
      }
    }
    if (section.paragraphs?.length) {
      for (const paragraph of section.paragraphs) {
        blocks.push({ kind: 'paragraph', lines: wrapPdfText(paragraph) });
      }
    }
    if (section.bullets?.length) {
      for (const bullet of section.bullets) {
        blocks.push({ kind: 'bullet', lines: wrapPdfText(bullet) });
      }
    }
    blocks.push({ kind: 'spacer', height: 10 });
  }

  return blocks;
}

function blockHeight(block: LayoutBlock): number {
  switch (block.kind) {
    case 'banner':
      return 64;
    case 'meta':
      return block.rows.length * LINE_HEIGHT_KV + 6;
    case 'section':
      return 24;
    case 'kv':
      return LINE_HEIGHT_KV;
    case 'paragraph':
      return block.lines.length * LINE_HEIGHT_BODY + 4;
    case 'bullet':
      return block.lines.length * LINE_HEIGHT_BODY + 2;
    case 'rule':
      return 10;
    case 'spacer':
      return block.height;
    default:
      return LINE_HEIGHT_BODY;
  }
}

function paginateBlocks(blocks: LayoutBlock[]): LayoutBlock[][] {
  const pages: LayoutBlock[][] = [];
  let current: LayoutBlock[] = [];
  let used = 0;
  const firstPageBudget = CONTENT_TOP - MARGIN_BOTTOM;
  const nextPageBudget = CONTENT_TOP_CONTINUATION - MARGIN_BOTTOM;

  for (const block of blocks) {
    const height = blockHeight(block);
    const budget = pages.length === 0 ? firstPageBudget : nextPageBudget;
    if (current.length > 0 && used + height > budget) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(block);
    used += height;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [[]];
}

function textOp(
  text: string,
  x: number,
  y: number,
  font: 'F1' | 'F2',
  size: number,
  color: [number, number, number] = [0, 0, 0],
): string {
  const [r, g, b] = color;
  return `BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${y} Td (${escapePdfText(normalizePdfLine(text))}) Tj ET`;
}

function renderBanner(
  block: Extract<LayoutBlock, { kind: 'banner' }>,
): string[] {
  return [
    'q 0.12 0.23 0.37 rg 0 794 595 48 re f Q',
    textOp(block.brand, MARGIN_X, 822, 'F2', 11, [1, 1, 1]),
    textOp(block.title, MARGIN_X, 804, 'F2', 14, [1, 1, 1]),
    ...(block.subtitle
      ? [textOp(block.subtitle, MARGIN_X, 788, 'F1', 9, [0.86, 0.9, 0.95])]
      : []),
  ];
}

function renderSectionTitle(
  title: string,
  y: number,
): { ops: string[]; nextY: number } {
  return {
    ops: [
      textOp(title.toUpperCase(), MARGIN_X, y, 'F2', 10, [0.12, 0.23, 0.37]),
      'q 0.82 0.85 0.88 RG',
      `${MARGIN_X} ${y - 8} m ${PAGE_WIDTH - MARGIN_X} ${y - 8} l S`,
      'Q',
    ],
    nextY: y - 22,
  };
}

function renderPage(
  blocks: LayoutBlock[],
  pageIndex: number,
  totalPages: number,
  generatedAt: string,
  brand: string,
): string {
  const ops: string[] = [];
  let y = pageIndex === 0 ? CONTENT_TOP : CONTENT_TOP_CONTINUATION;

  for (const block of blocks) {
    switch (block.kind) {
      case 'banner':
        ops.push(...renderBanner(block));
        y -= 58;
        break;
      case 'meta':
        for (const row of block.rows) {
          ops.push(textOp(`${row.label}:`, MARGIN_X, y, 'F2', 9));
          ops.push(textOp(row.value, MARGIN_X + 118, y, 'F1', 9));
          y -= LINE_HEIGHT_KV;
        }
        break;
      case 'section': {
        const section = renderSectionTitle(block.title, y);
        ops.push(...section.ops);
        y = section.nextY;
        break;
      }
      case 'kv':
        ops.push(
          textOp(block.label, MARGIN_X + 8, y, 'F2', 9, [0.25, 0.27, 0.31]),
        );
        ops.push(textOp(block.value, MARGIN_X + 150, y, 'F1', 9));
        y -= LINE_HEIGHT_KV;
        break;
      case 'paragraph':
        for (const line of block.lines) {
          ops.push(textOp(line, MARGIN_X + 8, y, 'F1', 9));
          y -= LINE_HEIGHT_BODY;
        }
        y -= 4;
        break;
      case 'bullet':
        for (const [index, line] of block.lines.entries()) {
          const prefix = index === 0 ? '- ' : '  ';
          ops.push(textOp(`${prefix}${line}`, MARGIN_X + 8, y, 'F1', 9));
          y -= LINE_HEIGHT_BODY;
        }
        break;
      case 'rule':
        ops.push('q 0.88 0.9 0.92 rg');
        ops.push(
          `${MARGIN_X} ${y - 4} m ${PAGE_WIDTH - MARGIN_X} ${y - 4} l S`,
        );
        ops.push('Q');
        y -= 10;
        break;
      case 'spacer':
        y -= block.height;
        break;
      default:
        break;
    }
  }

  const footer = `${brand} · Gerado em ${generatedAt} · Pagina ${pageIndex + 1}/${totalPages}`;
  ops.push(textOp(footer, MARGIN_X, 28, 'F1', 8, [0.45, 0.48, 0.52]));

  return ops.join('\n');
}

export function buildProfessionalPdfDocument(
  input: ProfessionalPdfInput,
): Buffer {
  const blocks = flattenInput(input);
  const pageGroups = paginateBlocks(blocks);
  const brand = input.brand ?? 'ManuCMMS';
  const generatedAt = normalizePdfLine(
    input.generatedAt.replace('T', ' ').slice(0, 19),
  );

  const fontRegular =
    '3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj';
  const fontBold =
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj';

  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  const pageRefs: string[] = [];

  for (let index = 0; index < pageGroups.length; index += 1) {
    const pageNumber = 5 + index * 2;
    const contentNumber = pageNumber + 1;
    pageRefs.push(`${pageNumber} 0 R`);
    const stream = renderPage(
      pageGroups[index] ?? [],
      index,
      pageGroups.length,
      generatedAt,
      brand,
    );
    pageObjects.push(
      `${pageNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >> endobj`,
    );
    contentObjects.push(
      `${contentNumber} 0 obj << /Length ${Buffer.byteLength(stream, 'utf-8')} >> stream\n${stream}\nendstream endobj`,
    );
  }

  const pagesObject = `2 0 obj << /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >> endobj`;
  const catalogObject = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj';
  const objects = [
    catalogObject,
    pagesObject,
    fontRegular,
    fontBold,
    ...pageObjects,
    ...contentObjects,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}

/** @deprecated Use buildProfessionalPdfDocument */
export function buildSimplePdfDocument(input: {
  title: string;
  lines: string[];
}): Buffer {
  return buildProfessionalPdfDocument({
    documentTitle: input.title,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: 'Conteudo',
        bullets: input.lines,
      },
    ],
  });
}
