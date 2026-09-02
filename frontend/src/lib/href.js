export function href(url) {
  const t = String(url || '').trim();
  if (!t) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return `https://${t}`;
}
