export async function readImport(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "json") {
    const parsed = JSON.parse(await file.text());
    return Array.isArray(parsed) ? parsed : parsed.transactions || [];
  }
  if (ext === "csv") return parseCsv(await file.text());
  if (["xlsx", "xls"].includes(ext)) {
    if (!window.XLSX) throw new Error("Excel import library is not available.");
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  }
  throw new Error("Unsupported import file.");
}

export function normalizeRows(rows) {
  return rows.map(row => {
    const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      date: normalizeDate(lower.date),
      type: String(lower.type || "expense").toLowerCase().includes("income") ? "income" : "expense",
      category: String(lower.category || "Other").trim(),
      amount: Math.abs(Number(lower.amount || 0)),
      tags: String(lower.tags || "").split(/[|,]/).map(t => t.trim()).filter(Boolean),
      note: String(lower.note || ""),
      attachmentName: String(lower.attachmentname || "")
    };
  }).filter(tx => tx.date && tx.amount > 0);
}

function normalizeDate(value) {
  if (typeof value === "number" && window.XLSX) {
    const d = XLSX.SSF.parse_date_code(value);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || "").slice(0, 10) : date.toISOString().slice(0, 10);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = split(lines.shift()).map(h => h.toLowerCase().trim());
  return lines.map(line => Object.fromEntries(split(line).map((value, index) => [headers[index], value])));
}

function split(line) {
  return line.match(/("([^"]|"")*"|[^,]+)/g)?.map(cell => cell.replace(/^"|"$/g, "").replaceAll('""', '"')) || [];
}
