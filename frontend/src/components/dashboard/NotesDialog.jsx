import { useState } from 'react';
import { CloseButton } from './CloseButton';

export function NotesDialog({ title, label, confirmLabel = 'Save', onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-medium">{title}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <label className="dash-label">{label || 'Notes'}</label>
        <textarea
          className="dash-input min-h-[96px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What should change?"
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <button type="button" className="dash-btn dash-btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="dash-btn dash-btn-primary flex-[2]" onClick={() => onConfirm(notes)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
