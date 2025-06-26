import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Template } from '@shared/schema-sqlite';

interface TemplateFormData {
  name: string;
  mappingData: string;
}

// API 호출 함수
const createTemplate = async (template: TemplateFormData): Promise<Template> => {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || '템플릿 생성에 실패했습니다.');
  }
  
  return res.json();
};

const updateTemplate = async (id: number, template: TemplateFormData): Promise<Template> => {
  const res = await fetch(`/api/templates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || '템플릿 업데이트에 실패했습니다.');
  }
  
  return res.json();
};

// 템플릿 에디터 컴포넌트
export const TemplateEditor: React.FC<{
  template?: Template;
  onClose: () => void;
}> = ({ template, onClose }) => {
  const isNew = !template || template.id === 0;
  const [formData, setFormData] = useState<TemplateFormData>({
    name: template?.name || '',
    mappingData: template?.mappingData || JSON.stringify(defaultMappingTemplate(), null, 2),
  });
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // 템플릿 생성/수정 뮤테이션
  const saveMutation = useMutation({
    mutationFn: isNew 
      ? () => createTemplate(formData)
      : () => updateTemplate(template!.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // 입력 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // JSON 형식 검증 (mappingData의 경우)
    if (name === 'mappingData') {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`JSON 형식 오류: ${err.message}`);
      }
    }
  };
  
  // 템플릿 저장
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      setError('템플릿 이름을 입력해주세요.');
      return;
    }
    
    // JSON 형식 검증
    try {
      JSON.parse(formData.mappingData);
    } catch (err) {
      setError('유효한 JSON 형식이 아닙니다. 매핑 데이터를 확인해주세요.');
      return;
    }
    
    setError(null);
    saveMutation.mutate();
  };
  
  // 기본 매핑 템플릿 생성
  function defaultMappingTemplate() {
    return {
      fileType: "excel", // 'excel', 'csv', 'pdf'
      skipRows: 0,       // 매핑 전 건너뛸 행 수
      columns: [
        {
          name: "견적ID",
          sourceColumn: "A",  // Excel/CSV의 열 (A, B, C...) 또는 PDF의 정규식 패턴
          required: true,     // 필수 여부
          dataType: "string"  // 데이터 타입 (string, number, date)
        },
        {
          name: "솔루션",
          sourceColumn: "B", 
          required: false,
          dataType: "string"
        },
        {
          name: "카테고리",
          sourceColumn: "C",
          required: false,
          dataType: "string"
        }
      ],
      // PDF 전용 설정 (PDF 파일 타입인 경우)
      pdfSettings: {
        patterns: {
          "견적ID": "견적번호[\\s]*:?[\\s]*(\\S+)",
          "솔루션": "솔루션[\\s]*:?[\\s]*(\\S+)",
          "카테고리": "카테고리[\\s]*:?[\\s]*(\\S+)"
        }
      }
    };
  }
  
  // 예제 데이터 불러오기
  const loadExampleTemplate = () => {
    setFormData(prev => ({
      ...prev,
      mappingData: JSON.stringify(defaultMappingTemplate(), null, 2)
    }));
    setJsonError(null);
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">
            {isNew ? '새 템플릿 만들기' : '템플릿 수정'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              템플릿 이름
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="템플릿 이름을 입력하세요"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                매핑 데이터 (JSON)
              </label>
              <button
                type="button"
                onClick={loadExampleTemplate}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
              >
                예제 템플릿 불러오기
              </button>
            </div>
            <textarea
              name="mappingData"
              value={formData.mappingData}
              onChange={handleChange}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="JSON 형식의 매핑 데이터를 입력하세요"
            />
            {jsonError && (
              <div className="mt-1 text-sm text-red-600">
                {jsonError}
              </div>
            )}
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <p>매핑 데이터는 파일 형식에 따른 필드 매핑 정보를 포함해야 합니다.</p>
              <p>Excel/CSV: 열 지정은 A, B, C... 형식으로 입력하세요.</p>
              <p>PDF: 정규식 패턴을 사용하여 데이터를 추출할 수 있습니다.</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!!jsonError || saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateEditor;
