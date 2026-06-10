import React from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel, danger = false }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">{title || '确认操作'}</h3>
        <p className="modal__body">{message}</p>
        <div className="modal__actions">
          <button className="btn btn-outline" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
