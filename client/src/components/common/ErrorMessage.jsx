import React from 'react';

export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <span>{message}</span>
      {onDismiss && <button className="btn-close" onClick={onDismiss}>✕</button>}
    </div>
  );
}
