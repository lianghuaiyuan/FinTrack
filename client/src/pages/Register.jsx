import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) return setError('请输入用户名');
    if (username.trim().length < 3) return setError('用户名至少3个字符');
    if (password.length < 6) return setError('密码至少6个字符');
    if (password !== confirmPassword) return setError('两次密码不一致');
    setLoading(true);
    try {
      await register(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1>💎 财迹 FinTrack</h1>
          <p>创建你的离线记账账户</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-banner">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="3-20个字符" autoComplete="username" autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6个字符" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入密码" autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="auth-card__footer">
          已有账户？<Link to="/login">返回登录</Link>
        </p>
      </div>
    </div>
  );
}
