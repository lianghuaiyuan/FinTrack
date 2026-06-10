import React from 'react';

export default function Guide() {
  return (
    <div className="page">
      <h2>📖 使用说明</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>💡 核心理念</h3>
        <p className="text-muted" style={{ lineHeight: 1.8 }}>
          财迹不同于传统记账软件——<strong>无需逐笔记账</strong>。
          你只需管理每个资金账户的<strong>余额/市值</strong>（如微信零钱、支付宝、银行储蓄卡、证券账户），
          定期手动更新即可。收支单独记录，与投资变动分开，从而算出真实的投资收益率。
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>🚀 快速上手</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--c-text-secondary)' }}>
          <li><strong>创建账户</strong>：点击「账户管理」→「新建账户」，添加你的微信、支付宝、银行卡、证券账户等。</li>
          <li><strong>更新余额</strong>：进入「资产列表」，点击账户旁的「更新余额」或「调整增/减」修改金额。</li>
          <li><strong>记账收支</strong>：进入「收支记录」，记录每笔收入（工资、奖金等）和支出（餐饮、房租等）。</li>
          <li><strong>添加定存</strong>：进入「定期存款」，设置本金、利率、起止日期，系统自动计算本息。</li>
          <li><strong>查看分析</strong>：仪表盘自动展示资产变化趋势、分布饼图、月度收支对比。</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>💰 账户类型说明</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>账户类型</th><th>资产类别</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>零钱</td><td>零钱</td><td>微信零钱、支付宝余额等流动资金</td></tr>
              <tr><td>银行</td><td>零钱 / 定期存款 / 投资</td><td>储蓄卡余额、定存扣款账户，也可归入投资</td></tr>
              <tr><td>证券投资</td><td>投资</td><td>证券账户总市值，不记录具体持仓</td></tr>
              <tr><td>其他</td><td>零钱 / 投资</td><td>现金、其他金融账户</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>📊 收益率计算</h3>
        <p className="text-muted" style={{ lineHeight: 1.8 }}>
          系统使用 <strong>XIRR</strong>（扩展内部收益率）算法计算你的投资年化回报率。
          它会结合你所有投资账户的<strong>资金流入/流出记录</strong>和当前市值，
          剔除你主动存入和取出的资金影响，只反映纯粹的投资收益。
        </p>
        <p className="text-muted" style={{ lineHeight: 1.8, marginTop: 8 }}>
          <strong>定存利息</strong>采用<strong>单利按日计息</strong>：本息和 = 本金 + 本金 × 年利率 × (已存天数 / 365)。
          这是因为国内银行定期存款普遍采用单利计算，且此方式更直观易懂。
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>💾 数据备份与迁移</h3>
        <p className="text-muted" style={{ lineHeight: 1.8 }}>
          所有数据存储在本地 SQLite 数据库 (<code>server/data/fintrack.db</code>)。
          如需<strong>备份或换电脑迁移</strong>：
        </p>
        <ol style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--c-text-secondary)', marginTop: 8 }}>
          <li>进入「数据导入导出」→ 点击「导出全部数据」→ 下载 <code>.json</code> 文件。</li>
          <li>在新电脑上安装并启动 FinTrack。</li>
          <li>点击「导入」→ 选择备份文件 → 确认覆盖。</li>
        </ol>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '.95rem', marginBottom: 12 }}>🔒 隐私与安全</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--c-text-secondary)' }}>
          <li>完全离线运行，无需网络连接。</li>
          <li>密码使用 bcrypt 加密存储，无法逆向破解。</li>
          <li>支持多用户同时使用，数据完全隔离。</li>
          <li>无邮箱、无手机号注册，仅需用户名+密码。</li>
        </ul>
      </div>
    </div>
  );
}
