import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Template } from '@shared/schema-sqlite';

interface UploadedFile {
  id: number;
  name: string;
  originalName: string;
  size: number;
  type: string;
  status: 'uploaded' | 'mapped' | 'error';
  createdAt: string;
  message?: string;
}

interface MappingPreview {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  mappedRows: number;
  errorRows: number;
}

// API 호출 함수
const fetchTemplates = async (): Promise<Template[]> => {
  const res = await fetch('/api/templates');
  if (!res.ok) {
    throw new Error('템플릿 목록을 가져오는데 실패했습니다.');
  }
  return res.json();
};

const uploadFile = async (formData: FormData): Promise<UploadedFile[]> => {
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '파일 업로드에 실패했습니다.');
  }
  
  return res.json();
};

const applyTemplate = async (fileIds: number[], templateId: number): Promise<MappingPreview> => {
  const res = await fetch('/api/apply-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileIds, templateId })
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '템플릿 적용에 실패했습니다.');
  }
  
  return res.json();
};

const saveQuoteData = async (fileIds: number[], templateId: number): Promise<{ success: boolean, message: string }> => {
  const res = await fetch('/api/save-quote-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileIds, templateId })
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '견적 데이터 저장에 실패했습니다.');
  }
  
  return res.json();
};

export const QuoteUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<MappingPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  
  // 템플릿 목록 조회
  const { 
    data: templates, 
    isLoading: isLoadingTemplates 
  } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });
  
  // 파일 업로드 뮤테이션
  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (data) => {
      setUploadedFiles(prev => [...prev, ...data]);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // 템플릿 적용 뮤테이션
  const applyTemplateMutation = useMutation({
    mutationFn: ({ fileIds, templateId }: { fileIds: number[], templateId: number }) => 
      applyTemplate(fileIds, templateId),
    onSuccess: (data) => {
      setPreviewData(data);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
      setPreviewData(null);
    }
  });
  
  // 견적 데이터 저장 뮤테이션
  const saveDataMutation = useMutation({
    mutationFn: ({ fileIds, templateId }: { fileIds: number[], templateId: number }) => 
      saveQuoteData(fileIds, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setError(null);
      setUploadedFiles([]);
      setPreviewData(null);
      // 성공 메시지 표시 로직
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // 파일 선택 처리
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  // 파일 변경 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    uploadMutation.mutate(formData);
    
    // 입력 필드 초기화 (같은 파일 재업로드 가능하게)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 템플릿 적용 처리
  const handleApplyTemplate = () => {
    if (!selectedTemplateId || uploadedFiles.length === 0) {
      setError('템플릿과 파일을 모두 선택해주세요.');
      return;
    }
    
    const fileIds = uploadedFiles.map(file => file.id);
    applyTemplateMutation.mutate({ fileIds, templateId: selectedTemplateId });
  };
  
  // 견적 데이터 저장 처리
  const handleSaveData = () => {
    if (!selectedTemplateId || uploadedFiles.length === 0) {
      setError('템플릿과 파일을 모두 선택해주세요.');
      return;
    }
    
    const fileIds = uploadedFiles.map(file => file.id);
    saveDataMutation.mutate({ fileIds, templateId: selectedTemplateId });
  };
  
  // 파일 제거 처리
  const handleRemoveFile = (id: number) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
    
    // 모든 파일이 제거되면 미리보기 데이터도 초기화
    if (uploadedFiles.length <= 1) {
      setPreviewData(null);
    }
  };
  
  // 파일 형식에 따른 아이콘 반환
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('xlsx') || fileType.includes('xls')) {
      return '📊';
    } else if (fileType.includes('pdf')) {
      return '📝';
    } else if (fileType.includes('csv')) {
      return '📋';
    }
    return '📄';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6 dark:text-white">견적서 업로드</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* 파일 업로드 영역 */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".xlsx,.xls,.csv,.pdf"
            className="hidden"
          />
          
          <div 
            onClick={handleFileSelect}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors dark:border-gray-600 dark:hover:border-blue-400"
          >
            <div className="text-4xl mb-2">📤</div>
            <p className="text-gray-700 dark:text-gray-300">
              파일을 선택하거나 여기에 끌어다 놓으세요
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              지원 형식: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf)
            </p>
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              파일 선택
            </button>
          </div>
          
          {uploadMutation.isPending && (
            <div className="mt-4 text-center">
              <p className="text-gray-700 dark:text-gray-300">파일 업로드 중...</p>
            </div>
          )}
        </div>
        
        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2 dark:text-white">업로드된 파일</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getFileIcon(file.type)}</span>
                    <div>
                      <p className="text-gray-900 dark:text-white">{file.originalName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 템플릿 선택 */}
        {uploadedFiles.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2 dark:text-white">템플릿 선택</h3>
            <div className="relative">
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(Number(e.target.value) || null)}
                className="w-full p-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">템플릿을 선택하세요</option>
                {templates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {isLoadingTemplates && (
                <div className="absolute right-2 top-2">
                  <span className="text-gray-400">로딩 중...</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId || applyTemplateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {applyTemplateMutation.isPending ? '템플릿 적용 중...' : '템플릿 적용 및 미리보기'}
              </button>
              
              {previewData && (
                <button
                  onClick={handleSaveData}
                  disabled={saveDataMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                >
                  {saveDataMutation.isPending ? '저장 중...' : '견적 데이터 저장'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* 매핑 결과 미리보기 */}
        {previewData && (
          <div>
            <h3 className="text-lg font-medium mb-2 dark:text-white">매핑 결과 미리보기</h3>
            
            <div className="mb-4">
              <div className="flex space-x-4 text-sm">
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                  <span className="font-medium dark:text-white">총 행: </span>
                  <span className="dark:text-gray-300">{previewData.totalRows}</span>
                </div>
                <div className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded">
                  <span className="font-medium text-green-800 dark:text-green-200">매핑됨: </span>
                  <span className="text-green-700 dark:text-green-300">{previewData.mappedRows}</span>
                </div>
                {previewData.errorRows > 0 && (
                  <div className="bg-red-100 dark:bg-red-900 px-3 py-1 rounded">
                    <span className="font-medium text-red-800 dark:text-red-200">오류: </span>
                    <span className="text-red-700 dark:text-red-300">{previewData.errorRows}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th 
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {previewData.rows.slice(0, 10).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {previewData.headers.map((header, cellIndex) => (
                        <td 
                          key={`${rowIndex}-${cellIndex}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                        >
                          {row[header] !== undefined ? String(row[header]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {previewData.rows.length > 10 && (
              <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                처음 10개 행만 표시됩니다. 전체 {previewData.rows.length}개 행이 있습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteUpload;
