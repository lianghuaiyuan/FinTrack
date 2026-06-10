import React, { useState } from "react";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";
import ConfirmDialog from "../components/common/ConfirmDialog";

export default function Settings() {
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.delete("/auth/account");
      setMessage("账户已删除，即将退出登录");
      setTimeout(() => logout(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "删除失败");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!oldPassword) return setError("请输入当前密码");
    if (newPassword.length < 6) return setError("新密码至少6个字符");
    if (newPassword !== confirmPassword) return setError("两次密码不一致");
    if (oldPassword === newPassword) return setError("新密码不能与当前密码相同");
    setLoading(true);
    try {
      const res = await api.put("/auth/password", { oldPassword, newPassword });
      setMessage(res.data.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "密码修改失败");
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <h2>⚙️ 账号管理</h2>
      {message && <div className="success-banner">{message}<button className="btn-close" onClick={() => setMessage("")}>✕</button></div>}
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError("")}>✕</button></div>}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: ".95rem", marginBottom: 12 }}>账户信息</h3>
        <div className="settings-info">
          <div className="settings-info__row"><span className="settings-info__label">用户名</span><span className="settings-info__value">{user?.username}</span></div>
          <div className="settings-info__row"><span className="settings-info__label">用户 ID</span><span className="settings-info__value">{user?.userId}</span></div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: ".95rem", marginBottom: 16 }}>修改密码</h3>
        <form onSubmit={handleChangePassword} style={{ maxWidth: 400 }}>
          <div className="form-group"><label>当前密码</label><input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="输入当前密码" autoComplete="current-password" /></div>
          <div className="form-group"><label>新密码</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少6个字符" autoComplete="new-password" /></div>
          <div className="form-group"><label>确认新密码</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" autoComplete="new-password" /></div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "保存中..." : "修改密码"}</button>
        </form>
      </div>
      <div className="card" style={{ borderColor: "var(--c-red)" }}>
        <h3 style={{ fontSize: ".95rem", marginBottom: 8, color: "var(--c-red)" }}>⚠️ 危险操作</h3>
        <p className="text-muted" style={{ marginBottom: 12 }}>永久删除您的账户和所有数据。此操作不可撤销。建议先导出一份备份。</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>删除账户</button>
          <button className="btn btn-outline" onClick={logout}>退出登录</button>
        </div>
      </div>
      <ConfirmDialog open={showDeleteConfirm} title="确认删除" message="确定要永久删除账户和所有数据吗？此操作不可撤销！" confirmLabel="永久删除" danger onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteConfirm(false)} />
    </div>
  );
}
