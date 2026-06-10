import React, { useState, useEffect } from "react";
import { fmtDate, fmtMoney } from "../utils/format";
import api from "../api/client";
import Loading from "../components/common/Loading";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ principal: "", start_date: "", end_date: "", annual_rate: "", account_id: "" });

  const fetchData = async () => {
    try {
      const [depRes, accRes] = await Promise.all([api.get("/deposits"), api.get("/accounts")]);
      setDeposits(depRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "加载失败");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ principal: "", start_date: "", end_date: "", annual_rate: "0.025", account_id: accounts[0]?.id || "" });
    setShowModal(true);
  };

  const openEdit = (dep) => {
    setEditing(dep);
    setForm({ principal: dep.principal, start_date: dep.start_date, end_date: dep.end_date, annual_rate: dep.annual_rate, account_id: dep.account_id });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form, principal: parseFloat(form.principal), annual_rate: parseFloat(form.annual_rate) };
      if (editing) { await api.put(`/deposits/${editing.id}`, payload); }
      else { await api.post("/deposits", payload); }
      setShowModal(false);
      fetchData();
    } catch (err) { setError(err.response?.data?.error || "操作失败"); }
  };

  const handleRedeem = async () => {
    try {
      await api.post(`/deposits/${redeemTarget.id}/redeem`);
      setRedeemTarget(null);
      fetchData();
    } catch (err) { setError(err.response?.data?.error || "赎回失败"); setRedeemTarget(null); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/deposits/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) { setError(err.response?.data?.error || "删除失败"); setDeleteTarget(null); }
  };

  if (loading) return <Loading />;

  const activeDeposits = deposits.filter(d => d.status === "active");
  const redeemedDeposits = deposits.filter(d => d.status === "redeemed");

  return (
    <div className="page">
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError("")}>×</button></div>}

      <div className="page__toolbar">
        <h2 style={{margin:0}}>活跃定存 ({activeDeposits.length})</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ 新建定存</button>
      </div>

      {activeDeposits.length === 0 ? (
        <EmptyState icon="🏦" message="暂无活跃定存" actionLabel="新建定存" onAction={openCreate} />
      ) : (
        <div className="deposit-grid">
          {activeDeposits.map(d => (
            <div key={d.id} className={`card deposit-card ${d.days_remaining <= 7 ? "deposit-card--warning" : ""}`}>
              <div className="deposit-card__header">
                <span className="deposit-card__name">{d.account_name || "未知账户"}</span>
                <span className={`badge ${d.days_remaining <= 7 ? "badge--red" : "badge--green"}`}>
                  {d.days_remaining === 0 ? "已到期" : `${d.days_remaining} 天后到期`}
                </span>
              </div>
              <div className="deposit-card__principal">本金 ¥{fmtMoney(d.principal)} · 年利率 {(d.annual_rate * 100).toFixed(2)}%</div>
              <div className="deposit-card__current">当前本息 ¥{fmtMoney(d.current_value)}</div>
              <div className="deposit-card__detail">
                <span>利息 +¥{fmtMoney(d.interest_earned)}</span>
                <span>已存 {d.days_held} 天</span>
                <span>{d.start_date} → {d.end_date}</span>
              </div>
              <div className="deposit-card__actions">
                {d.days_remaining === 0 && <button className="btn btn-sm btn-primary" onClick={() => setRedeemTarget(d)}>赎回</button>}
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(d)}>编辑</button>
                <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(d)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {redeemedDeposits.length > 0 && (
        <div style={{marginTop:32}}>
          <h3 style={{marginBottom:12}}>已赎回 ({redeemedDeposits.length})</h3>
          <div className="deposit-grid">
            {redeemedDeposits.map(d => (
              <div key={d.id} className="card deposit-card" style={{opacity:.7}}>
                <div className="deposit-card__header">
                  <span className="deposit-card__name">{d.account_name || "未知账户"}</span>
                  <span className="badge badge--outline">已赎回</span>
                </div>
                <div className="deposit-card__principal">本金 ¥{fmtMoney(d.principal)}</div>
                <div className="deposit-card__current">赎回金额 ¥{fmtMoney(d.redeemed_amount)}</div>
                <div className="deposit-card__detail">
                  <span className="text-green">收益 +¥{fmtMoney(d.redeemed_amount - d.principal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{editing ? "编辑定存" : "新建定存"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>关联账户</label>
                <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} required>
                  <option value="">请选择</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>本金</label>
                <input type="number" step="0.01" min="0.01" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} placeholder="10000.00" required />
              </div>
              <div className="form-group">
                <label>起息日</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>到期日</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>年利率（如 0.025 = 2.5%）</label>
                <input type="number" step="0.0001" min="0.0001" max="1" value={form.annual_rate} onChange={e => setForm({ ...form, annual_rate: e.target.value })} required />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editing ? "保存" : "创建"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!redeemTarget} title="赎回定存" message={`确定赎回「${redeemTarget?.account_name}」的定存（本息 ¥${fmtMoney(redeemTarget?.current_value)}）？赎回后金额将转入关联账户。`} confirmLabel="确认赎回" onConfirm={handleRedeem} onCancel={() => setRedeemTarget(null)} />
      <ConfirmDialog open={!!deleteTarget} title="删除定存" message={`确定要删除「${deleteTarget?.account_name}」的定存吗？此操作不可撤销。`} confirmLabel="删除" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
