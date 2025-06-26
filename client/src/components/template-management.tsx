import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import type { Column, Template } from "@shared/schema";

export default function TemplateManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newColumnData, setNewColumnData] = useState({
    name: "",
    dataType: "문자열",
    required: false,
    defaultValue: "",
  });
  const [newTemplateData, setNewTemplateData] = useState({
    name: "",
    mappingData: "{}",
  });

  const queryClient = useQueryClient();

  const { data: columns = [], isLoading: columnsLoading } = useQuery<Column[]>({
    queryKey: ["/api/columns"],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const createColumnMutation = useMutation({
    mutationFn: (data: typeof newColumnData) => apiRequest("POST", "/api/columns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/columns"] });
      setNewColumnData({ name: "", dataType: "문자열", required: false, defaultValue: "" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof newTemplateData) => apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setNewTemplateData({ name: "", mappingData: "{}" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
  });

  const columnColumns = [
    { key: "name" as keyof Column, header: "컬럼명" },
    { key: "dataType" as keyof Column, header: "데이터 타입" },
    {
      key: "required" as keyof Column,
      header: "필수",
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 ${value ? "bg-gray-200 text-black" : "bg-white border border-gray-300 text-gray-600"}`}>
          {value ? "필수" : "선택"}
        </span>
      ),
      align: "center" as const,
    },
  ];

  const templateColumns = [
    { key: "name" as keyof Template, header: "템플릿명" },
    {
      key: "createdAt" as keyof Template,
      header: "생성일",
      render: (value: Date) => formatDate(value),
    },
  ];

  const handleCreateColumn = () => {
    createColumnMutation.mutate(newColumnData);
  };

  const handleCreateTemplate = () => {
    createTemplateMutation.mutate(newTemplateData);
  };

  const handleTemplateEdit = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleTemplateDelete = (template: Template) => {
    if (confirm(`템플릿 "${template.name}"을 삭제하시겠습니까?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  if (columnsLoading || templatesLoading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 h-full">
        {/* 컬럼 정의 관리 */}
        <div className="border border-gray-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-black">컬럼 정의 관리</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="btn-primary px-4 py-2 text-xs">+ 컬럼 추가</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 컬럼 추가</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right text-xs">
                        컬럼명
                      </Label>
                      <Input
                        id="name"
                        value={newColumnData.name}
                        onChange={(e) => setNewColumnData({ ...newColumnData, name: e.target.value })}
                        className="col-span-3 form-input"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="dataType" className="text-right text-xs">
                        데이터 타입
                      </Label>
                      <Select
                        value={newColumnData.dataType}
                        onValueChange={(value) => setNewColumnData({ ...newColumnData, dataType: value })}
                      >
                        <SelectTrigger className="col-span-3 form-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="문자열">문자열</SelectItem>
                          <SelectItem value="숫자">숫자</SelectItem>
                          <SelectItem value="날짜">날짜</SelectItem>
                          <SelectItem value="불린">불린</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right text-xs">필수</Label>
                      <div className="col-span-3">
                        <Checkbox
                          checked={newColumnData.required}
                          onCheckedChange={(checked) => setNewColumnData({ ...newColumnData, required: checked as boolean })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="defaultValue" className="text-right text-xs">
                        기본값
                      </Label>
                      <Input
                        id="defaultValue"
                        value={newColumnData.defaultValue}
                        onChange={(e) => setNewColumnData({ ...newColumnData, defaultValue: e.target.value })}
                        className="col-span-3 form-input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleCreateColumn} disabled={createColumnMutation.isPending}>
                      {createColumnMutation.isPending ? "추가 중..." : "추가"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="p-0">
            <DataTable
              data={columns}
              columns={columnColumns}
              onRowEdit={(column) => console.log("Edit column:", column)}
            />
          </div>
        </div>

        {/* 양식 템플릿 라이브러리 */}
        <div className="border border-gray-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-black">양식 템플릿 라이브러리</h3>
              <div className="flex space-x-2">
                <Button variant="outline" className="btn-secondary px-4 py-2 text-xs">
                  JSON 불러오기
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="btn-primary px-4 py-2 text-xs">+ 새 템플릿</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 템플릿 생성</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="templateName" className="text-right text-xs">
                          템플릿명
                        </Label>
                        <Input
                          id="templateName"
                          value={newTemplateData.name}
                          onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                          className="col-span-3 form-input"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending}>
                        {createTemplateMutation.isPending ? "생성 중..." : "생성"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          <div className="p-0">
            <DataTable
              data={templates}
              columns={templateColumns}
              onRowEdit={handleTemplateEdit}
              onRowDelete={handleTemplateDelete}
            />
          </div>
        </div>
      </div>

      {/* 템플릿 미리보기 영역 */}
      <div className="border border-gray-300">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
          <h3 className="text-lg font-medium text-black">템플릿 미리보기 및 매핑 설정</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-black mb-3">문서 미리보기</h4>
              <div className="border border-gray-300 bg-gray-50 h-80 flex items-center justify-center">
                <span className="text-gray-500 text-sm">견적서 파일을 선택하면 미리보기가 표시됩니다</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-black mb-3">매핑 설정</h4>
              <div className="space-y-3">
                {selectedTemplate && (
                  <div className="text-sm text-black mb-3">
                    선택된 템플릿: {selectedTemplate.name}
                  </div>
                )}
                {columns.slice(0, 3).map((column) => (
                  <div key={column.id} className="flex items-center justify-between p-3 border border-gray-300">
                    <span className="text-sm text-black">{column.name}</span>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1">매핑 대기</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex space-x-2">
                <Button variant="outline" className="btn-secondary px-4 py-2 text-xs">
                  매핑 초기화
                </Button>
                <Button className="btn-primary px-4 py-2 text-xs">
                  템플릿 저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
