/**
 * CSV Export Utility for ERP & POS System
 * Generates Excel-friendly UTF-8 CSVs with BOM and escaped values.
 */

export function downloadCSV(filename: string, rows: (string | number | boolean | null | undefined)[][]): void {
  // Format cell value: escape double quotes, wrap in quotes if contains delimiter, newline or quote
  const formatCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    // If it contains quotes, semicolons, commas, or newlines, wrap in quotes and escape internal quotes
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const delimiter = ';'; // Standard semicolon for French/European/African Excel localization
  const csvContent = rows.map((row) => row.map(formatCell).join(delimiter)).join('\r\n');

  // \uFEFF is UTF-8 BOM so Excel opens accents, currency symbols correctly without encoding glitches
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
