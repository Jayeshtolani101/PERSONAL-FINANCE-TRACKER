export function initTheme() {
  const saved = localStorage.getItem("FinanceTracker.theme");
  if (saved === "light") document.documentElement.classList.add("light");
  document.getElementById("themeBtn").addEventListener("click", () => {
    document.documentElement.classList.toggle("light");
    localStorage.setItem("FinanceTracker.theme", document.documentElement.classList.contains("light") ? "light" : "dark");
  });
}
