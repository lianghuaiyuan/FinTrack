import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

const pageTitles = {
  '/': '仪表盘',
  '/accounts': '账户管理',
  '/assets': '资产列表',
  '/deposits': '定期存款',
  '/transactions': '收支记录',
  '/import-export': '数据导入导出',
  '/reports': '报表导出',
  '/settings': '账号管理',
  '/guide': '使用说明',
  '/admin': '用户管理',
};

export default function AppLayout({ children }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '财迹 FinTrack';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header title={title} />
        <main className="app-content">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
