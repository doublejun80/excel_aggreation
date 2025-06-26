import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, exportToExcel, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Quotation } from "@shared/schema";

export default function DataManagement() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    partner: "",
    vendor: "",
    startDate: "",
    endDate: "",
  });
  const [displayOptions, setDisplayOptions] = useState({
    showSavings: false,
    groupBy: false,
  });
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedRows, setSelectedRows] = useState<Quotation[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const updateQuotationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Quotation> }) =>
      apiRequest("PUT", `/api/quotations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setSelectedQuotation(null);
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
    },
  });

  const filteredQuotations = quotations.filter((quotation) => {
    if (filters.search && !Object.values(quotation).some(value => 
      String(value).toLowerCase().includes(filters.search.toLowerCase())
    )) {
      return false;
    }
    if (filters.category && filters.category !== "all" && quotation.category !== filters.category) {
      return false;
    }
    if (filters.partner && filters.partner !== "all" && quotation.partner !== filters.partner) {
      return false;
    }
    if (filters.vendor && filters.vendor !== "all" && quotation.vendor !== filters.vendor) {
      return false;
    }
    return true;
  });

  const quotationColumns = [
    { key: "quotationId" as keyof Quotation, header: "ID" },
    { key: "solution" as keyof Quotation, header: "솔루션" },
    { key: "category" as keyof Quotation, header: "카테고리" },
    { key: "partner" as keyof Quotation, header: "협력사" },
    { key: "vendor" as keyof Quotation, header: "벤더사" },
    { key: "mainProduct" as keyof Quotation, header: "주요제품" },
    {
      key: "quantity" as keyof Quotation,
      header: "수량",
      align: "right" as const,
    },
    {
      key: "consumerPrice" as keyof Quotation,
      header: "소비자가격",
      align: "right" as const,
      render: (value: string) => formatCurrency(value),
    },
    {
      key: "contractAmount" as keyof Quotation,
      header: "계약금액",
      align: "right" as const,
      render: (value: string) => formatCurrency(value),
    },
    ...(displayOptions.showSavings ? [{
      key: "savingsAmount" as keyof Quotation,
      header: "절감액",
      align: "right" as const,
      render: (value: string) => (
        <span className="text-green-600">
          {value ? `-${formatCurrency(value)}` : "0"}
        </span>
      ),
    }] : []),
    { key: "freeMaintenancePeriod" as keyof Quotation, header: "무상기간", align: "center" as const },
    { key: "vendorContact" as keyof Quotation, header: "벤더담당" },
    {
      key: "version" as keyof Quotation,
      header: "버전",
      align: "center" as const,
      render: (value: number) => `v${value}`,
    },
  ];

  const handleQuotationEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
  };

  const handleQuotationDelete = (quotation: Quotation) => {
    if (confirm(`견적 "${quotation.solution}"을 삭제하시겠습니까?`)) {
      deleteQuotationMutation.mutate(quotation.id);
    }
  };

  const handleUpdateQuotation = (data: Partial<Quotation>) => {
    if (selectedQuotation) {
      updateQuotationMutation.mutate({ id: selectedQuotation.id, data });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = selectedRows.length > 0 ? selectedRows : filteredQuotations;
    if (dataToExport.length === 0) {
      toast({
        title: "내보낼 데이터 없음",
        description: "내보낼 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }
    exportToExcel(dataToExport, `견적데이터_${new Date().toISOString().split('T')[0]}`);
    toast({
      title: "엑셀 내보내기 완료",
      description: `${dataToExport.length}건의 데이터를 엑셀로 내보냈습니다.`,
    });
  };

  const handleCopyToClipboard = () => {
    const dataToExport = selectedRows.length > 0 ? selectedRows : filteredQuotations;
    if (dataToExport.length === 0) {
      toast({
        title: "복사할 데이터 없음",
        description: "복사할 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }
    copyToClipboard(dataToExport);
    toast({
      title: "클립보드 복사 완료",
      description: `${dataToExport.length}건의 데이터를 클립보드에 복사했습니다.`,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 영역 */}
      <div className="border border-gray-300">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-black">견적 데이터 관리</h3>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="btn-secondary px-4 py-2 text-xs"
                onClick={() => setFilters({
                  search: "",
                  category: "",
                  partner: "",
                  vendor: "",
                  startDate: "",
                  endDate: "",
                })}
              >
                필터 초기화
              </Button>
              <Button 
                variant="outline" 
                className="btn-secondary px-4 py-2 text-xs"
                onClick={handleExportExcel}
              >
                엑셀 내보내기
              </Button>
              <Button 
                variant="outline" 
                className="btn-secondary px-4 py-2 text-xs"
                onClick={handleCopyToClipboard}
              >
                클립보드 복사
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-6 gap-4">
            <div>
              <Label className="block text-xs text-gray-700 mb-1">검색</Label>
              <Input
                type="text"
                className="form-input w-full px-3 py-2"
                placeholder="전체 검색"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-700 mb-1">카테고리</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger className="form-input w-full px-3 py-2">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="SW군">SW군</SelectItem>
                  <SelectItem value="HW군">HW군</SelectItem>
                  <SelectItem value="서비스군">서비스군</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-xs text-gray-700 mb-1">협력사</Label>
              <Select value={filters.partner} onValueChange={(value) => setFilters({ ...filters, partner: value })}>
                <SelectTrigger className="form-input w-full px-3 py-2">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="협력사A">협력사A</SelectItem>
                  <SelectItem value="협력사B">협력사B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-xs text-gray-700 mb-1">벤더사</Label>
              <Select value={filters.vendor} onValueChange={(value) => setFilters({ ...filters, vendor: value })}>
                <SelectTrigger className="form-input w-full px-3 py-2">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="벤더A">벤더A</SelectItem>
                  <SelectItem value="벤더B">벤더B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-xs text-gray-700 mb-1">기간 (시작)</Label>
              <Input
                type="date"
                className="form-input w-full px-3 py-2"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="block text-xs text-gray-700 mb-1">기간 (종료)</Label>
              <Input
                type="date"
                className="form-input w-full px-3 py-2"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 데이터 그리드 */}
      <div className="border border-gray-300 flex-1">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">총 {filteredQuotations.length}건</span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-xs">
                <Checkbox
                  checked={displayOptions.showSavings}
                  onCheckedChange={(checked) =>
                    setDisplayOptions({ ...displayOptions, showSavings: checked as boolean })
                  }
                  className="mr-2"
                />
                <span className="text-black">절감액 표시</span>
              </label>
              <label className="flex items-center text-xs">
                <Checkbox
                  checked={displayOptions.groupBy}
                  onCheckedChange={(checked) =>
                    setDisplayOptions({ ...displayOptions, groupBy: checked as boolean })
                  }
                  className="mr-2"
                />
                <span className="text-black">그룹화</span>
              </label>
            </div>
          </div>
        </div>
        <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
          <DataTable
            data={filteredQuotations}
            columns={quotationColumns}
            onRowSelect={setSelectedRows}
            onRowEdit={handleQuotationEdit}
            onRowDelete={handleQuotationDelete}
          />
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              1-{Math.min(filteredQuotations.length, 50)} of {filteredQuotations.length} records
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" className="btn-secondary px-3 py-1 text-xs">
                이전
              </Button>
              <span className="text-xs text-gray-600">1 / 1</span>
              <Button variant="outline" className="btn-secondary px-3 py-1 text-xs">
                다음
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 편집 다이얼로그 */}
      <Dialog open={!!selectedQuotation} onOpenChange={() => setSelectedQuotation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>견적 정보 수정</DialogTitle>
          </DialogHeader>
          {selectedQuotation && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-700">솔루션</Label>
                  <Input
                    value={selectedQuotation.solution || ""}
                    onChange={(e) => setSelectedQuotation({ ...selectedQuotation, solution: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">카테고리</Label>
                  <Select
                    value={selectedQuotation.category || ""}
                    onValueChange={(value) => setSelectedQuotation({ ...selectedQuotation, category: value })}
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SW군">SW군</SelectItem>
                      <SelectItem value="HW군">HW군</SelectItem>
                      <SelectItem value="서비스군">서비스군</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-700">협력사</Label>
                  <Input
                    value={selectedQuotation.partner || ""}
                    onChange={(e) => setSelectedQuotation({ ...selectedQuotation, partner: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">벤더사</Label>
                  <Input
                    value={selectedQuotation.vendor || ""}
                    onChange={(e) => setSelectedQuotation({ ...selectedQuotation, vendor: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-700">계약금액</Label>
                  <Input
                    type="number"
                    value={selectedQuotation.contractAmount || ""}
                    onChange={(e) => setSelectedQuotation({ ...selectedQuotation, contractAmount: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">수량</Label>
                  <Input
                    type="number"
                    value={selectedQuotation.quantity || ""}
                    onChange={(e) => setSelectedQuotation({ ...selectedQuotation, quantity: parseInt(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedQuotation(null)}>
                  취소
                </Button>
                <Button onClick={() => handleUpdateQuotation(selectedQuotation)}>
                  저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
