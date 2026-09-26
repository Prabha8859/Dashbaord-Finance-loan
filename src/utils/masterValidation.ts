export const normalizeKey = (v: string | number) =>
  typeof v === "number" ? `n:${v}` : `s:${String(v).trim().toLowerCase()}`;

export const isEmptyItem = (v: string | number) =>
  typeof v === "number" ? !Number.isFinite(v) : String(v).trim() === "";

export const isListValid = (list: (string | number)[]): boolean => {
  const seen = new Set<string>();
  for (const v of list) {
    if (isEmptyItem(v)) return false;
    const key = normalizeKey(v);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
};

export const isGroupedValid = (grouped: Record<string, (string | number)[]>): boolean => {
  const seenKeys = new Set<string>();
  for (const [key, list] of Object.entries(grouped)) {
    if (!key.trim()) return false;
    const normalizedKey = key.trim().toLowerCase();
    if (seenKeys.has(normalizedKey)) return false;
    seenKeys.add(normalizedKey);
    if (!isListValid(list)) return false;
  }
  return true;
};

export const detectNumeric = (
  list: (string | number)[] | undefined,
  fallbackList?: (string | number)[]
): boolean => {
  if (list && list.length > 0) return typeof list[0] === "number";
  if (fallbackList && fallbackList.length > 0) return typeof fallbackList[0] === "number";
  return false;
};
