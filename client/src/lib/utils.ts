import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (!amount) return "0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ko-KR").format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR");
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
    case "자동 추출 완료":
      return "bg-green-100 text-green-800";
    case "pending":
    case "수동 매핑 필요":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
    case "템플릿 미일치":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function exportToExcel(data: any[], filename: string): void {
  try {
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "데이터");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    });
  } catch (error) {
    console.error("Excel export error:", error);
  }
}

export function copyToClipboard(data: any[]): void {
  try {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const headerRow = headers.join('\t');
    const dataRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t')
    );
    
    const text = [headerRow, ...dataRows].join('\n');
    navigator.clipboard.writeText(text);
  } catch (error) {
    console.error("Clipboard copy error:", error);
  }
}
