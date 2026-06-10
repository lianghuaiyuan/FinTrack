/**
 * Generate CSV string from an array of objects.
 * @param {Array<Object>} rows
 * @param {Array<string>} columns - Optional column order. If omitted, uses keys of first row.
 * @param {Object} [labels] - Optional column header label mapping { key: 'Display Name' }
 * @returns {string} CSV string with BOM for Excel compatibility
 */
function generateCSV(rows, columns, labels) {
  if (!rows || rows.length === 0) {
    return '\uFEFF'; // BOM only, empty file
  }

  const cols = columns || Object.keys(rows[0]);
  const headers = cols.map(c => labels?.[c] || c);

  const escape = (val) => {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(cols.map(c => escape(row[c])).join(','));
  }

  return '\uFEFF' + lines.join('\n'); // BOM for Excel UTF-8
}

module.exports = { generateCSV };
