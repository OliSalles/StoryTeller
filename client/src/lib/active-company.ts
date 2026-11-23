/** Empresa escolhida pelo usuário; vai no header x-company-id de cada chamada à API */
const STORAGE_KEY = "storyteller.activeCompanyId";

export function getActiveCompanyId(): number | null {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function setActiveCompanyId(id: number | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(STORAGE_KEY, String(id));
  else window.localStorage.removeItem(STORAGE_KEY);
}
