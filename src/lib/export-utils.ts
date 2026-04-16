/**
 * Utility to export data to CSV and trigger download in the browser.
 */
export function exportToCSV(filename: string, headers: string[], data: any[][]) {
  // Add UTF-8 BOM for Excel to recognize special characters (like accents)
  const BOM = '\uFEFF';
  
  const csvRows = [
    headers.join(';'), // Use semicolon as default for BR/Portuguese Excel compatibility
    ...data.map(row => row.map(cell => {
      const cellStr = cell === null || cell === undefined ? '' : String(cell);
      // Escape double quotes and wrap in quotes if contains separator
      if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(';'))
  ];

  const csvContent = BOM + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatMinsToHHMM(mins: number): string {
  if (mins === undefined || mins === null) return "00:00";
  const absMins = Math.abs(mins);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  const sign = mins < 0 ? "-" : "";
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
