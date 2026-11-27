type Primitive = string | number | boolean;

export function serializeDraft(values: Record<string, unknown>): string {
  const out: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === 'string' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return JSON.stringify(out);
}

export function parseDraft(raw: string | null | undefined, allowedKeys: readonly string[]): Record<string, Primitive> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, Primitive> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!allowedKeys.includes(k)) continue;
      if (typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}
