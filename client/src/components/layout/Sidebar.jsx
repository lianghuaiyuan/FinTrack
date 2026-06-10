import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/', label: '仪表盘', icon: '📊' },
  { to: '/accounts', label: '账户管理', icon: '💳' },
  { to: '/assets', label: '资产列表', icon: '📋' },
  { to: '/deposits', label: '定期存款', icon: '🏦' },
  { to: '/transactions', label: '收支记录', icon: '💰' },
  { to: '/import-export', label: '数据导入导出', icon: '📦' },
  { to: '/reports', label: '报表导出', icon: '📑' },
  { to: '/settings', label: '账号管理', icon: '⚙️' },
  { to: '/guide', label: '使用说明', icon: '📖' },
  { to: '/admin', label: '用户管理', icon: '🛡️' },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Filter nav items: hide admin from non-admin users
  const visibleItems = navItems.filter(item =>
    item.to !== '/admin' || user?.isAdmin
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">💎</span>
        <span className="sidebar__name">财迹</span>
      </div>
      <nav className="sidebar__nav">
        {visibleItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon">{item.icon}</span>
            <span className="nav-item__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button className="nav-item theme-toggle-sidebar" onClick={toggleTheme}>
          <span className="nav-item__icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="nav-item__label">{theme === 'light' ? '暗色模式' : '亮色模式'}</span>
        </button>
        <button className="nav-item logout-sidebar" onClick={logout}>
          <span className="nav-item__icon">🚪</span>
          <span className="nav-item__label">退出登录</span>
        </button>
      </div>
    </aside>
  );
}
