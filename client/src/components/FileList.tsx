import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { downloadDir } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/api/dialog';

interface UploadedFile {
  id: number;
  filename: string;
  size: number;
  status: string;
  templateId: number | null;
  uploadedAt: string | null;
}

interface ExportOptions {
  format: 'excel' | 'csv';
  fileIds: number[];
}

// API 호출 함수
const fetchFiles = async (): Promise<UploadedFile[]> => {
  const res = await fetch('/api/files/files');
  if (!res.ok) {
    throw new Error('파일 목록을 불러오는데 실패했습니다.');
  }
  return res.json();
};

const exportFiles = async ({ format, fileIds }: ExportOptions): Promise<string> => {
  try {
    // Tauri API를 통해 저장 대화상자 열기
    const savePath = await save({
      filters: [{
        name: format === 'excel' ? 'Excel 파일' : 'CSV 파일',
        extensions: [format === 'excel' ? 'xlsx' : 'csv']
      }]
    });
    
    if (!savePath) return ''; // 사용자가 취소함
    
    // 서버 API 호출을 위한 URL 생성
    const endpoint = format === 'excel' ? '/api/files/export/excel' : '/api/files/export/csv';
    
    // Tauri invoke로 파일 다운로드 및 저장 처리
    // Rust 함수 호출 (아직 구현되지 않음)
    const result = await invoke('download_and_save_file', {
      url: `${window.location.origin}${endpoint}`,
      savePath,
      fileIds,
      method: 'POST'
    });
    
    return savePath;
  } catch (error: any) {
    console.error('파일 내보내기 오류:', error);
    throw new Error(`파일 내보내기 실패: ${error.message}`);
  }
};

export const FileList: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // 파일 목록 조회
  const { data: files, isLoading, isError } = useQuery({
    queryKey: ['files'],
    queryFn: fetchFiles
  });
  
  // 파일 내보내기 뮤테이션
  const exportMutation = useMutation({
    mutationFn: exportFiles,
    onSuccess: (data) => {
      if (data) {
        setExportSuccess(`파일이 성공적으로 저장되었습니다: ${data}`);
      }
      setTimeout(() => setExportSuccess(null), 5000); // 5초 후 메시지 숨김
    },
    onError: (error: Error) => {
      setError(error.message);
      setTimeout(() => setError(null), 5000); // 5초 후 에러 메시지 숨김
    }
  });
  
  // 파일 선택 처리
  const handleSelectFile = (id: number) => {
    setSelectedFiles((prev) => {
      if (prev.includes(id)) {
        return prev.filter((fileId) => fileId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // 전체 선택/해제 처리
  const handleSelectAll = (checked: boolean) => {
    if (checked && files) {
      setSelectedFiles(files.map(file => file.id));
    } else {
      setSelectedFiles([]);
    }
  };
  
  // 내보내기 처리
  const handleExport = () => {
    if (selectedFiles.length === 0) {
      setError('내보낼 파일을 선택해주세요.');
      return;
    }
    
    exportMutation.mutate({
      format: exportFormat,
      fileIds: selectedFiles
    });
  };
  
  // 로컬 폴더 열기 - Tauri 네이티브 대화상자 사용
  const handleOpenFolder = async () => {
    try {
      // Tauri API를 통해 폴더 선택 대화상자 열기
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: await downloadDir()
      });
      
      if (selected) {
        // Tauri invoke로 선택한 폴더 열기
        await invoke('open_folder', { path: selected });
      }
    } catch (err: any) {
      console.error('폴더 열기 오류:', err);
      setError(`폴더 열기 실패: ${err.message}`);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-32">로딩 중...</div>;
  }
  
  if (isError) {
    return <div className="text-red-500">파일 목록을 불러오는데 실패했습니다.</div>;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">업로드된 파일 목록</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {exportSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{exportSuccess}</p>
        </div>
      )}
      
      <div className="mb-4 flex items-center gap-4">
        <div>
          <label className="inline-flex items-center">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'excel' | 'csv')}
              className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </label>
        </div>
        
        <button
          onClick={handleExport}
          disabled={selectedFiles.length === 0 || exportMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
        >
          {exportMutation.isPending ? '내보내는 중...' : '내보내기'}
        </button>
        
        <button
          onClick={handleOpenFolder}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
        >
          폴더 열기
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={files && selectedFiles.length === files.length && files.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">파일명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">크기</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">업로드 일시</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {files && files.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => handleSelectFile(file.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{file.filename}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {(file.size / 1024).toFixed(2)} KB
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${file.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      file.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      file.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {file.status === 'completed' ? '완료' : 
                      file.status === 'failed' ? '실패' : 
                      file.status === 'processing' ? '처리중' : 
                      file.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
            {files && files.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  업로드된 파일이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileList;
