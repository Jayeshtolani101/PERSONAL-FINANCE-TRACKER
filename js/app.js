import { loadState, saveState } from "./storage.js";
import { analyze, money } from "./analytics.js";
import { renderCharts } from "./charts.js";
import { initTheme } from "./theme.js";
import { exportData } from "./export.js";
import { readImport, normalizeRows } from "./import.js";
import { toast, renderDashboard, renderTransactions, renderBills, renderReport, fillForm, formData } from "./ui.js";

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`);
const defaultState = {
  transactions: seedTransactions(),
  settings: { budget: 85000, savingsGoal: 250000 },
  bills: [{ id: makeId(), name: "Rent", amount: 25000, day: 5 }],
  deleted: null
};
let state = JSON.parse(JSON.stringify(defaultState));
let deferredInstall;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();

async function init() {
  try {
    initTheme();
    state = normalizeState((await loadState()) || state);
    bind();
    render();
    registerPwa();
    toast("Session recovered and saved locally");
  } catch (error) {
    console.error(error);
    toast(`Startup error: ${error.message}`);
  }
}

function bind() {
  document.getElementById("date").value = new Date().toISOString().slice(0, 10);
  document.getElementById("budget").value = state.settings.budget || "";
  document.getElementById("savingsGoal").value = state.settings.savingsGoal || "";
  ["search", "filterType", "sortBy"].forEach(id => document.getElementById(id).addEventListener("input", render));
  ["budget", "savingsGoal", "emiPrincipal", "emiRate", "emiMonths"].forEach(id => document.getElementById(id).addEventListener("input", updateSetting));
  document.getElementById("txForm").addEventListener("submit", saveTransaction);
  document.getElementById("quickAddBtn").addEventListener("click", () => document.getElementById("amount").focus());
  document.getElementById("undoBtn").addEventListener("click", undoDelete);
  document.getElementById("billForm").addEventListener("submit", saveBill);
  document.getElementById("notifyBtn").addEventListener("click", requestNotification);
  document.querySelectorAll("[data-export]").forEach(btn => btn.addEventListener("click", () => exportData(btn.dataset.export, state.transactions, state.settings)));
  document.getElementById("importFile").addEventListener("change", event => importFile(event.target.files[0]));
  document.addEventListener("keydown", shortcuts);
  document.addEventListener("dragover", event => event.preventDefault());
  document.addEventListener("drop", event => {
    event.preventDefault();
    if (event.dataTransfer.files[0]) importFile(event.dataTransfer.files[0]);
  });
  window.addEventListener("online", networkState);
  window.addEventListener("offline", networkState);
  networkState();
}

async function saveTransaction(event) {
  event.preventDefault();
  const tx = formData();
  const file = document.getElementById("attachment").files[0];
  if (file) {
    tx.attachmentName = file.name;
    tx.attachment = await fileToDataUrl(file);
  }
  if (!tx.date || !tx.category || tx.amount <= 0) return toast("Enter date, category and amount");
  const index = state.transactions.findIndex(item => item.id === tx.id);
  if (index >= 0) state.transactions[index] = { ...state.transactions[index], ...tx };
  else state.transactions.push(tx);
  fillForm({});
  document.getElementById("date").value = new Date().toISOString().slice(0, 10);
  await persist("Transaction saved");
}

function editTransaction(id) {
  const tx = state.transactions.find(item => item.id === id);
  if (tx) fillForm(tx);
  document.getElementById("transactions").scrollIntoView({ behavior: "smooth" });
}

async function deleteTransaction(id) {
  const tx = state.transactions.find(item => item.id === id);
  state.transactions = state.transactions.filter(item => item.id !== id);
  state.deleted = tx;
  document.getElementById("undoBtn").disabled = false;
  await persist("Transaction deleted");
}

async function undoDelete() {
  if (!state.deleted) return;
  state.transactions.push(state.deleted);
  state.deleted = null;
  document.getElementById("undoBtn").disabled = true;
  await persist("Delete undone");
}

async function saveBill(event) {
  event.preventDefault();
  const name = document.getElementById("billName").value.trim();
  const amount = Number(document.getElementById("billAmount").value);
  const day = Number(document.getElementById("billDay").value);
  if (!name || !amount || !day) return;
  state.bills.push({ id: makeId(), name, amount, day });
  event.target.reset();
  await persist("Bill reminder added");
}

async function removeBill(id) {
  state.bills = state.bills.filter(bill => bill.id !== id);
  await persist("Bill reminder cleared");
}

function updateSetting() {
  state.settings.budget = Number(document.getElementById("budget").value || 0);
  state.settings.savingsGoal = Number(document.getElementById("savingsGoal").value || 0);
  calculateEmi();
  persist();
}

function calculateEmi() {
  const p = Number(document.getElementById("emiPrincipal").value || 0);
  const r = Number(document.getElementById("emiRate").value || 0) / 1200;
  const n = Number(document.getElementById("emiMonths").value || 0);
  const emi = p && n ? (r ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n) : 0;
  document.getElementById("emiResult").textContent = `EMI ${money(emi)}`;
}

async function importFile(file) {
  if (!file) return;
  try {
    const rows = normalizeRows(await readImport(file));
    state.transactions.push(...rows);
    await persist(`Imported ${rows.length} transactions`);
  } catch (error) {
    toast(error.message);
  }
}

function filteredTransactions() {
  const q = document.getElementById("search").value.toLowerCase();
  const type = document.getElementById("filterType").value;
  const sort = document.getElementById("sortBy").value;
  return state.transactions.filter(tx => {
    const text = [tx.date, tx.type, tx.category, tx.note, ...(tx.tags || [])].join(" ").toLowerCase();
    return (type === "all" || tx.type === type) && text.includes(q);
  }).sort((a, b) => {
    if (sort === "date-asc") return a.date.localeCompare(b.date);
    if (sort === "amount-desc") return b.amount - a.amount;
    if (sort === "amount-asc") return a.amount - b.amount;
    return b.date.localeCompare(a.date);
  });
}

function render() {
  const analysis = analyze(state.transactions, state.settings);
  renderDashboard(analysis, state.settings);
  renderTransactions(filteredTransactions(), { edit: editTransaction, delete: deleteTransaction, attachment: downloadAttachment });
  renderBills(state.bills, removeBill);
  renderReport(analysis);
  renderCharts(analysis);
  renderCategories();
}

async function persist(message) {
  document.getElementById("saveState").textContent = "Saving...";
  try {
    await saveState(state);
  } catch (error) {
    localStorage.setItem("FinanceTracker.session", JSON.stringify(state));
    toast("IndexedDB unavailable, saved to browser storage");
  }
  document.getElementById("saveState").textContent = "Saved locally";
  render();
  if (message) toast(message);
}

function downloadAttachment(id) {
  const tx = state.transactions.find(item => item.id === id);
  if (!tx?.attachment) return toast("No attachment saved for this transaction");
  const a = document.createElement("a");
  a.href = tx.attachment;
  a.download = tx.attachmentName || "attachment";
  a.click();
}

function renderCategories() {
  const list = document.getElementById("categoryList");
  list.innerHTML = "";
  [...new Set(state.transactions.map(tx => tx.category))].sort().forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    list.appendChild(option);
  });
}

function requestNotification() {
  if (!("Notification" in window)) return toast("Notifications are not supported here");
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      new Notification("FinanceTracker reminder", { body: "Your bill reminders are active on this device." });
      toast("Local notifications enabled");
    }
  });
}

function shortcuts(event) {
  if (event.ctrlKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    document.getElementById("amount").focus();
  }
  if (event.ctrlKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    persist("Saved");
  }
  if (event.key === "Escape") fillForm({});
}

function networkState() {
  document.getElementById("offlineState").textContent = navigator.onLine ? "Online" : "Offline mode";
}

function registerPwa() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => toast("Offline cache starts after deployment over HTTPS"));
  }
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstall = event;
  });
  document.getElementById("installBtn").addEventListener("click", async () => {
    if (!deferredInstall) return toast("Install is available from your browser menu after the first visit.");
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
  });
}

function normalizeState(value) {
  return {
    transactions: Array.isArray(value.transactions) ? value.transactions.map(tx => ({
      ...tx,
      id: tx.id || makeId(),
      amount: Number(tx.amount || 0),
      tags: Array.isArray(tx.tags) ? tx.tags : String(tx.tags || "").split(",").map(t => t.trim()).filter(Boolean)
    })) : [],
    settings: { ...defaultState.settings, ...(value.settings || {}) },
    bills: Array.isArray(value.bills) ? value.bills.map(bill => ({ ...bill, id: bill.id || makeId() })) : [],
    deleted: value.deleted || null
  };
}

function fileToDataUrl(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function seedTransactions() {
  return [
    { id: makeId(), date: "2026-07-01", type: "income", category: "Salary", amount: 145000, tags: ["work"], note: "Monthly salary" },
    { id: makeId(), date: "2026-07-03", type: "expense", category: "Rent", amount: 25000, tags: ["home"], note: "Apartment" },
    { id: makeId(), date: "2026-07-05", type: "expense", category: "Groceries", amount: 8200, tags: ["food"], note: "Monthly stock" },
    { id: makeId(), date: "2026-07-08", type: "expense", category: "EMI", amount: 18200, tags: ["loan"], note: "Car EMI" },
    { id: makeId(), date: "2026-06-01", type: "income", category: "Salary", amount: 140000, tags: ["work"], note: "" },
    { id: makeId(), date: "2026-06-10", type: "expense", category: "Travel", amount: 15400, tags: ["trip"], note: "Tickets" }
  ];
}
