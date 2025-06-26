import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Quotation } from "@shared/schema";

export default function DataAnalysis() {
  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  // Calculate aggregated data
  const categoryStats = quotations.reduce((acc, quotation) => {
    const category = quotation.category || "기타";
    if (!acc[category]) {
      acc[category] = { count: 0, totalAmount: 0, savingsAmount: 0 };
    }
    acc[category].count += 1;
    acc[category].totalAmount += parseFloat(quotation.contractAmount || "0");
    acc[category].savingsAmount += parseFloat(quotation.savingsAmount || "0");
    return acc;
  }, {} as Record<string, { count: number; totalAmount: number; savingsAmount: number }>);

  const partnerStats = quotations.reduce((acc, quotation) => {
    const partner = quotation.partner || "기타";
    if (!acc[partner]) {
      acc[partner] = { count: 0, totalAmount: 0, savingsRate: 0 };
    }
    acc[partner].count += 1;
    acc[partner].totalAmount += parseFloat(quotation.contractAmount || "0");
    const consumerPrice = parseFloat(quotation.consumerPrice || "0");
    const contractAmount = parseFloat(quotation.contractAmount || "0");
    if (consumerPrice > 0) {
      acc[partner].savingsRate = ((consumerPrice - contractAmount) / consumerPrice) * 100;
    }
    return acc;
  }, {} as Record<string, { count: number; totalAmount: number; savingsRate: number }>);

  const totalSavings = quotations.reduce((sum, quotation) => {
    return sum + parseFloat(quotation.savingsAmount || "0");
  }, 0);

  const averageSavingsRate = quotations.length > 0 ? 
    quotations.reduce((sum, quotation) => {
      const consumerPrice = parseFloat(quotation.consumerPrice || "0");
      const contractAmount = parseFloat(quotation.contractAmount || "0");
      if (consumerPrice > 0) {
        return sum + ((consumerPrice - contractAmount) / consumerPrice) * 100;
      }
      return sum;
    }, 0) / quotations.length : 0;

  const handleExportExcel = () => {
    console.log("Exporting analysis to Excel...");
  };

  const handleCopyToClipboard = () => {
    console.log("Copying analysis to clipboard...");
  };

  const handleGenerateReport = () => {
    console.log("Generating PDF report...");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* 카테고리별 집계 */}
        <div className="border border-gray-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <h3 className="text-lg font-medium text-black">카테고리별 집계</h3>
          </div>
          <div className="p-4">
            <table className="w-full data-grid">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-300">
                  <th className="text-left font-medium text-black">카테고리</th>
                  <th className="text-right font-medium text-black">건수</th>
                  <th className="text-right font-medium text-black">총액</th>
                  <th className="text-right font-medium text-black">절감액</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryStats).map(([category, stats]) => (
                  <tr key={category} className="border-b border-gray-200">
                    <td className="text-black">{category}</td>
                    <td className="text-right text-black">{stats.count}</td>
                    <td className="text-right text-black">{formatCurrency(stats.totalAmount)}</td>
                    <td className="text-right text-green-600">-{formatCurrency(stats.savingsAmount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-medium">
                  <td className="text-black">전체</td>
                  <td className="text-right text-black">{quotations.length}</td>
                  <td className="text-right text-black">
                    {formatCurrency(Object.values(categoryStats).reduce((sum, stats) => sum + stats.totalAmount, 0))}
                  </td>
                  <td className="text-right text-green-600">-{formatCurrency(totalSavings)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 절감률 분석 */}
        <div className="border border-gray-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <h3 className="text-lg font-medium text-black">절감률 분석</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50">
                <span className="text-sm font-medium text-black">평균 절감률</span>
                <span className="text-lg font-semibold text-green-600">{averageSavingsRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50">
                <span className="text-sm font-medium text-black">최고 절감률</span>
                <span className="text-lg font-semibold text-green-600">28.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50">
                <span className="text-sm font-medium text-black">최저 절감률</span>
                <span className="text-lg font-semibold text-green-600">5.2%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50">
                <span className="text-sm font-medium text-black">총 절감액</span>
                <span className="text-lg font-semibold text-green-600">{formatCurrency(totalSavings)}원</span>
              </div>
            </div>
          </div>
        </div>

        {/* 협력사별 집계 */}
        <div className="border border-gray-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <h3 className="text-lg font-medium text-black">협력사별 집계</h3>
          </div>
          <div className="p-4">
            <table className="w-full data-grid">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-300">
                  <th className="text-left font-medium text-black">협력사</th>
                  <th className="text-right font-medium text-black">건수</th>
                  <th className="text-right font-medium text-black">총액</th>
                  <th className="text-right font-medium text-black">절감률</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(partnerStats).map(([partner, stats]) => (
                  <tr key={partner} className="border-b border-gray-200">
                    <td className="text-black">{partner}</td>
                    <td className="text-right text-black">{stats.count}</td>
                    <td className="text-right text-black">{formatCurrency(stats.totalAmount)}</td>
                    <td className="text-right text-green-600">{stats.savingsRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 내보내기 및 보고서 */}
        <div className="border border-gray-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <h3 className="text-lg font-medium text-black">내보내기 및 보고서</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-sm text-black">전체 데이터 엑셀 내보내기</span>
                <Button variant="outline" className="btn-secondary px-4 py-2 text-xs" onClick={handleExportExcel}>
                  내보내기
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-sm text-black">선택 데이터 엑셀 내보내기</span>
                <Button variant="outline" className="btn-secondary px-4 py-2 text-xs" onClick={handleExportExcel}>
                  내보내기
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-sm text-black">클립보드 복사</span>
                <Button variant="outline" className="btn-secondary px-4 py-2 text-xs" onClick={handleCopyToClipboard}>
                  복사
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-sm text-black">분석 보고서 PDF 생성</span>
                <Button className="btn-primary px-4 py-2 text-xs" onClick={handleGenerateReport}>
                  생성
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 기간별 절감액 추이 */}
      <div className="border border-gray-300">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
          <h3 className="text-lg font-medium text-black">월별 절감액 추이</h3>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 h-64 flex items-center justify-center">
            <span className="text-gray-500 text-sm">월별 절감액 추이 차트 영역</span>
          </div>
        </div>
      </div>
    </div>
  );
}
