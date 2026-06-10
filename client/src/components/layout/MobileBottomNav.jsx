import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const mainItems = [
  { to: '/', label: '仪表盘', icon: '📊' },
  { to: '/assets', label: '资产', icon: '📋' },
  { to: '/transactions', label: '收支', icon: '💰' },
  { to: '/accounts', label: '账户', icon: '💳' },
];

const moreItems = [
  { to: '/deposits', label: '定期存款', icon: '🏦' },
  { to: '/import-export', label: '导入导出', icon: '📦' },
  { to: '/reports', label: '报表导出', icon: '📑' },
  { to: '/settings', label: '账号管理', icon: '⚙️' },
  { to: '/guide', label: '使用说明', icon: '📖' },
  { to: '/admin', label: '用户管理', icon: '🛡️', adminOnly: true },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const moreActive = moreItems.some(item => isActive(item.to));

  const handleMoreClick = () => {
    setShowMore(!showMore);
  };

  const handleMoreItemClick = (to) => {
    setShowMore(false);
    navigate(to);
  };

  const visibleMoreItems = moreItems.filter(item => !item.adminOnly || user?.isAdmin);

  return (
    <>
      <nav className="mobile-bottom-nav">
        {mainItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={isActive(item.to) ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
          >
            <span className="mobile-nav-item__icon">{item.icon}</span>
            <span className="mobile-nav-item__label">{item.label}</span>
          </NavLink>
        ))}
        <button
          className={`mobile-nav-item ${moreActive || showMore ? 'mobile-nav-item--active' : ''}`}
          onClick={handleMoreClick}
        >
          <span className="mobile-nav-item__icon">⋯</span>
          <span className="mobile-nav-item__label">更多</span>
        </button>
      </nav>

      {showMore && (
        <div className="mobile-more-overlay" onClick={() => setShowMore(false)}>
          <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-more-menu__header">
              <span>更多功能</span>
              <button className="btn-close" onClick={() => setShowMore(false)}>✕</button>
            </div>
            <div className="mobile-more-menu__grid">
              {visibleMoreItems.map(item => (
                <button
                  key={item.to}
                  className={`mobile-more-item ${isActive(item.to) ? 'mobile-more-item--active' : ''}`}
                  onClick={() => handleMoreItemClick(item.to)}
                >
                  <span className="mobile-more-item__icon">{item.icon}</span>
                  <span className="mobile-more-item__label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
