import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Loading from '../components/common/Loading';
import { useTheme } from '../hooks/useTheme';
import { fmtMoney, fmtPct, fmtDate } from '../utils/format';

// Inline chart components using Recharts
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Area, Legend } from 'recharts';


export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [trend, setTrend] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [depositsDue, setDepositsDue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendDays, setTrendDays] = useState(90);
  const { theme } = useTheme();

  const chartColors = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc'];
  const chartColorsDark = ['#a5b4fc', '#6ee7b7', '#fcd34d', '#fca5a5', '#93c5fd', '#d8b4fe'];
  const colors = theme === 'dark' ? chartColorsDark : chartColors;
  const RADIAN = Math.PI / 180;

  // Pie label: outside with callout line
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = outerRadius * 1.32;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sin = Math.sin(-midAngle * RADIAN);
    const mx = cx + (outerRadius + 18) * cos;
    const my = cy + (outerRadius + 18) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    return (
      <g>
        <polyline points={`${mx},${my} ${ex},${ey}`} stroke={theme === 'dark' ? '#8b92a5' : '#9ba3b5'} strokeWidth={1} fill="none" />
        <text x={ex + (cos >= 0 ? 4 : -4)} y={ey} textAnchor={textAnchor} fill={theme === 'dark' ? '#e8ecf1' : '#1a1d28'} fontSize={12} fontWeight={600}>
          {name}
        </text>
        <text x={ex + (cos >= 0 ? 4 : -4)} y={ey + 16} textAnchor={textAnchor} fill={theme === 'dark' ? '#8b92a5' : '#687083'} fontSize={11}>
          {(percent * 100).toFixed(1)}%
        </text>
      </g>
    );
  };

  // Center text for donut
  const renderCenterLabel = () => {
    if (!distribution || distribution.length === 0) return null;
    const total = distribution.reduce((s, d) => s + d.total, 0);
    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
        <tspan x="50%" dy="-8" fill={theme === 'dark' ? '#8b92a5' : '#687083'} fontSize={12}>总资产</tspan>
        <tspan x="50%" dy="22" fill={theme === 'dark' ? '#e8ecf1' : '#1a1d28'} fontSize={16} fontWeight={700}>¥{fmtMoney(total)}</tspan>
      </text>
    );
  };

  const fetchData = async () => {
    try {
      const [overviewRes, distRes, trendRes, monthlyRes, depositsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/distribution'),
        api.get(`/analytics/trend?days=${trendDays}`),
        api.get('/analytics/monthly'),
        api.get('/deposits'),
      ]);
      setOverview(overviewRes.data);
      setDistribution(distRes.data);
      setTrend(trendRes.data);
      setMonthly(monthlyRes.data);
      setDepositsDue(depositsRes.data.filter(d => d.status === 'active' && d.days_remaining <= 7));
    } catch (err) {
      setError(err.response?.data?.error || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [trendDays]);

  if (loading) return <Loading />;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="dashboard">
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError('')}>✕</button></div>}

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__icon">💰</div>
          <div className="stat-card__content">
            <div className="stat-card__label">总资产</div>
            <div className="stat-card__value">¥{fmtMoney(overview?.totalAssets)}</div>
          </div>
        </div>
        <div className="stat-card stat-card--green">
          <div className="stat-card__icon">📈</div>
          <div className="stat-card__content">
            <div className="stat-card__label">总收益</div>
            <div className="stat-card__value">¥{fmtMoney(overview?.totalProfit)}</div>
          </div>
        </div>
        <div className="stat-card stat-card--purple">
          <div className="stat-card__icon">📊</div>
          <div className="stat-card__content">
            <div className="stat-card__label">年化收益率 (XIRR)</div>
            <div className="stat-card__value">{fmtPct(overview?.xirrRate)}</div>
          </div>
        </div>
        <div className="stat-card stat-card--blue">
          <div className="stat-card__icon">🏦</div>
          <div className="stat-card__content">
            <div className="stat-card__label">定期存款本息</div>
            <div className="stat-card__value">¥{fmtMoney(overview?.depositValue)}</div>
          </div>
        </div>
      </div>

      {/* Maturity Warnings */}
      {depositsDue.length > 0 && (
        <div className="dashboard__section">
          <h3>⏰ 到期提醒</h3>
          <div className="deposit-due-list">
            {depositsDue.map(d => (
              <div key={d.id} className="deposit-due-card">
                <span className="deposit-due-card__name">{d.account_name}</span>
                <span className="deposit-due-card__amount">¥{fmtMoney(d.current_value)}</span>
                <span className={`deposit-due-card__countdown ${d.days_remaining === 0 ? 'deposit-due-card__countdown--today' : ''}`}>
                  {d.days_remaining === 0 ? '今天到期' : `还有 ${d.days_remaining} 天`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="card__header">
            <h3>📈 资产变化趋势</h3>
            <div className="btn-group">
              {[30, 90, 365].map(d => (
                <button key={d} className={`btn btn-sm ${trendDays === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTrendDays(d)}>
                  {d === 365 ? '1年' : `${d}天`}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[0]} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={colors[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#282c38' : '#e2e5ec'} strokeOpacity={0.6} />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: theme === 'dark' ? '#8b92a5' : '#687083' }} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tick={{ fill: theme === 'dark' ? '#8b92a5' : '#687083' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(1)}万`} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,.12)',
                    background: theme === 'dark' ? '#232633' : '#fff', color: theme === 'dark' ? '#e8ecf1' : '#1a1d28',
                    fontSize: 13, padding: '10px 14px'
                  }}
                  formatter={(v) => [`¥${fmtMoney(v)}`, '总资产']}
                  labelStyle={{ color: theme === 'dark' ? '#8b92a5' : '#687083', marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="total" stroke="none" fill="url(#trendGradient)" />
                <Line type="monotone" dataKey="total" stroke={colors[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: colors[0], stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card" style={{ overflow: 'visible' }}>
          <h3>🍩 资产分布</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={distribution} dataKey="total" nameKey="grp"
                  cx="50%" cy="50%" innerRadius={68} outerRadius={110}
                  paddingAngle={3} strokeWidth={0}
                  label={renderPieLabel} labelLine={false}
                >
                  {distribution.map((_, idx) => (
                    <Cell key={idx} fill={colors[idx % colors.length]} />
                  ))}
                </Pie>
                {renderCenterLabel()}
                <Tooltip
                  contentStyle={{
                    borderRadius: 10, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,.12)',
                    background: theme === 'dark' ? '#232633' : '#fff', color: theme === 'dark' ? '#e8ecf1' : '#1a1d28',
                    fontSize: 13, padding: '10px 14px'
                  }}
                  formatter={(v) => [`¥${fmtMoney(v)}`]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <h3>📊 月度收支对比</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#282c38' : '#e2e5ec'} strokeOpacity={0.6} vertical={false} />
              <XAxis dataKey="month" fontSize={11} tick={{ fill: theme === 'dark' ? '#8b92a5' : '#687083' }} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tick={{ fill: theme === 'dark' ? '#8b92a5' : '#687083' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(1)}万`} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,.12)',
                  background: theme === 'dark' ? '#232633' : '#fff', color: theme === 'dark' ? '#e8ecf1' : '#1a1d28',
                  fontSize: 13, padding: '10px 14px'
                }}
                formatter={(v) => [`¥${fmtMoney(v)}`]}
                labelStyle={{ color: theme === 'dark' ? '#8b92a5' : '#687083', marginBottom: 4 }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="income" fill={colors[1]} radius={[6, 6, 0, 0]} maxBarSize={48} name="收入" />
              <Bar dataKey="expense" fill={colors[3]} radius={[6, 6, 0, 0]} maxBarSize={48} name="支出" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
