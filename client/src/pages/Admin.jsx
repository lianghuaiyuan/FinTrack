import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Loading from '../components/common/Loading';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { fmtDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || '加载失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/admin/users/${deleteTarget.id}`);
      setMessage(res.data.message);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || '删除失败');
      setDeleteTarget(null);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPwd.length < 6) return setError('新密码至少6个字符');
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/users/${resetTarget.id}/reset-password`, { newPassword: resetPwd });
      setMessage(res.data.message);
      setResetTarget(null);
      setResetPwd('');
    } catch (err) {
      setError(err.response?.data?.error || '重置失败');
    } finally { setActionLoading(false); }
  };

  const handleToggleAdmin = async () => {
    try {
      const res = await api.post(`/admin/users/${toggleTarget.id}/toggle-admin`);
      setMessage(res.data.message);
      setToggleTarget(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
      setToggleTarget(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <h2>🛡️ 用户管理</h2>

      {message && <div className="success-banner">{message}<button className="btn-close" onClick={() => setMessage('')}>✕</button></div>}
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError('')}>✕</button></div>}

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>账户</th>
                <th>定存</th>
                <th>收支</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isMe = u.id === currentUser?.userId;
                return (
                  <tr key={u.id} style={isMe ? { background: 'var(--c-accent-light)' } : {}}>
                    <td>{u.id}</td>
                    <td>
                      {u.username}
                      {isMe && <span className="badge badge--sm" style={{ marginLeft: 6, background: 'var(--c-accent)', color: '#fff' }}>当前</span>}
                      {u.isAdmin ? <span className="badge badge--sm" style={{ marginLeft: 4, background: 'var(--c-amber)', color: '#fff' }}>管理员</span> : null}
                    </td>
                    <td>{u.isAdmin ? '管理员' : '普通用户'}</td>
                    <td className="text-muted">{fmtDate(u.created_at)}</td>
                    <td>{u.account_count}</td>
                    <td>{u.deposit_count}</td>
                    <td>{u.transaction_count}</td>
                    <td>
                      <div className="btn-group" style={{ gap: 4 }}>
                        {!isMe && (
                          <>
                            <button className="btn btn-sm btn-outline" onClick={() => { setResetTarget(u); setResetPwd(''); setError(''); }}>重置密码</button>
                            <button className="btn btn-sm btn-outline" onClick={() => setToggleTarget(u)}>
                              {u.isAdmin ? '取消管理' : '设为管理'}
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(u)}>删除</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除用户"
        message={`确定要删除用户「${deleteTarget?.username}」及其所有数据吗？此操作不可撤销。`}
        confirmLabel="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toggle Admin Confirm */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.isAdmin ? '取消管理员' : '设为管理员'}
        message={toggleTarget?.isAdmin
          ? `确定要取消「${toggleTarget?.username}」的管理员权限吗？`
          : `确定要将「${toggleTarget?.username}」设为管理员吗？管理员可以管理所有用户数据。`}
        confirmLabel={toggleTarget?.isAdmin ? '取消' : '设为管理'}
        danger={toggleTarget?.isAdmin}
        onConfirm={handleToggleAdmin}
        onCancel={() => setToggleTarget(null)}
      />

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 className="modal__title">重置密码 — {resetTarget.username}</h3>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>新密码</label>
                <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="至少6个字符" autoFocus required />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => setResetTarget(null)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? '重置中...' : '确认重置'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
