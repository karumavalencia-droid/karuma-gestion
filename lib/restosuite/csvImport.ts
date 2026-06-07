import { fmtNum, genId, loadRestosuite, saveRestosuite } from "@/lib/objetivo/helpers";
import { RegistroRestosuite } from "@/lib/types";

export type ImportErrorCode = "formato_invalido" | "faltan_columnas" | "sin_datos";

export const IMPORT_ERROR_MESSAGES: Record<ImportErrorCode, string> = {
  formato_invalido: "Formato no válido",
  faltan_columnas: "Faltan columnas",
  sin_datos: "Sin datos",
};

type FieldKey =
  | "fecha"
  | "ventas"
  | "clientes"
  | "ticketMedio"
  | "facturas"
  | "bebidas"
  | "observaciones";

const COLUMN_ALIASES: Record<FieldKey, string[]> = {
  fecha: ["fecha", "date", "dia", "day", "business date"],
  ventas: [
    "ventas",
    "net sales",
    "netsales",
    "sales",
    "total sales",
    "importe",
    "revenue",
    "total",
  ],
  clientes: ["clientes", "guests", "covers", "comensales", "pax", "customers"],
  ticketMedio: [
    "ticket medio",
    "ticket_medio",
    "average spend",
    "avg spend",
    "average spend per guest",
    "avg ticket",
    "atv",
    "spend per head",
  ],
  facturas: ["facturas", "bill count", "bills", "tickets", "checks", "num bills"],
  bebidas: [
    "bebidas",
    "drinks",
    "beverage",
    "beverages",
    "ventas bebida",
    "bar sales",
    "drink sales",
  ],
  observaciones: ["observaciones", "notes", "comments", "notas", "remark", "remarks"],
};

export interface ImportPreview {
  fileName: string;
  rowCount: number;
  totalVentas: number;
  totalClientes: number;
  ticketMedioPromedio: number;
  registros: RegistroRestosuite[];
}

export interface ParseCsvResult {
  ok: boolean;
  error?: ImportErrorCode;
  missingColumns?: string[];
  preview?: ImportPreview;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchField(header: string): FieldKey | null {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => norm === a || norm.includes(a))) {
      return field;
    }
  }
  return null;
}

function detectDelimiter(line: string): string {
  const commas = (line.match(/,/g) ?? []).length;
  const semis = (line.match(/;/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (tabs >= commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsvRows(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function parseNumber(raw: string): number {
  let s = raw.replace(/[€$£\s]/g, "").trim();
  if (!s) return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  return parseFloat(s) || 0;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function rowToRegistro(
  fieldMap: (FieldKey | null)[],
  cells: string[],
): RegistroRestosuite | null {
  const values: Partial<Record<FieldKey, string>> = {};
  fieldMap.forEach((field, i) => {
    if (field && cells[i] !== undefined) values[field] = cells[i];
  });

  const fecha = values.fecha ? parseDate(values.fecha) : null;
  if (!fecha) return null;

  const ventas = fmtNum(parseNumber(values.ventas ?? "0"));
  if (ventas <= 0) return null;

  const clientes = Math.max(0, Math.round(parseNumber(values.clientes ?? "0")));
  const ticketParsed = parseNumber(values.ticketMedio ?? "0");
  const ticketMedio =
    ticketParsed > 0
      ? fmtNum(ticketParsed)
      : clientes > 0
        ? fmtNum(ventas / clientes)
        : 0;

  return {
    id: genId(),
    fecha,
    ventas,
    clientes,
    ticketMedio,
    facturas: Math.max(0, Math.round(parseNumber(values.facturas ?? "0"))),
    ventasBebida: fmtNum(parseNumber(values.bebidas ?? "0")),
    observaciones: (values.observaciones ?? "").trim() || "Import Restosuite CSV",
  };
}

export function parseRestosuiteCsv(text: string, fileName: string): ParseCsvResult {
  if (!text.trim()) {
    return { ok: false, error: "formato_invalido" };
  }

  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { ok: false, error: "sin_datos" };
  }

  const headerCells = rows[0];
  const fieldMap: (FieldKey | null)[] = headerCells.map((h) => matchField(h));
  const mappedFields = new Set(fieldMap.filter(Boolean));

  const missing: string[] = [];
  if (!mappedFields.has("fecha")) missing.push("Fecha");
  if (!mappedFields.has("ventas")) missing.push("Ventas / Net Sales");

  if (missing.length > 0) {
    return { ok: false, error: "faltan_columnas", missingColumns: missing };
  }

  const registros: RegistroRestosuite[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.every((c) => !c.trim())) continue;
    const reg = rowToRegistro(fieldMap, cells);
    if (reg) registros.push(reg);
  }

  if (registros.length === 0) {
    return { ok: false, error: "sin_datos" };
  }

  const totalVentas = fmtNum(registros.reduce((s, r) => s + r.ventas, 0));
  const totalClientes = registros.reduce((s, r) => s + r.clientes, 0);
  const ticketMedioPromedio =
    totalClientes > 0 ? fmtNum(totalVentas / totalClientes) : 0;

  return {
    ok: true,
    preview: {
      fileName,
      rowCount: registros.length,
      totalVentas,
      totalClientes,
      ticketMedioPromedio,
      registros,
    },
  };
}

export function mergeImportToStore(
  registros: RegistroRestosuite[],
): { imported: number; updated: number; total: number } {
  const store = loadRestosuite();
  const byFecha = new Map(store.registros.map((r) => [r.fecha, r]));

  let imported = 0;
  let updated = 0;

  for (const row of registros) {
    const existing = byFecha.get(row.fecha);
    if (existing) {
      byFecha.set(row.fecha, {
        ...existing,
        ventas: row.ventas,
        clientes: row.clientes,
        ticketMedio: row.ticketMedio,
        facturas: row.facturas,
        ventasBebida: row.ventasBebida,
        observaciones: row.observaciones,
      });
      updated++;
    } else {
      byFecha.set(row.fecha, row);
      imported++;
    }
  }

  store.registros = [...byFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  saveRestosuite(store);

  return { imported, updated, total: store.registros.length };
}
