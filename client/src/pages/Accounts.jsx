import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { fmtDate, fmtMoney } from '../utils/format';

const TYPE_OPTIONS = ['零钱', '银行', '证券投资', '其他'];
const CATEGORY_OPTIONS = ['零钱', '定期存款', '投资'];
const TYPE_LABELS = { 零钱: '💵', 银行: '🏦', 证券投资: '📈', 其他: '📦' };
const CAT_LABELS = { 零钱: '零钱', 定期存款: '定存', 投资: '投资' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', type: '零钱', asset_category: '零钱', current_balance: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      setError(err.response?.data?.error || '加载失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: '零钱', asset_category: '零钱', current_balance: '' });
    setShowModal(true);
  };

  const openEdit = (acc) => {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type, asset_category: acc.asset_category, current_balance: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/accounts/${editing.id}`, { name: form.name, type: form.type });
      } else {
        await api.post('/accounts', { ...form, current_balance: parseFloat(form.current_balance) || 0 });
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/accounts/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || '删除失败');
      setDeleteTarget(null);
    }
  };

  const filtered = filter === 'all' ? accounts : accounts.filter(a => a.type === filter);

  if (loading) return <Loading />;

  return (
    <div className="page">
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError('')}>✕</button></div>}

      <div className="page__toolbar">
        <div className="filter-chips">
          {['all', ...TYPE_OPTIONS].map(t => (
            <button key={t} className={`chip ${filter === t ? 'chip--active' : ''}`} onClick={() => setFilter(t)}>
              {t === 'all' ? '全部' : `${TYPE_LABELS[t] || ''} ${t}`}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ 新建账户</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="💳" message="暂无账户，点击上方按钮创建" actionLabel="新建账户" onAction={openCreate} />
      ) : (
        <div className="account-grid">
          {filtered.map(acc => (
            <div key={acc.id} className="card account-card">
              <div className="account-card__header">
                <span className="account-card__icon">{TYPE_LABELS[acc.type] || '📦'}</span>
                <div>
                  <h3 className="account-card__name">{acc.name}</h3>
                  <span className="badge badge--sm">{acc.type}</span>
                  <span className="badge badge--sm badge--outline">{CAT_LABELS[acc.asset_category]}</span>
                </div>
              </div>
              <div className="account-card__body">
                <div className="account-card__balance">¥{fmtMoney(acc.current_balance)}</div>
                <div className="account-card__time">更新于 {fmtDate(acc.last_updated_at)}</div>
              </div>
              <div className="account-card__actions">
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(acc)}>编辑</button>
                <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(acc)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{editing ? '编辑账户' : '新建账户'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>账户名称</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例如：微信零钱" required />
              </div>
              <div className="form-group">
                <label>账户类型</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>资产类别</label>
                <select value={form.asset_category} onChange={e => setForm({ ...form, asset_category: e.target.value })}>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              {!editing && (
                <div className="form-group">
                  <label>初始余额（可选）</label>
                  <input type="number" step="0.01" min="0" value={form.current_balance} onChange={e => setForm({ ...form, current_balance: e.target.value })} placeholder="0.00" />
                </div>
              )}
              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editing ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="删除账户" message={`确定要删除「${deleteTarget?.name}」吗？此操作不可撤销。`} confirmLabel="删除" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
