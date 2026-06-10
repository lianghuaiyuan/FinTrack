import React, { useState, useEffect } from 'react';
import { fmtDate, fmtMoney } from '../utils/format';
import api from '../api/client';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';


export default function Assets() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showSetBalance, setShowSetBalance] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [history, setHistory] = useState([]);
  const [balanceForm, setBalanceForm] = useState({ balance: '', note: '' });
  const [adjustForm, setAdjustForm] = useState({ amount: '', note: '' });

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      setError(err.response?.data?.error || '加载失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const fetchHistory = async (accountId) => {
    try {
      const res = await api.get(`/accounts/${accountId}/history?limit=20`);
      setHistory(res.data);
    } catch { /* ignore */ }
  };

  const handleSetBalance = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/accounts/${selectedAccount.id}/set-balance`, {
        balance: parseFloat(balanceForm.balance),
        note: balanceForm.note || '手动更新余额',
      });
      setShowSetBalance(false);
      fetchAccounts();
      fetchHistory(selectedAccount.id);
    } catch (err) {
      setError(err.response?.data?.error || '更新失败');
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/accounts/${selectedAccount.id}/adjust`, {
        amount: parseFloat(adjustForm.amount),
        note: adjustForm.note || '手动调整',
      });
      setShowAdjust(false);
      fetchAccounts();
      fetchHistory(selectedAccount.id);
    } catch (err) {
      setError(err.response?.data?.error || '调整失败');
    }
  };

  const openAccount = (acc) => {
    setSelectedAccount(acc);
    fetchHistory(acc.id);
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError('')}>✕</button></div>}

      {accounts.length === 0 ? (
        <EmptyState icon="📋" message="暂无账户，请先在「账户管理」中创建" />
      ) : selectedAccount ? (
        <div className="asset-detail">
          <button className="btn btn-outline mb-1" onClick={() => setSelectedAccount(null)}>← 返回列表</button>
          <div className="card">
            <div className="card__header">
              <h2>{selectedAccount.name}</h2>
              <span className="badge">{selectedAccount.type}</span>
            </div>
            <div className="asset-detail__balance">¥{fmtMoney(selectedAccount.current_balance)}</div>
            <div className="asset-detail__meta">最后更新：{fmtDate(selectedAccount.last_updated_at)}</div>
            <div className="asset-detail__actions">
              <button className="btn btn-primary" onClick={() => { setBalanceForm({ balance: '', note: '' }); setShowSetBalance(true); }}>更新余额</button>
              <button className="btn btn-outline" onClick={() => { setAdjustForm({ amount: '', note: '' }); setShowAdjust(true); }}>调整增/减</button>
            </div>
          </div>

          {/* History */}
          <div className="card mt-1">
            <h3>变动记录</h3>
            {history.length === 0 ? <p className="text-muted">暂无变动记录</p> : (
              <div className="history-list">
                {history.map(r => (
                  <div key={r.id} className="history-item">
                    <div className="history-item__dot">
                      <span className={`history-item__icon ${r.type === 'set' ? 'history-item__icon--set' : 'history-item__icon--adjust'}`}>
                        {r.type === 'set' ? '📝' : '🔄'}
                      </span>
                    </div>
                    <div className="history-item__body">
                      <div className="history-item__top">
                        <span className="history-item__type">{r.type === 'set' ? '更新余额' : '调整增/减'}</span>
                        <span className="history-item__date">{fmtDate(r.created_at)}</span>
                      </div>
                      <div className="history-item__values">
                        <span className="history-item__old">¥{fmtMoney(r.old_balance)}</span>
                        <span className="history-item__arrow">→</span>
                        <span className="history-item__new">¥{fmtMoney(r.new_balance)}</span>
                        <span className={`history-item__delta ${r.adjustment_amount >= 0 ? 'text-green' : 'text-red'}`}>
                          {r.adjustment_amount >= 0 ? '+' : ''}{fmtMoney(r.adjustment_amount)}
                        </span>
                      </div>
                      {r.note && <div className="history-item__note">{r.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="account-grid">
          {accounts.map(acc => (
            <div key={acc.id} className="card account-card clickable" onClick={() => openAccount(acc)}>
              <h3>{acc.name}</h3>
              <span className="badge">{acc.type}</span>
              <div className="account-card__balance">¥{fmtMoney(acc.current_balance)}</div>
              <div className="text-muted text-sm">更新于 {fmtDate(acc.last_updated_at)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Set Balance Modal */}
      {showSetBalance && (
        <div className="modal-overlay" onClick={() => setShowSetBalance(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">更新余额 — {selectedAccount?.name}</h3>
            <form onSubmit={handleSetBalance}>
              <div className="form-group">
                <label>新余额</label>
                <input type="number" step="0.01" min="0" value={balanceForm.balance} onChange={e => setBalanceForm({ ...balanceForm, balance: e.target.value })} placeholder="输入新余额" required autoFocus />
              </div>
              <div className="form-group">
                <label>备注（可选）</label>
                <input type="text" value={balanceForm.note} onChange={e => setBalanceForm({ ...balanceForm, note: e.target.value })} placeholder="变动原因" />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowSetBalance(false)}>取消</button>
                <button type="submit" className="btn btn-primary">确认更新</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjust && (
        <div className="modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">调整增/减 — {selectedAccount?.name}</h3>
            <p className="text-muted">当前余额：¥{fmtMoney(selectedAccount?.current_balance)}</p>
            <form onSubmit={handleAdjust}>
              <div className="form-group">
                <label>变动金额（正数增加，负数减少）</label>
                <input type="number" step="0.01" value={adjustForm.amount} onChange={e => setAdjustForm({ ...adjustForm, amount: e.target.value })} placeholder="例如：+5000 或 -2000" required autoFocus />
              </div>
              <div className="form-group">
                <label>备注（可选）</label>
                <input type="text" value={adjustForm.note} onChange={e => setAdjustForm({ ...adjustForm, note: e.target.value })} placeholder="调整原因" />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdjust(false)}>取消</button>
                <button type="submit" className="btn btn-primary">确认调整</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
