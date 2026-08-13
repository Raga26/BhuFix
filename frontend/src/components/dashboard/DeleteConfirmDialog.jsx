import { X } from 'lucide-react';

export function DeleteConfirmDialog({ title, message, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="dash-modal p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-medium text-lg">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 rounded-md text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <p className="text-white/55 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="dash-btn dash-btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="dash-btn flex-1 bg-[#8B2E2E] text-white hover:bg-[#A03838]"
          >
            {isLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
