// Minimal .xlsx reader for master-data import. No library on purpose (the
// project avoids xlsx/exceljs): an .xlsx is a zip of XML files, and browsers
// can inflate zip entries natively via DecompressionStream. Reads the first
// worksheet's cell values (shared strings, inline strings, numbers, booleans)
// and ignores formatting, formulas' cached values aside.

const decoder = new TextDecoder("utf-8");

export function isXlsx(bytes: ArrayBuffer): boolean {
  const v = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  return v.length === 4 && v[0] === 0x50 && v[1] === 0x4b && v[2] === 0x03 && v[3] === 0x04;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readZipDirectory(bytes: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(bytes);
  // End-of-central-directory record: signature 0x06054b50, searched from the end (comment may follow it).
  let eocd = -1;
  for (let i = bytes.byteLength - 22; i >= Math.max(0, bytes.byteLength - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx file.");

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(bytes, p + 46, nameLen));
    entries.set(name, { method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntryText(bytes: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes);
  const nameLen = view.getUint16(entry.localOffset + 26, true);
  const extraLen = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const data = new Uint8Array(bytes, start, entry.compressedSize);
  if (entry.method === 0) return decoder.decode(data);
  if (entry.method !== 8) throw new Error("Unsupported compression in .xlsx file.");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return decoder.decode(await new Response(stream).arrayBuffer());
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** Local-name child lookup so we don't depend on the file's namespace prefixes. */
function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((c) => c.localName === name);
}

function textOf(el: Element): string {
  // <si> / <is> hold either a plain <t> or rich-text runs <r><t>; phonetic <rPh> text is excluded.
  let out = "";
  for (const c of Array.from(el.children)) {
    if (c.localName === "t") out += c.textContent ?? "";
    else if (c.localName === "r") out += children(c, "t").map((t) => t.textContent ?? "").join("");
  }
  return out;
}

function columnIndex(ref: string): number {
  const letters = /^[A-Za-z]+/.exec(ref)?.[0].toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Reads the first worksheet into rows of cell text. Completely empty rows are dropped. */
export async function parseXlsx(bytes: ArrayBuffer): Promise<string[][]> {
  const entries = readZipDirectory(bytes);
  const read = async (name: string) => {
    const e = entries.get(name);
    return e ? readEntryText(bytes, e) : null;
  };

  // Resolve the first sheet via workbook.xml + its relationships; fall back to sheet1.xml.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbook = await read("xl/workbook.xml");
  const rels = await read("xl/_rels/workbook.xml.rels");
  if (workbook && rels) {
    const firstSheet = parseXml(workbook).getElementsByTagNameNS("*", "sheet")[0];
    const rid = firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rel = Array.from(parseXml(rels).getElementsByTagNameNS("*", "Relationship")).find((r) => r.getAttribute("Id") === rid);
    const target = rel?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }
  const sheetXml = await read(sheetPath);
  if (!sheetXml) throw new Error("The workbook has no readable worksheet.");

  const sharedXml = await read("xl/sharedStrings.xml");
  const shared: string[] = sharedXml
    ? Array.from(parseXml(sharedXml).getElementsByTagNameNS("*", "si")).map((si) => textOf(si))
    : [];

  const rows: string[][] = [];
  for (const rowEl of Array.from(parseXml(sheetXml).getElementsByTagNameNS("*", "row"))) {
    const cells: string[] = [];
    let next = 0;
    for (const c of children(rowEl, "c")) {
      const ref = c.getAttribute("r");
      const idx = ref ? columnIndex(ref) : next;
      next = idx + 1;
      const type = c.getAttribute("t");
      let value = "";
      if (type === "inlineStr") {
        const is = children(c, "is")[0];
        value = is ? textOf(is) : "";
      } else {
        const v = children(c, "v")[0]?.textContent ?? "";
        if (type === "s") value = shared[Number(v)] ?? "";
        else if (type === "b") value = v === "1" ? "Y" : "N";
        else value = v;
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = value;
    }
    if (cells.some((c) => c.trim() !== "")) rows.push(cells);
  }
  return rows;
}
