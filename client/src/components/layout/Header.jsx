import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">{title || '财迹 FinTrack'}</h1>
      </div>
      <div className="header__right">
        <span className="header__user">{user?.username}</span>
        <button className="btn-icon theme-toggle" onClick={toggleTheme} title={theme === 'light' ? '切换暗色模式' : '切换亮色模式'}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button className="btn-icon logout-btn" onClick={logout} title="退出登录">🚪</button>
      </div>
    </header>
  );
}
