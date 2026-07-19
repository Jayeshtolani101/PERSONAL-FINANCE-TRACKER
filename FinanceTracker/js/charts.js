import { money } from "./analytics.js";

const charts = {};
const palette = ["#22c55e", "#60a5fa", "#f97316", "#ef4444", "#14b8a6", "#a855f7", "#eab308", "#ec4899"];

function upsert(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  charts[id]?.destroy();
  charts[id] = new Chart(canvas, config);
}

const options = stacked => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue("--muted") } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label || ctx.label}: ${money(ctx.parsed.y ?? ctx.parsed)}` } } },
  scales: { x: { stacked, ticks: { color: "#90a0b7" }, grid: { color: "rgba(255,255,255,.08)" } }, y: { stacked, ticks: { color: "#90a0b7" }, grid: { color: "rgba(255,255,255,.08)" } } }
});

export function renderCharts(analysis) {
  const months = analysis.months.length ? analysis.months : [{ month: "No data", income: 0, expense: 0, balance: 0 }];
  const labels = Object.keys(analysis.categoryExpense);
  const values = Object.values(analysis.categoryExpense);
  upsert("lineChart", { type: "line", data: { labels: months.map(m => m.month), datasets: [{ label: "Cashflow", data: months.map(m => m.balance), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.14)", tension: .35 }] }, options: options(false) });
  upsert("areaChart", { type: "line", data: { labels: months.map(m => m.month), datasets: [{ label: "Expense trend", data: months.map(m => m.expense), fill: true, borderColor: "#f97316", backgroundColor: "rgba(249,115,22,.22)", tension: .35 }] }, options: options(false) });
  upsert("barChart", { type: "bar", data: { labels: months.map(m => m.month), datasets: [{ label: "Income", data: months.map(m => m.income), backgroundColor: "#22c55e" }, { label: "Expense", data: months.map(m => m.expense), backgroundColor: "#ef4444" }] }, options: options(false) });
  upsert("pieChart", { type: "pie", data: { labels: labels.length ? labels : ["No expenses"], datasets: [{ data: values.length ? values : [1], backgroundColor: palette }] }, options: options(false) });
  upsert("doughnutChart", { type: "doughnut", data: { labels: labels.length ? labels : ["No expenses"], datasets: [{ data: values.length ? values : [1], backgroundColor: palette }] }, options: options(false) });
}
