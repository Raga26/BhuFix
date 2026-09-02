function assetSrc(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const origin = process.env.REACT_APP_BACKEND_URL
    || (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:8000');
  return `${origin}${src.startsWith('/') ? src : `/${src}`}`;
}

export function ClientMark({ client, size = 40, className = '' }) {
  const dim = typeof size === 'number' ? `${size}px` : size;
  const name = client?.name || 'Client';
  const src = assetSrc(client?.logo_url);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-md object-cover bg-navy border border-white/[0.08] flex-shrink-0 ${className}`}
        style={{ width: dim, height: dim }}
      />
    );
  }
  return (
    <div
      className={`rounded-md flex items-center justify-center text-white font-semibold bg-navy border border-white/[0.08] flex-shrink-0 ${className}`}
      style={{ width: dim, height: dim, fontSize: Math.max(11, (parseInt(dim, 10) || 40) * 0.32) }}
    >
      {name[0]?.toUpperCase() || 'C'}
    </div>
  );
}

export { assetSrc };
