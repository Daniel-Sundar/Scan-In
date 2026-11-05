import 'server-only';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { getDocumentProxy } from 'unpdf';

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 20000;

export type FileKind = 'csv' | 'xlsx' | 'pdf';
export interface StudentRow { roll_no: string; full_name: string; department: string | null; year: number | null }
export interface RowError { row: number; message: string }
export interface ParseResult { kind: FileKind; total: number; rows: StudentRow[]; errors: RowError[] }

/** Identify the file by CONTENT (magic bytes), not just the client-supplied name/MIME. */
export function sniff(buf: Uint8Array, name: string): FileKind | null {
  const ext = name.toLowerCase().split('.').pop();
  const head = String.fromCharCode(...buf.slice(0, 5));
  if (ext === 'pdf' && head.startsWith('%PDF-')) return 'pdf';
  if (ext === 'xlsx' && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return 'xlsx';
  if (ext === 'csv' && !buf.slice(0, 2048).includes(0)) return 'csv';
  return null;
}

/* ---------------- raw tables from each format ---------------- */
function csvRows(buf: Uint8Array): string[][] {
  const text = new TextDecoder('utf-8').decode(buf).replace(/^﻿/, '');
  return Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' }).data.map((r) => r.map((c) => String(c ?? '')));
}

function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return cellText(o.result);                       // formula -> cached value only
    if (Array.isArray(o.richText)) return o.richText.map((t: { text: string }) => t.text).join('');
    if ('text' in o) return cellText(o.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return '';
  }
  return String(v);
}

async function xlsxRows(buf: Uint8Array): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = (row.values as unknown[]).slice(1); // exceljs is 1-indexed
    out.push(vals.map(cellText));
  });
  return out;
}

/** PDF: text-based tables only (scanned images need OCR, which we deliberately don't do).
 *  Uses glyph POSITIONS to rebuild rows/cells, because plain text extraction collapses column gaps. */
async function pdfRows(buf: Uint8Array): Promise<string[][]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const out: string[][] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 200); p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    type It = { s: string; x: number; y: number; w: number; h: number };
    type Raw = { str: string; transform: number[]; width: number; height: number };
    const items: It[] = (content.items as unknown as Raw[])
      .filter((i) => typeof i.str === 'string' && i.str.trim())
      .map((i) => ({ s: i.str as string, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height || Math.abs(i.transform[0]) || 10 }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: It[][] = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= 3) last.push(it); else lines.push([it]);
    }
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
      const cells: string[] = [];
      let prevEnd = -Infinity;
      for (const it of line) {
        if (cells.length && it.x - prevEnd <= Math.max(it.h * 0.7, 4)) cells[cells.length - 1] += ' ' + it.s.trim();
        else cells.push(it.s.trim());
        prevEnd = it.x + it.w;
      }
      out.push(cells);
    }
  }
  return out;
}

/* ---------------- header mapping + validation ---------------- */
const ALIASES: Record<keyof StudentRow, string[]> = {
  roll_no: ['rollno', 'roll', 'rollnumber', 'regno', 'registerno', 'registrationnumber', 'studentid', 'id', 'enrollmentno', 'barcode'],
  full_name: ['name', 'fullname', 'studentname'],
  department: ['department', 'dept', 'branch', 'course', 'programme', 'program'],
  year: ['year', 'yearofstudy', 'studyyear'],
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function mapColumns(header: string[]): Partial<Record<keyof StudentRow, number>> | null {
  const map: Partial<Record<keyof StudentRow, number>> = {};
  header.forEach((h, i) => {
    (Object.keys(ALIASES) as (keyof StudentRow)[]).forEach((k) => {
      if (map[k] === undefined && ALIASES[k].includes(norm(h))) map[k] = i;
    });
  });
  return map.roll_no !== undefined && map.full_name !== undefined ? map : null;
}

/** Remove control chars and spreadsheet-formula prefixes (CSV/Excel injection on re-export). */
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[=+\-@]+/, '').trim();
const ROLL = /^[A-Za-z0-9][A-Za-z0-9._-]{2,39}$/;

export function validateRows(table: string[][], requireHeader = false): Omit<ParseResult, 'kind'> {
  const errors: RowError[] = [];
  const rows: StudentRow[] = [];
  if (!table.length) return { total: 0, rows, errors: [{ row: 0, message: 'File is empty' }] };

  let map = mapColumns(table[0]);
  let start = 1;
  if (!map && requireHeader) {
    // PDFs often have titles above the table: look for the header in the first rows.
    const h = table.slice(0, 8).findIndex((r) => mapColumns(r));
    if (h < 0) return { total: 0, rows, errors: [{ row: 0, message: 'No header row found. The PDF needs columns named like "Roll No" and "Name".' }] };
    table = table.slice(h);
    map = mapColumns(table[0]);
  }
  if (!map) { map = { roll_no: 0, full_name: 1, department: 2, year: 3 }; start = 0; } // headerless fallback
  const body = table.slice(start);
  if (body.length > MAX_ROWS) return { total: body.length, rows, errors: [{ row: 0, message: `Too many rows (max ${MAX_ROWS})` }] };

  const seen = new Set<string>();
  body.forEach((r, idx) => {
    const rowNo = idx + start + 1; // 1-based as seen in the source file
    const get = (k: keyof StudentRow) => (map![k] === undefined ? '' : (r[map![k]!] ?? '').toString());
    const roll = get('roll_no').trim();
    const name = clean(get('full_name'));
    const dept = clean(get('department')).slice(0, 80);
    const yearRaw = get('year').trim();

    if (!ROLL.test(roll)) return errors.push({ row: rowNo, message: `Invalid roll number "${roll.slice(0, 20)}" (3-40 letters/digits/._-)` });
    if (!name || name.length > 120) return errors.push({ row: rowNo, message: 'Name missing or longer than 120 characters' });
    let year: number | null = null;
    if (yearRaw) {
      year = Number.parseInt(yearRaw, 10);
      if (!Number.isInteger(year) || year < 1 || year > 8) return errors.push({ row: rowNo, message: `Year "${yearRaw.slice(0, 10)}" must be 1-8` });
    }
    if (seen.has(roll)) return errors.push({ row: rowNo, message: `Duplicate roll number ${roll} in file` });
    seen.add(roll);
    rows.push({ roll_no: roll, full_name: name, department: dept || null, year });
  });
  return { total: body.length, rows, errors };
}

export async function parseStudentFile(buf: Uint8Array, name: string): Promise<ParseResult | { error: string }> {
  if (buf.byteLength === 0) return { error: 'File is empty' };
  if (buf.byteLength > MAX_BYTES) return { error: 'File exceeds 5 MB' };
  const kind = sniff(buf, name);
  if (!kind) return { error: 'Unsupported or mismatched file. Use .csv, .xlsx or text-based .pdf' };
  try {
    const table = kind === 'csv' ? csvRows(buf) : kind === 'xlsx' ? await xlsxRows(buf) : await pdfRows(buf);
    return { kind, ...validateRows(table, kind === 'pdf') };
  } catch {
    return { error: 'Could not read the file. It may be corrupted or password-protected.' };
  }
}
