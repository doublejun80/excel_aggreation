import { Router } from 'express';
import { db } from '../db';
import { templates, uploadedFiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { FileParser, TemplateMappingData } from '../services/file-parser';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// 파일에 템플릿 적용 및 미리보기
router.post('/apply-template', async (req, res) => {
  const { fileIds, templateId } = req.body;
  
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ message: '하나 이상의 파일 ID가 필요합니다.' });
  }
  
  if (!templateId) {
    return res.status(400).json({ message: '템플릿 ID가 필요합니다.' });
  }
  
  try {
    // 템플릿 정보 조회
    const templateResult = await db.select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);
    
    if (!templateResult || templateResult.length === 0) {
      return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' });
    }
    
    const template = templateResult[0];
    
    // 템플릿 매핑 데이터 파싱
    let mappingData: TemplateMappingData;
    try {
      mappingData = typeof template.mappingData === 'string'
        ? JSON.parse(template.mappingData)
        : template.mappingData;
    } catch (error) {
      return res.status(400).json({ message: '템플릿 매핑 데이터가 유효한 JSON 형식이 아닙니다.' });
    }
    
    // 업로드된 파일 정보 조회
    const filesResult = await db.select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, fileIds[0]))  // 현재 단계에서는 첫 번째 파일만 처리
      .limit(1);
    
    if (!filesResult || filesResult.length === 0) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }
    
    const file = filesResult[0];
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, file.name);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }
    
    // 파일 파싱
    const parsedData = await FileParser.parseFile(filePath, file.type);
    
    // 템플릿 적용
    const mappingResult = FileParser.applyTemplate(parsedData, mappingData);
    
    // 결과 반환
    res.json(mappingResult);
    
  } catch (error: any) {
    console.error('템플릿 적용 오류:', error);
    res.status(500).json({ message: `템플릿 적용 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 매핑된 데이터 DB에 저장
router.post('/save-quote-data', async (req, res) => {
  const { fileIds, templateId } = req.body;
  
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ message: '하나 이상의 파일 ID가 필요합니다.' });
  }
  
  if (!templateId) {
    return res.status(400).json({ message: '템플릿 ID가 필요합니다.' });
  }
  
  try {
    // 실제 DB 저장 로직은 quotes 테이블이 구현된 후 추가 예정
    // 현재는 성공 응답만 반환
    res.json({
      success: true,
      message: '견적 데이터가 성공적으로 저장되었습니다.',
      fileIds,
      templateId
    });
    
  } catch (error: any) {
    console.error('데이터 저장 오류:', error);
    res.status(500).json({ message: `데이터 저장 중 오류가 발생했습니다: ${error?.message}` });
  }
});

export default router;
