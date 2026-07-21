const DAY_IN_MS = 86_400_000;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailySidebarItem(items, dateKey = getLocalDateKey()) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
  const index = ((dayNumber % items.length) + items.length) % items.length;
  return items[index];
}
