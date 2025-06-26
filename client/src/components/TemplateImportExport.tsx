import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { save, open } from '@tauri-apps/api/dialog';
import { Template } from '@shared/schema-sqlite';

// API 호출 함수
const importTemplate = async (templateData: string): Promise<Template> => {
  try {
    const parsedData = JSON.parse(templateData);
    
    // 필수 필드 검증
    if (!parsedData.name || !parsedData.mappingData) {
      throw new Error('유효하지 않은 템플릿 형식입니다. 이름과 매핑 데이터가 필요합니다.');
    }
    
    // 서버에 템플릿 생성 요청
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: parsedData.name,
        mappingData: typeof parsedData.mappingData === 'string' 
          ? parsedData.mappingData 
          : JSON.stringify(parsedData.mappingData)
      }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || '템플릿 가져오기에 실패했습니다.');
    }
    
    return await res.json();
  } catch (err: any) {
    throw new Error(`템플릿 가져오기 오류: ${err.message}`);
  }
};

interface TemplateImportExportProps {
  templates: Template[];
  onSuccess: () => void;
}

export const TemplateImportExport: React.FC<TemplateImportExportProps> = ({ 
  templates,
  onSuccess 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  
  // 템플릿 가져오기 뮤테이션
  const importMutation = useMutation({
    mutationFn: importTemplate,
    onSuccess: () => {
      setSuccess('템플릿을 성공적으로 가져왔습니다.');
      setTimeout(() => setSuccess(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // 템플릿 파일 내보내기
  const handleExport = async (template: Template) => {
    try {
      // 내보낼 데이터 준비
      const exportData = {
        name: template.name,
        mappingData: typeof template.mappingData === 'string' 
          ? JSON.parse(template.mappingData) 
          : template.mappingData
      };
      
      // 저장 대화상자 열기 (Tauri API 사용)
      const savePath = await save({
        filters: [{
          name: 'JSON 파일',
          extensions: ['json']
        }],
        defaultPath: `${template.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`
      });
      
      if (savePath) {
        // Rust 함수를 호출하여 파일 저장 (Tauri 명령 사용)
        await invoke('save_file_content', {
          path: savePath,
          content: JSON.stringify(exportData, null, 2)
        });
        
        setSuccess('템플릿을 성공적으로 내보냈습니다.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(`템플릿 내보내기 실패: ${err.message}`);
    }
  };
  
  // 템플릿 파일 가져오기 (파일 선택)
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 템플릿 파일 가져오기 (Tauri API 사용)
  const handleImportTauriFile = async () => {
    try {
      setError(null);
      
      // 파일 선택 대화상자 열기
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'JSON 파일',
          extensions: ['json']
        }]
      });
      
      if (selected && typeof selected === 'string') {
        // 선택한 파일 내용 읽기
        const content = await invoke('read_file_content', {
          path: selected
        }) as string;
        
        // 템플릿 가져오기
        importMutation.mutate(content);
      }
    } catch (err: any) {
      setError(`파일 읽기 실패: ${err.message}`);
    }
  };
  
  // 웹 환경에서 파일 가져오기 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        importMutation.mutate(content);
      } catch (err: any) {
        setError(`파일 읽기 실패: ${err.message}`);
      }
    };
    
    reader.onerror = () => {
      setError('파일 읽기에 실패했습니다.');
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{success}</p>
        </div>
      )}
      
      <div className="flex space-x-2 mb-4">
        {/* 웹 환경용 파일 입력 (숨김) */}
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <button
          onClick={handleImportClick}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          템플릿 가져오기 (웹)
        </button>
        
        <button
          onClick={handleImportTauriFile}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          템플릿 가져오기 (Tauri)
        </button>
      </div>
      
      {templates && templates.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-2 dark:text-white">템플릿 내보내기</h3>
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <span className="text-gray-900 dark:text-white">{template.name}</span>
                <button
                  onClick={() => handleExport(template)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  내보내기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateImportExport;
