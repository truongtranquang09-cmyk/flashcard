export function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export type DuplicateGroup<T> = {
  key: string;
  items: T[];
};

export function findDuplicates<T>(
  items: T[],
  keyOf: (item: T) => string,
): DuplicateGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = normalizeKey(keyOf(item));
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  return Array.from(groups, ([key, groupItems]) => ({
    key,
    items: groupItems,
  })).filter((group) => group.items.length > 1);
}
