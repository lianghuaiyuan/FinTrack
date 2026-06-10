import React, { useState } from "react";
import api from "../api/client";
import ConfirmDialog from "../components/common/ConfirmDialog";

export default function DataImportExport() {
  const [importPreview, setImportPreview] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExport = async () => {
    try {
      const res = await api.get("/export/all", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const d = new Date();
      const dateStr = d.getFullYear() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0");
      link.setAttribute("download", "fintrack_backup_" + dateStr + ".json");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("导出成功！");
    } catch (err) { setError(err.response?.data?.error || "导出失败"); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setError("");
    setMessage("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        setImportPreview({
          version: data.version,
          exportedAt: data.exported_at,
          username: data.user?.username,
          accounts: data.accounts?.length || 0,
          deposits: data.time_deposits?.length || 0,
          transactions: data.income_expenses?.length || 0,
        });
      } catch (err2) { setError("无效文件：" + err2.message); setImportPreview(null); setImportFile(null); }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    setShowConfirm(false); setImporting(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await api.post("/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage("导入完成：" + res.data.summary.accounts + " 个账户，" + res.data.summary.deposits + " 笔定存，" + res.data.summary.transactions + " 条收支记录");
      setImportPreview(null); setImportFile(null);
    } catch (err) { setError(err.response?.data?.error || "导入失败"); }
    finally { setImporting(false); }
  };

  return (
    <div className="page">
      <h2>数据导入导出</h2>
      {message && <div className="success-banner">{message}<button className="btn-close" onClick={() => setMessage("")}>✕</button></div>}
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError("")}>✕</button></div>}

      <div className="card" style={{ marginBottom: 32, padding: "24px 28px" }}>
        <h3 style={{ marginBottom: 8 }}>导出数据</h3>
        <p style={{ lineHeight: 1.8, marginBottom: 16, color: "var(--c-text-secondary)" }}>将所有数据（账户、定存、收支记录、历史快照）导出为 JSON 文件，用于备份或迁移。</p>
        <button className="btn btn-primary" onClick={handleExport}>导出全部 (JSON)</button>
      </div>

      <div className="card" style={{ padding: "24px 28px" }}>
        <h3 style={{ marginBottom: 12 }}>导入数据</h3>
        <div className="alert alert-warning">
          <strong>⚠️ 警告：</strong>导入将<strong>覆盖</strong>当前所有数据，此操作不可撤销。建议先导出一份备份。
        </div>
        <div className="form-group" style={{ marginTop: 20, marginBottom: 12 }}>
          <label>选择备份文件 (.json)</label>
          <input type="file" accept=".json" onChange={handleFileSelect} />
        </div>
        {importPreview && (
          <div className="import-preview" style={{ marginTop: 16, padding: "16px 20px" }}>
            <h4 style={{ marginBottom: 10 }}>文件预览</h4>
            <table className="table" style={{ marginTop: 8 }}>
              <tbody>
                <tr><td style={{ padding: "8px 12px" }}>版本</td><td style={{ padding: "8px 12px" }}>{importPreview.version}</td></tr>
                <tr><td style={{ padding: "8px 12px" }}>导出时间</td><td style={{ padding: "8px 12px" }}>{importPreview.exportedAt}</td></tr>
                <tr><td style={{ padding: "8px 12px" }}>用户</td><td style={{ padding: "8px 12px" }}>{importPreview.username}</td></tr>
                <tr><td style={{ padding: "8px 12px" }}>账户数</td><td style={{ padding: "8px 12px" }}>{importPreview.accounts}</td></tr>
                <tr><td style={{ padding: "8px 12px" }}>定存数</td><td style={{ padding: "8px 12px" }}>{importPreview.deposits}</td></tr>
                <tr><td style={{ padding: "8px 12px" }}>收支记录</td><td style={{ padding: "8px 12px" }}>{importPreview.transactions}</td></tr>
              </tbody>
            </table>
            <button className="btn btn-primary" onClick={() => setShowConfirm(true)} disabled={importing} style={{ marginTop: 16 }}>
              {importing ? "导入中..." : "确认导入"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog open={showConfirm} title="确认导入" message="导入将覆盖当前所有数据，此操作不可撤销。确定继续？" confirmLabel="覆盖导入" danger onConfirm={handleImportConfirm} onCancel={() => setShowConfirm(false)} />
    </div>
  );
}
