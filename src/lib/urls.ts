export function slugify(value: string): string {
  const slug = value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g, 'i')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  if (!slug) throw new Error(`Invalid URL name: ${JSON.stringify(value)}`);
  return slug;
}

function validatePath(path: string): void {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(path)) {
    throw new Error(`Invalid internal path: ${JSON.stringify(path)}`);
  }
  const pathname = path.split(/[?#]/, 1)[0];
  for (const segment of pathname.split('/')) {
    let decoded: string;
    try { decoded = decodeURIComponent(segment); }
    catch { throw new Error(`Invalid path encoding: ${JSON.stringify(path)}`); }
    if (decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded)) {
      throw new Error(`Invalid path segment: ${JSON.stringify(path)}`);
    }
  }
}

export function normalizeBase(base: string): string {
  validatePath(base);
  if (/[?#]/.test(base)) throw new Error(`Invalid base path: ${JSON.stringify(base)}`);
  const trimmed = base.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

export function withBase(path: string, base = import.meta.env?.BASE_URL ?? '/'): string {
  validatePath(path);
  return `${normalizeBase(base)}${path.replace(/^\//, '')}`;
}

export function absoluteUrl(path: string, site: string, base = import.meta.env?.BASE_URL ?? '/'): string {
  const origin = new URL(site);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Site must be an HTTP(S) URL');
  return new URL(withBase(path, base), origin.origin).href;
}
