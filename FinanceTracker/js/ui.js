import { money } from "./analytics.js";

export function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

export function renderDashboard(analysis, settings) {
  set("mIncome", money(analysis.income));
  set("mExpense", money(analysis.expense));
  set("mBalance", money(analysis.balance));
  set("mSavings", `${analysis.savingsRate}%`);
  set("mCashflow", `Cashflow ${money(analysis.cashflow)}`);
  set("mBudget", `Budget left ${money(analysis.budgetLeft)}`);
  set("mIncomeSub", `Net worth ${money(analysis.netWorth)}`);
  const budget = Number(settings.budget || 0);
  const used = budget ? Math.min(100, Math.round((analysis.expense / budget) * 100)) : 0;
  document.getElementById("budgetBar").style.width = `${used}%`;
  set("budgetInsight", budget ? `${used}% of this month's budget used. Remaining ${money(analysis.budgetLeft)}.` : "Set a budget to track spending pace.");
}

export function renderTransactions(transactions, handlers) {
  const body = document.getElementById("txBody");
  body.innerHTML = "";
  document.getElementById("emptyState").style.display = transactions.length ? "none" : "block";
  transactions.forEach(tx => {
    const tr = document.createElement("tr");
    const attachment = tx.attachment ? `<button class="ghost-btn" data-attachment="${tx.id}">${escapeHtml(tx.attachmentName || "Attachment")}</button>` : "";
    tr.innerHTML = `<td>${tx.date}</td><td>${tx.type}</td><td>${escapeHtml(tx.category)}</td><td>${(tx.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</td><td>${escapeHtml(tx.note || "")} ${attachment}</td><td class="amount-${tx.type}">${tx.type === "income" ? "+" : "-"}${money(tx.amount)}</td><td><button class="ghost-btn" data-edit="${tx.id}">Edit</button> <button class="ghost-btn" data-delete="${tx.id}">Delete</button></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => handlers.edit(btn.dataset.edit)));
  body.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => handlers.delete(btn.dataset.delete)));
  body.querySelectorAll("[data-attachment]").forEach(btn => btn.addEventListener("click", () => handlers.attachment(btn.dataset.attachment)));
}

export function renderBills(bills, remove) {
  const list = document.getElementById("billList");
  list.innerHTML = "";
  bills.sort((a, b) => a.day - b.day).forEach(bill => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(bill.name)}<br><small>Day ${bill.day} - ${money(bill.amount)}</small></span><button class="ghost-btn" data-id="${bill.id}">Done</button>`;
    list.appendChild(li);
  });
  list.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => remove(btn.dataset.id)));
}

export function renderReport(analysis) {
  document.getElementById("reportText").innerHTML = `<p>Income ${money(analysis.income)}, expenses ${money(analysis.expense)}, and monthly cashflow ${money(analysis.cashflow)}.</p><p>Savings rate is ${analysis.savingsRate}%. Current net worth estimate is ${money(analysis.netWorth)}.</p>`;
}

export function fillForm(tx) {
  ["txId", "type", "date", "category", "amount", "tags", "note"].forEach(id => {
    const el = document.getElementById(id);
    if (id === "txId") el.value = tx.id || "";
    else el.value = id === "tags" ? (tx.tags || []).join(", ") : tx[id] || "";
  });
  document.getElementById("attachment").value = "";
  document.getElementById("submitBtn").textContent = tx.id ? "Save" : "Add";
}

export function formData() {
  return {
    id: document.getElementById("txId").value || (crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    type: document.getElementById("type").value,
    date: document.getElementById("date").value,
    category: document.getElementById("category").value.trim(),
    amount: Number(document.getElementById("amount").value),
    tags: document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean),
    note: document.getElementById("note").value.trim()
  };
}

function set(id, value) {
  document.getElementById(id).textContent = value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
