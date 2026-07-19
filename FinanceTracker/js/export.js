export function exportData(format, transactions, settings) {
  const name = `finance-tracker-${new Date().toISOString().slice(0, 10)}`;
  if (format === "json") download(`${name}.json`, JSON.stringify({ transactions, settings }, null, 2), "application/json");
  if (format === "csv") download(`${name}.csv`, toCsv(transactions), "text/csv");
  if (format === "excel") {
    if (!window.XLSX) return alert("Excel exporter is unavailable offline until the library has been cached once.");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions), "Transactions");
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
  if (format === "pdf") {
    if (!window.jspdf) return print();
    const doc = new jspdf.jsPDF();
    doc.text("FinanceTracker Monthly Report", 14, 18);
    transactions.slice(0, 35).forEach((tx, i) => doc.text(`${tx.date}  ${tx.type}  ${tx.category}  INR ${tx.amount}`, 14, 30 + i * 7));
    doc.save(`${name}.pdf`);
  }
}

export function toCsv(rows) {
  const headers = ["date", "type", "category", "amount", "tags", "note", "attachmentName"];
  return [headers.join(","), ...rows.map(row => headers.map(key => quote(Array.isArray(row[key]) ? row[key].join("|") : row[key] ?? "")).join(","))].join("\n");
}

function quote(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function download(filename, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
