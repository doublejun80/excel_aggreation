import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { getStatusColor } from "@/lib/utils";
import { Upload } from "lucide-react";
import type { UploadedFile } from "@shared/schema";

export default function QuoteUpload() {
  const [dragOver, setDragOver] = useState(false);
  const [uploadOptions, setUploadOptions] = useState({
    folderUpload: false,
    autoMapping: true,
  });
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const queryClient = useQueryClient();

  const { data: uploadedFiles = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ["/api/uploaded-files"],
  });

  const uploadFileMutation = useMutation({
    mutationFn: (fileData: { filename: string; size: number; status: string }) =>
      apiRequest("POST", "/api/uploaded-files", fileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-files"] });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      uploadFileMutation.mutate({
        filename: file.name,
        size: file.size,
        status: uploadOptions.autoMapping ? "completed" : "pending",
      });
    });
  }, [uploadOptions.autoMapping, uploadFileMutation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      uploadFileMutation.mutate({
        filename: file.name,
        size: file.size,
        status: uploadOptions.autoMapping ? "completed" : "pending",
      });
    });
  };

  const fileColumns = [
    { key: "filename" as keyof UploadedFile, header: "파일명" },
    {
      key: "size" as keyof UploadedFile,
      header: "크기",
      render: (value: number) => `${Math.round(value / 1024)}KB`,
    },
    {
      key: "status" as keyof UploadedFile,
      header: "상태",
      render: (value: string) => {
        const statusText = value === "completed" ? "자동 추출 완료" : 
                          value === "pending" ? "수동 매핑 필요" : "템플릿 미일치";
        return (
          <span className={`text-xs px-2 py-1 ${getStatusColor(statusText)}`}>
            {statusText}
          </span>
        );
      },
    },
    {
      key: "templateId" as keyof UploadedFile,
      header: "매칭 템플릿",
      render: (value: number | null) => value ? `템플릿 ${value}` : "-",
    },
  ];

  const handleFileMapping = (file: UploadedFile) => {
    setSelectedFile(file);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6 h-full">
        {/* 파일 업로드 영역 */}
        <div className="col-span-1">
          <div className="border border-gray-300 h-full">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
              <h3 className="text-lg font-medium text-black">파일 업로드</h3>
            </div>
            <div className="p-4">
              <div
                className={`upload-zone border-2 border-dashed p-8 text-center mb-4 ${
                  dragOver ? "active" : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="text-gray-500">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm mb-2">파일을 드래그하여 업로드하거나</p>
                  <Button variant="outline" className="btn-secondary px-4 py-2 text-xs" asChild>
                    <label>
                      파일 선택
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".xlsx,.xls,.pdf"
                      />
                    </label>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <Checkbox
                    checked={uploadOptions.folderUpload}
                    onCheckedChange={(checked) =>
                      setUploadOptions({ ...uploadOptions, folderUpload: checked as boolean })
                    }
                    className="mr-2"
                  />
                  <span className="text-black">폴더 전체 업로드</span>
                </label>
                <label className="flex items-center text-sm">
                  <Checkbox
                    checked={uploadOptions.autoMapping}
                    onCheckedChange={(checked) =>
                      setUploadOptions({ ...uploadOptions, autoMapping: checked as boolean })
                    }
                    className="mr-2"
                  />
                  <span className="text-black">자동 템플릿 매칭</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 업로드된 파일 목록 */}
        <div className="col-span-2">
          <div className="border border-gray-300 h-full">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-black">업로드된 파일 목록</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" className="btn-secondary px-4 py-2 text-xs">
                    전체 처리
                  </Button>
                  <Button className="btn-primary px-4 py-2 text-xs">
                    선택 처리
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-0 overflow-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
              <DataTable
                data={uploadedFiles}
                columns={fileColumns}
                onRowSelect={(selectedRows) => console.log("Selected files:", selectedRows)}
                onRowEdit={handleFileMapping}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 수동 매핑 작업장 */}
      <div className="border border-gray-300">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
          <h3 className="text-lg font-medium text-black">수동 매핑 작업장</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-black mb-3">문서 미리보기</h4>
              <div className="border border-gray-300 bg-gray-50 h-96 flex items-center justify-center">
                {selectedFile ? (
                  <span className="text-gray-500 text-sm">
                    {selectedFile.filename} 미리보기 영역
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">
                    매핑할 파일을 선택하면 미리보기가 표시됩니다
                  </span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-black mb-3">데이터 매핑</h4>
              <div className="space-y-3 max-h-96 overflow-auto">
                {["솔루션", "협력사", "벤더사", "계약금액"].map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-gray-700 mb-1">{field}</label>
                    <input
                      type="text"
                      className="form-input w-full px-3 py-2"
                      placeholder="클릭하여 매핑"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col space-y-2">
                <Button variant="outline" className="btn-secondary px-4 py-2 text-xs">
                  템플릿으로 저장
                </Button>
                <Button className="btn-primary px-4 py-2 text-xs">
                  데이터 추출
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
