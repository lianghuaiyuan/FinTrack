import React, { useState, useEffect } from "react";
import { fmtDate, fmtMoney, todayStr } from "../utils/format";
import api from "../api/client";
import Loading from "../components/common/Loading";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";

const INCOME_CATEGORIES = ["工资", "奖金", "兼职", "投资", "其他"];
const EXPENSE_CATEGORIES = ["餐饮", "房租", "交通", "购物", "娱乐", "医疗", "教育", "其他"];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ type: "expense", amount: "", category: "餐饮", description: "", date: todayStr() });

  const fetchData = async () => {
    try {
      const params = typeFilter !== "all" ? `?type=${typeFilter}` : "";
      const [txRes, sumRes] = await Promise.all([api.get(`/transactions${params}`), api.get("/transactions/summary")]);
      setTransactions(txRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "加载失败");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [typeFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.put(`/transactions/${editing.id}`, form);
      } else {
        await api.post("/transactions", { ...form, amount: parseFloat(form.amount) });
      }
      setShowForm(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "操作失败");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/transactions/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "删除失败");
      setDeleteTarget(null);
    }
  };

  const openEdit = (tx) => {
    setEditing(tx);
    setForm({ type: tx.type, amount: tx.amount.toString(), category: tx.category, description: tx.description || "", date: tx.date });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ type: "expense", amount: "", category: "餐饮", description: "", date: todayStr() });
    setShowForm(true);
  };

  const handleExportCSV = () => { window.open("/api/export/transactions?format=csv", "_blank"); };

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (loading) return <Loading />;

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="page">
      {error && <div className="error-banner">{error}<button className="btn-close" onClick={() => setError("")}>✕</button></div>}

      <div className="page__toolbar">
        <div className="btn-group">
          {[{ key: "all", label: "全部" }, { key: "income", label: "收入" }, { key: "expense", label: "支出" }].map(t => (
            <button key={t.key} className={`btn btn-sm ${typeFilter === t.key ? "btn-primary" : "btn-outline"}`} onClick={() => setTypeFilter(t.key)}>{t.label}</button>
          ))}
        </div>
        <div>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV} style={{ marginRight: 8 }}>导出 CSV</button>
          <button className="btn btn-primary" onClick={openCreate}>+ 记账</button>
        </div>
      </div>

      <div className="summary-row">
        <div className="summary-item summary-item--income">收入: ¥{fmtMoney(totalIncome)}</div>
        <div className="summary-item summary-item--expense">支出: ¥{fmtMoney(totalExpense)}</div>
        <div className={`summary-item ${totalIncome - totalExpense >= 0 ? "summary-item--income" : "summary-item--expense"}`}>结余: ¥{fmtMoney(totalIncome - totalExpense)}</div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState icon="💰" message="暂无收支记录" actionLabel="开始记账" onAction={openCreate} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>分类</th>
                <th>金额</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className={tx.type === "income" ? "row-income" : "row-expense"}>
                  <td>{tx.date}</td>
                  <td><span className={`badge ${tx.type === "income" ? "badge--green" : "badge--red"}`}>{tx.type === "income" ? "收入" : "支出"}</span></td>
                  <td>{tx.category}</td>
                  <td className={tx.type === "income" ? "text-green" : "text-red"}>{tx.type === "income" ? "+" : "-"}¥{fmtMoney(tx.amount)}</td>
                  <td className="text-muted">{tx.description || "-"}</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(tx)}>编辑</button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => setDeleteTarget(tx)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>月度统计</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>月份</th><th>收入</th><th>支出</th><th>净额</th></tr>
              </thead>
              <tbody>
                {summary.slice(-12).reverse().map(s => (
                  <tr key={s.month}>
                    <td>{s.month}</td>
                    <td className="text-green">¥{fmtMoney(s.income)}</td>
                    <td className="text-red">¥{fmtMoney(s.expense)}</td>
                    <td className={s.income - s.expense >= 0 ? "text-green" : "text-red"}>¥{fmtMoney(s.income - s.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{editing ? "编辑记录" : "添加记录"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>类型</label>
                <div className="btn-group">
                  <button type="button" className={`btn btn-sm ${form.type === "income" ? "btn-primary" : "btn-outline"}`} onClick={() => setForm({ ...form, type: "income", category: "工资" })}>收入</button>
                  <button type="button" className={`btn btn-sm ${form.type === "expense" ? "btn-primary" : "btn-outline"}`} onClick={() => setForm({ ...form, type: "expense", category: "餐饮" })}>支出</button>
                </div>
              </div>
              <div className="form-group">
                <label>金额</label>
                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label>分类</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>日期</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>备注（可选）</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="备注信息" />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}>取消</button>
                <button type="submit" className="btn btn-primary">{editing ? "保存" : "添加"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="删除记录" message="确定要删除这条收支记录吗？" confirmLabel="删除" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
