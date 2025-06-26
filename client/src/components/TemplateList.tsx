import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Template } from '@shared/schema-sqlite';

// API 호출 함수
const fetchTemplates = async (): Promise<Template[]> => {
  const res = await fetch('/api/templates');
  if (!res.ok) {
    throw new Error('템플릿을 불러오는데 실패했습니다.');
  }
  return res.json();
};

const deleteTemplate = async (id: number): Promise<void> => {
  const res = await fetch(`/api/templates/${id}`, {
    method: 'DELETE',
  });
  
  if (!res.ok) {
    throw new Error('템플릿을 삭제하는데 실패했습니다.');
  }
};

// 템플릿 목록 컴포넌트
export const TemplateList: React.FC<{
  onEdit: (template: Template) => void;
  onCreateNew: () => void;
}> = ({ onEdit, onCreateNew }) => {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // 템플릿 목록 조회
  const { 
    data: templates, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });
  
  // 템플릿 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // 템플릿 삭제 처리
  const handleDelete = (id: number) => {
    if (window.confirm('이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate(id);
    }
  };
  
  // 템플릿 복제 처리
  const handleClone = (template: Template) => {
    onEdit({
      ...template,
      id: 0,  // id를 0으로 설정하여 새 템플릿으로 인식하게 함
      name: `${template.name} (복사본)`
    });
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-32">로딩 중...</div>;
  }
  
  if (isError) {
    return <div className="text-red-500">템플릿 목록을 불러오는데 실패했습니다.</div>;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">템플릿 관리</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          새 템플릿 만들기
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {templates && templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>등록된 템플릿이 없습니다.</p>
          <p className="mt-2">새 템플릿을 만들어 견적서 형식을 등록해보세요.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">생성일</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {templates?.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {template.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {template.createdAt 
                      ? new Date(template.createdAt).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <button
                      onClick={() => onEdit(template)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleClone(template)}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                    >
                      복제
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TemplateList;
