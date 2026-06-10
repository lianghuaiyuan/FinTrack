import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) return setError('请输入用户名');
    if (!password) return setError('请输入密码');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1>💎 财迹 FinTrack</h1>
          <p>个人记账，离线无忧</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-banner">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="请输入用户名" autoComplete="username" autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="auth-card__footer">
          还没有账户？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
