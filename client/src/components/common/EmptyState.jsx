import React from 'react';

export default function EmptyState({ icon = '📭', message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <p className="empty-state__message">{message || '暂无数据'}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
