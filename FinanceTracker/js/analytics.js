export const money = value => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0)}`;
export const monthKey = date => (date || new Date().toISOString()).slice(0, 7);

export function analyze(transactions, settings) {
  const nowMonth = monthKey(new Date().toISOString());
  const monthTx = transactions.filter(tx => monthKey(tx.date) === nowMonth);
  const income = sum(monthTx, "income");
  const expense = sum(monthTx, "expense");
  const allIncome = sum(transactions, "income");
  const allExpense = sum(transactions, "expense");
  const balance = allIncome - allExpense;
  const savingsRate = income ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
  const categoryExpense = groupSum(monthTx.filter(tx => tx.type === "expense"), "category");
  const months = monthly(transactions);
  const budgetLeft = Math.max(0, Number(settings.budget || 0) - expense);
  return { income, expense, balance, savingsRate, cashflow: income - expense, categoryExpense, months, budgetLeft, netWorth: balance + Number(settings.savingsGoal || 0) };
}

function sum(items, type) {
  return items.filter(item => item.type === type).reduce((total, item) => total + Number(item.amount || 0), 0);
}

function groupSum(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] || "Other";
    acc[key] = (acc[key] || 0) + Number(item.amount || 0);
    return acc;
  }, {});
}

function monthly(transactions) {
  const grouped = {};
  transactions.forEach(tx => {
    const key = monthKey(tx.date);
    grouped[key] ??= { income: 0, expense: 0, balance: 0 };
    grouped[key][tx.type] += Number(tx.amount || 0);
    grouped[key].balance = grouped[key].income - grouped[key].expense;
  });
  return Object.keys(grouped).sort().map(key => ({ month: key, ...grouped[key] }));
}
