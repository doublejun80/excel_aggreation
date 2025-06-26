import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Template } from '@shared/schema-sqlite';

// 파일 상태 정의
type FileStatus = 'idle' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';

// 업로드된 파일 타입 정의
interface UploadedFile {
  id: number;
  filename: string;
  size: number;
  status: string;
  templateId: number | null;
  uploadedAt: string | null;
}

// API 호출 함수
const fetchTemplates = async (): Promise<Template[]> => {
  const res = await fetch('/api/templates');
  if (!res.ok) {
    throw new Error('템플릿을 불러오는데 실패했습니다.');
  }
  return res.json();
};

const uploadFiles = async (formData: FormData): Promise<{ files: UploadedFile[] }> => {
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '파일 업로드에 실패했습니다.');
  }
  
  return res.json();
};

const applyTemplate = async ({ 
  fileId, 
  templateId 
}: { 
  fileId: number; 
  templateId: number 
}): Promise<any> => {
  const res = await fetch('/api/files/apply-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId, templateId }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '템플릿 적용에 실패했습니다.');
  }
  
  return res.json();
};

// 파일 업로드 컴포넌트
export const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<Record<number, FileStatus>>({});
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // 템플릿 목록 조회
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
  });
  
  // 파일 업로드 뮤테이션
  const uploadMutation = useMutation({
    mutationFn: uploadFiles,
    onSuccess: (data) => {
      setUploadedFiles(data.files);
      
      // 파일 상태 초기화
      const newStatus: Record<number, FileStatus> = {};
      data.files.forEach((file) => {
        newStatus[file.id] = file.status as FileStatus;
      });
      setProcessingStatus(newStatus);
      
      // 파일 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
  
  // 템플릿 적용 뮤테이션
  const applyTemplateMutation = useMutation({
    mutationFn: applyTemplate,
    onSuccess: (data, variables) => {
      setProcessingStatus(prev => ({
        ...prev,
        [variables.fileId]: 'completed'
      }));
      
      // 견적서 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (error: Error, variables) => {
      setProcessingStatus(prev => ({
        ...prev,
        [variables.fileId]: 'failed'
      }));
      setError(error.message);
    },
  });
  
  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
    }
  };
  
  // 파일 업로드 핸들러
  const handleUpload = async () => {
    if (files.length === 0) {
      setError('업로드할 파일을 선택해주세요.');
      return;
    }
    
    setError(null);
    
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    try {
      uploadMutation.mutate(formData);
    } catch (err: any) {
      setError(err.message || '파일 업로드에 실패했습니다.');
    }
  };
  
  // 템플릿 적용 핸들러
  const handleApplyTemplate = async (fileId: number) => {
    if (!selectedTemplateId) {
      setError('템플릿을 선택해주세요.');
      return;
    }
    
    setError(null);
    setProcessingStatus(prev => ({
      ...prev,
      [fileId]: 'processing'
    }));
    
    try {
      applyTemplateMutation.mutate({ 
        fileId, 
        templateId: selectedTemplateId 
      });
    } catch (err: any) {
      setError(err.message || '템플릿 적용에 실패했습니다.');
      setProcessingStatus(prev => ({
        ...prev,
        [fileId]: 'failed'
      }));
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">견적서 업로드</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          파일 선택
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        <p className="text-xs text-gray-500 mt-1">
          지원 파일: Excel(.xlsx, .xls), CSV(.csv), PDF(.pdf)
        </p>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploadMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {uploadMutation.isPending ? '업로드 중...' : '파일 업로드'}
        </button>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2 dark:text-white">업로드된 파일</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              템플릿 선택
            </label>
            <select
              value={selectedTemplateId || ''}
              onChange={(e) => setSelectedTemplateId(e.target.value ? parseInt(e.target.value) : null)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">템플릿 선택...</option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">파일명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">크기</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {uploadedFiles.map((file) => (
                  <tr key={file.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{file.filename}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {(file.size / 1024).toFixed(2)} KB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${processingStatus[file.id] === 'completed' ? 'bg-green-100 text-green-800' : 
                          processingStatus[file.id] === 'failed' ? 'bg-red-100 text-red-800' : 
                          processingStatus[file.id] === 'processing' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {processingStatus[file.id] === 'completed' ? '완료' : 
                          processingStatus[file.id] === 'failed' ? '실패' : 
                          processingStatus[file.id] === 'processing' ? '처리중' : 
                          '대기중'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleApplyTemplate(file.id)}
                        disabled={!selectedTemplateId || processingStatus[file.id] === 'processing' || processingStatus[file.id] === 'completed'}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:text-gray-400"
                      >
                        템플릿 적용
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
