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
  // This would integrate with a library like xlsx
  console.log("Exporting to Excel:", filename, data);
}

export function copyToClipboard(data: any[]): void {
  const text = data.map(row => Object.values(row).join('\t')).join('\n');
  navigator.clipboard.writeText(text);
}
