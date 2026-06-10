import React, { useState } from 'react';
import api from '../api/client';

export default function ReportExport() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  const handleExport = async (url, format) => {
    setError('');
    setMessage('');
    setExporting(format);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      const d = new Date();
      const dateStr = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
      const ext = format === 'CSV' ? 'csv' : format === 'Excel' ? 'xlsx' : 'json';
      a.download = `fintrack_export_${dateStr}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      setMessage(`${format} 已下载`);
    } catch (err) {
      setError('导出失败，请确认已登录且网络正常');
    } finally {
      setExporting('');
    }
  };

  const items = [
    { icon: '📊', title: '收支明细', tag: 'CSV', desc: '所有收支记录，可用 Excel 打开', url: '/export/transactions?format=csv', fmt: 'CSV' },
    { icon: '📋', title: '资产总览', tag: 'Excel', desc: '账户余额、定存明细汇总表格', url: '/export/assets?format=xlsx', fmt: 'Excel' },
    { icon: '💾', title: '完整备份', tag: 'JSON', desc: '全部数据（账户、定存、收支、调整记录），可迁移到其他电脑', url: '/export/all', fmt: 'JSON' },
  ];

  return (
    <div className="page">
      <h2>📑 报表导出</h2>

      {message && <div className="success-banner">{message}<button className="btn-close" onClick={() => setMessage('')}>✕</button></div>}
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError('')}>✕</button></div>}

      <div className="export-strips">
        {items.map(item => (
          <div key={item.title} className="export-strip card">
            <span className="export-strip__icon">{item.icon}</span>
            <div className="export-strip__body">
              <span className="export-strip__title">{item.title}</span>
              <span className="export-strip__tag">{item.tag}</span>
              <span className="export-strip__desc">{item.desc}</span>
            </div>
            <button className="btn btn-primary" onClick={() => handleExport(item.url, item.fmt)} disabled={exporting === item.fmt}>
              {exporting === item.fmt ? '下载中...' : '导出'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
