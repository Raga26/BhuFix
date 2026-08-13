import { X } from 'lucide-react';

export function CloseButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`p-1.5 rounded-md text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors ${className}`}
    >
      <X size={16} strokeWidth={1.75} />
    </button>
  );
}
