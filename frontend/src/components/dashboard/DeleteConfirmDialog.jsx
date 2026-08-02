export function DeleteConfirmDialog({ title, message, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D0E1A] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">⚠️ {title}</h2>
          <button onClick={onCancel} className="text-white/30 hover:text-white text-xl">✕</button>
        </div>
        <p className="text-white/70 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold py-2.5 rounded-xl hover:bg-white/[0.1] disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl shadow-[0_4px_16px_rgba(220,38,38,0.35)] disabled:opacity-60 transition-all"
          >
            {isLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
