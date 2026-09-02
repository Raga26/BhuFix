/** FastAPI `detail` may be a string or a list of `{msg}` objects. */
export function apiError(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail;
  if (!detail) return error?.message || fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const text = detail
      .map((item) => (typeof item === 'string' ? item : item?.msg || item?.message || ''))
      .filter(Boolean)
      .join('; ');
    return text || fallback;
  }
  if (typeof detail === 'object' && (detail.msg || detail.message)) {
    return detail.msg || detail.message;
  }
  return fallback;
}
