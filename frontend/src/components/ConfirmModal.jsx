import { useEffect } from 'react';

/**
 * Reusable confirmation modal for destructive actions.
 *
 * Props:
 *   title       – heading text
 *   message     – body text
 *   confirmLabel – button label (default "Delete")
 *   icon        – emoji / text icon shown above title (default "⚠️")
 *   onConfirm   – called when user confirms
 *   onCancel    – called when user cancels (or presses Escape)
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel  = 'Cancel',
  icon = '!',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <span className="confirm-icon">{icon}</span>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button className="confirm-confirm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
