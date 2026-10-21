const FORBIDDEN_FILE_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
const MAX_FILE_NAME_LENGTH = 60;

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(FORBIDDEN_FILE_NAME_CHARS, "_").trim();
  return cleaned.slice(0, MAX_FILE_NAME_LENGTH) || "deck";
}

export function uniqueFileNames(names: readonly string[]): string[] {
  const used = new Set<string>();

  return names.map((name) => {
    const base = sanitizeFileName(name);
    let candidate = base;
    let suffix = 2;

    while (used.has(candidate.toLowerCase())) {
      const suffixText = ` (${suffix})`;
      candidate = `${base
        .slice(0, MAX_FILE_NAME_LENGTH - suffixText.length)
        .trim()}${suffixText}`;
      suffix += 1;
    }

    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export function buildContentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(
    /[^\x20-\x7e]|["\\]/g,
    "_",
  );
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
