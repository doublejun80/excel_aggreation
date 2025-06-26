import React, { useState } from 'react';
import TemplateList from './TemplateList';
import TemplateEditor from './TemplateEditor';
import { Template } from '@shared/schema-sqlite';

export const TemplateManager: React.FC = () => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | undefined>(undefined);

  // 템플릿 편집 모드 진입
  const handleEditTemplate = (template: Template) => {
    setCurrentTemplate(template);
    setIsEditing(true);
  };

  // 새 템플릿 생성 모드 진입
  const handleCreateTemplate = () => {
    setCurrentTemplate(undefined);
    setIsEditing(true);
  };

  // 편집 모드 종료
  const handleCloseEditor = () => {
    setIsEditing(false);
    setCurrentTemplate(undefined);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {isEditing ? (
        <TemplateEditor 
          template={currentTemplate} 
          onClose={handleCloseEditor} 
        />
      ) : (
        <TemplateList 
          onEdit={handleEditTemplate}
          onCreateNew={handleCreateTemplate}
        />
      )}
    </div>
  );
};

export default TemplateManager;
