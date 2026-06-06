// Shared, framework-free helpers for the email marketing UI: the block model
// used by the campaign builder + template gallery, a client-side HTML compiler
// for live previews, merge-tag definitions and a robust CSV parser.

import { BRAND } from '@/theme/theme';

// --------------------------------------------------------------------------- //
// Shared style tokens (mirrors the existing dashboard conventions).
// --------------------------------------------------------------------------- //
export const INK = BRAND.ink;
export const SUBTLE = '#6B7280';
export const LINE = 'rgba(14,17,22,0.07)';
export const CARD_RADIUS = '22px';
export const CARD_SHADOW =
  '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

export const inkButton = {
  background: INK,
  backgroundImage: 'none',
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  color: '#fff',
  '&:hover': { background: '#000' },
};

// --------------------------------------------------------------------------- //
// Block model
// --------------------------------------------------------------------------- //
export type Align = 'left' | 'center' | 'right';

export type LeafBlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer';
export type BlockType = LeafBlockType | 'columns';

export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
  align: Align;
}
export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  align: Align;
}
export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
  alt: string;
  width: string;
  link: string;
}
export interface ButtonBlock {
  id: string;
  type: 'button';
  text: string;
  url: string;
  color: string;
  textColor: string;
  align: Align;
}
export interface DividerBlock {
  id: string;
  type: 'divider';
}
export interface SpacerBlock {
  id: string;
  type: 'spacer';
  height: number;
}
export type LeafBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock;

export interface ColumnsBlock {
  id: string;
  type: 'columns';
  columns: [{ blocks: LeafBlock[] }, { blocks: LeafBlock[] }];
}

export type Block = LeafBlock | ColumnsBlock;

let _seq = 0;
export function blockId(): string {
  _seq += 1;
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `blk_${Date.now().toString(36)}_${_seq}_${rand}`;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  button: 'Button',
  divider: 'Divider',
  spacer: 'Spacer',
  columns: 'Columns',
};

export function makeBlock(type: BlockType): Block {
  switch (type) {
    case 'heading':
      return { id: blockId(), type, level: 2, text: 'Your headline', align: 'left' };
    case 'text':
      return {
        id: blockId(),
        type,
        content: 'Write your message here. Personalise it with merge tags.',
        align: 'left',
      };
    case 'image':
      return { id: blockId(), type, src: '', alt: '', width: '', link: '' };
    case 'button':
      return {
        id: blockId(),
        type,
        text: 'Click here',
        url: 'https://',
        color: BRAND.amberDeep,
        textColor: '#ffffff',
        align: 'center',
      };
    case 'divider':
      return { id: blockId(), type };
    case 'spacer':
      return { id: blockId(), type, height: 24 };
    case 'columns':
      return {
        id: blockId(),
        type,
        columns: [{ blocks: [] }, { blocks: [] }],
      };
  }
}

// --------------------------------------------------------------------------- //
// Serialisation <-> API. The API persists blocks without UI `id`s, matching the
// server compiler's field names. We add ids on load and strip them on save.
// --------------------------------------------------------------------------- //
type RawBlock = Record<string, unknown>;

function asAlign(v: unknown, fallback: Align): Align {
  return v === 'left' || v === 'center' || v === 'right' ? v : fallback;
}
function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

export function blockFromRaw(raw: RawBlock): Block | null {
  const type = asString(raw.type).toLowerCase();
  switch (type) {
    case 'heading': {
      const lvl = Number(raw.level);
      const level: 1 | 2 | 3 = lvl === 1 ? 1 : lvl === 3 ? 3 : 2;
      return {
        id: blockId(),
        type: 'heading',
        level,
        text: asString(raw.text),
        align: asAlign(raw.align, 'left'),
      };
    }
    case 'text':
      return {
        id: blockId(),
        type: 'text',
        content: asString(raw.content),
        align: asAlign(raw.align, 'left'),
      };
    case 'image':
      return {
        id: blockId(),
        type: 'image',
        src: asString(raw.src),
        alt: asString(raw.alt),
        width: asString(raw.width),
        link: asString(raw.link),
      };
    case 'button':
      return {
        id: blockId(),
        type: 'button',
        text: asString(raw.text, 'Click here'),
        url: asString(raw.url, '#'),
        color: asString(raw.color, BRAND.amberDeep),
        textColor: asString(raw.textColor, '#ffffff'),
        align: asAlign(raw.align, 'center'),
      };
    case 'divider':
      return { id: blockId(), type: 'divider' };
    case 'spacer': {
      const h = Number(raw.height);
      return {
        id: blockId(),
        type: 'spacer',
        height: Number.isFinite(h) ? h : 24,
      };
    }
    case 'columns': {
      const cols = Array.isArray(raw.columns) ? raw.columns : [];
      const norm = (i: number): { blocks: LeafBlock[] } => {
        const col = cols[i] as RawBlock | undefined;
        const inner = col && Array.isArray(col.blocks) ? (col.blocks as RawBlock[]) : [];
        const leaves: LeafBlock[] = [];
        for (const b of inner) {
          const parsed = blockFromRaw(b);
          if (parsed && parsed.type !== 'columns') leaves.push(parsed);
        }
        return { blocks: leaves };
      };
      return { id: blockId(), type: 'columns', columns: [norm(0), norm(1)] };
    }
    default:
      return null;
  }
}

export function blocksFromRaw(raw: unknown): Block[] {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    list = (raw as RawBlock).blocks;
  }
  if (!Array.isArray(list)) return [];
  const out: Block[] = [];
  for (const r of list) {
    if (r && typeof r === 'object') {
      const parsed = blockFromRaw(r as RawBlock);
      if (parsed) out.push(parsed);
    }
  }
  return out;
}

function stripLeaf(b: LeafBlock): RawBlock {
  switch (b.type) {
    case 'heading':
      return { type: 'heading', level: b.level, text: b.text, align: b.align };
    case 'text':
      return { type: 'text', content: b.content, align: b.align };
    case 'image':
      return { type: 'image', src: b.src, alt: b.alt, width: b.width, link: b.link };
    case 'button':
      return {
        type: 'button',
        text: b.text,
        url: b.url,
        color: b.color,
        textColor: b.textColor,
        align: b.align,
      };
    case 'divider':
      return { type: 'divider' };
    case 'spacer':
      return { type: 'spacer', height: b.height };
  }
}

export function blockToRaw(b: Block): RawBlock {
  if (b.type === 'columns') {
    return {
      type: 'columns',
      columns: b.columns.map((c) => ({ blocks: c.blocks.map(stripLeaf) })),
    };
  }
  return stripLeaf(b);
}

export function blocksToRaw(blocks: Block[]): RawBlock[] {
  return blocks.map(blockToRaw);
}

// --------------------------------------------------------------------------- //
// Client-side HTML compiler — a lightweight, visual approximation of the server
// compiler, used purely for the in-app live preview.
// --------------------------------------------------------------------------- //
function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLeaf(b: LeafBlock): string {
  switch (b.type) {
    case 'heading': {
      const size = b.level === 1 ? 30 : b.level === 3 ? 19 : 24;
      return `<h${b.level} style="margin:0 0 16px;font-size:${size}px;line-height:1.3;font-weight:700;color:${INK};text-align:${b.align};">${esc(
        b.text,
      )}</h${b.level}>`;
    }
    case 'text': {
      const html = esc(b.content).replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;text-align:${b.align};">${html}</p>`;
    }
    case 'image': {
      if (!b.src) {
        return `<div style="margin:0 0 16px;padding:32px;text-align:center;background:#f1f5f9;border-radius:8px;color:#94a3b8;font-size:13px;">Image — add a URL</div>`;
      }
      const w = b.width ? `width:${esc(b.width)};` : '';
      let img = `<img src="${esc(b.src)}" alt="${esc(
        b.alt,
      )}" style="display:block;border:0;max-width:100%;height:auto;margin:0 auto;${w}" />`;
      if (b.link) img = `<a href="${esc(b.link)}" target="_blank">${img}</a>`;
      return `<div style="margin:0 0 16px;">${img}</div>`;
    }
    case 'button':
      return `<div style="margin:0 0 16px;text-align:${b.align};"><a href="${esc(
        b.url,
      )}" target="_blank" style="display:inline-block;font-size:15px;font-weight:700;color:${esc(
        b.textColor,
      )};background:${esc(
        b.color,
      )};text-decoration:none;padding:13px 28px;border-radius:6px;">${esc(b.text)}</a></div>`;
    case 'divider':
      return `<div style="margin:0 0 16px;"><hr style="border:0;border-top:1px solid #e2e8f0;margin:0;" /></div>`;
    case 'spacer':
      return `<div style="height:${Math.max(b.height, 0)}px;line-height:${Math.max(
        b.height,
        0,
      )}px;font-size:1px;">&nbsp;</div>`;
  }
}

function renderBlock(b: Block): string {
  if (b.type === 'columns') {
    const cells = b.columns
      .map(
        (c) =>
          `<td valign="top" style="vertical-align:top;padding:0 8px;width:50%;">${c.blocks
            .map(renderLeaf)
            .join('')}</td>`,
      )
      .join('');
    return `<table role="presentation" width="100%" style="margin:0 0 16px;border-collapse:collapse;"><tr>${cells}</tr></table>`;
  }
  return renderLeaf(b);
}

export function compileBlocksToHtml(blocks: Block[]): string {
  const body = blocks.map(renderBlock).join('');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};padding:24px;max-width:600px;margin:0 auto;">${body}</div>`;
}

export function rawBlocksToHtml(raw: unknown): string {
  return compileBlocksToHtml(blocksFromRaw(raw));
}

// --------------------------------------------------------------------------- //
// Merge tags
// --------------------------------------------------------------------------- //
export interface MergeTag {
  label: string;
  value: string;
  custom?: boolean;
}

export const MERGE_TAGS: MergeTag[] = [
  { label: 'First name', value: '{{first_name}}' },
  { label: 'Full name', value: '{{name}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'First name w/ fallback', value: '{{first_name|friend}}' },
  { label: 'Custom attribute…', value: '{{attributes.}}', custom: true },
];

/** Insert `tag` into `value` at the caret position (or append when unknown). */
export function insertAtCaret(
  value: string,
  tag: string,
  caret: number | null,
): string {
  if (caret == null || caret < 0 || caret > value.length) {
    return value ? `${value}${tag}` : tag;
  }
  return value.slice(0, caret) + tag + value.slice(caret);
}

// --------------------------------------------------------------------------- //
// Robust CSV parser (RFC-4180-ish): handles quoted fields with commas, escaped
// quotes ("") and newlines inside quotes. Never uses a naive split(',').
// --------------------------------------------------------------------------- //
export function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Flush the trailing field/row (unless the input ended on a clean newline).
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ParsedSubscriber {
  email: string;
  name?: string | null;
  tags?: string[];
  attributes?: Record<string, string>;
}

/**
 * Map parsed CSV rows into import-ready subscriber records. The first row is
 * treated as a header. `email` is required; `name` and `tags` are recognised by
 * column name; everything else becomes an attribute.
 */
export function csvToSubscribers(input: string): {
  rows: ParsedSubscriber[];
  skipped: number;
  headers: string[];
} {
  const grid = parseCSV(input);
  if (grid.length === 0) return { rows: [], skipped: 0, headers: [] };

  const headers = grid[0].map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());
  const emailIdx = lower.findIndex((h) => h === 'email' || h === 'e-mail');
  const nameIdx = lower.findIndex((h) => h === 'name' || h === 'full name' || h === 'full_name');
  const firstIdx = lower.findIndex((h) => h === 'first name' || h === 'first_name' || h === 'firstname');
  const lastIdx = lower.findIndex((h) => h === 'last name' || h === 'last_name' || h === 'lastname');
  const tagsIdx = lower.findIndex((h) => h === 'tags' || h === 'tag');

  const rows: ParsedSubscriber[] = [];
  let skipped = 0;

  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const at = (idx: number): string => (idx >= 0 && idx < cells.length ? (cells[idx] ?? '').trim() : '');
    const email = emailIdx >= 0 ? at(emailIdx) : '';
    if (!email || !email.includes('@')) {
      skipped += 1;
      continue;
    }
    let name = nameIdx >= 0 ? at(nameIdx) : '';
    if (!name) {
      const composed = [at(firstIdx), at(lastIdx)].filter(Boolean).join(' ').trim();
      if (composed) name = composed;
    }
    const tagsRaw = tagsIdx >= 0 ? at(tagsIdx) : '';
    const tags = tagsRaw
      ? tagsRaw
          .split(/[;|]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const reserved = new Set(
      [emailIdx, nameIdx, firstIdx, lastIdx, tagsIdx].filter((x) => x >= 0),
    );
    const attributes: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      if (reserved.has(c)) continue;
      const key = headers[c];
      const val = at(c);
      if (key && val) attributes[key] = val;
    }

    rows.push({
      email,
      name: name || null,
      tags: tags.length ? tags : undefined,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    });
  }

  return { rows, skipped, headers };
}
