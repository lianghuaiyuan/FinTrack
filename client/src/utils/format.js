/** Format date to Beijing time (UTC+8).
 *  SQLite stores UTC datetimes, so we force UTC parsing then convert. */
export function fmtDate(dateStr) {
  if (!dateStr) return '';
  // Normalize SQLite format "2026-06-10 13:37:11" to ISO UTC
  const iso = dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Format number as currency */
export function fmtMoney(n) {
  return (n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

/** Format decimal as percentage */
export function fmtPct(n) {
  return n != null ? `${(n * 100).toFixed(2)}%` : '0.00%';
}

/** Get today's date in YYYY-MM-DD format (Beijing time) */
export function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}
