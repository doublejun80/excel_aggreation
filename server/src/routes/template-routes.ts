import { Router } from 'express';
import { db } from '../db';
import { templates } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// 모든 템플릿 조회
router.get('/', async (req, res) => {
  try {
    const allTemplates = await db.select().from(templates).orderBy(templates.createdAt);
    res.json(allTemplates);
  } catch (error: any) {
    console.error('템플릿 조회 오류:', error);
    res.status(500).json({ message: `템플릿 조회 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 특정 템플릿 조회
router.get('/:id', async (req, res) => {
  const templateId = Number(req.params.id);
  
  if (isNaN(templateId)) {
    return res.status(400).json({ message: '유효하지 않은 템플릿 ID입니다.' });
  }
  
  try {
    const template = await db.select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);
    
    if (!template || template.length === 0) {
      return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' });
    }
    
    res.json(template[0]);
  } catch (error: any) {
    console.error('템플릿 조회 오류:', error);
    res.status(500).json({ message: `템플릿 조회 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 새 템플릿 생성
router.post('/', async (req, res) => {
  const { name, mappingData } = req.body;
  
  if (!name || !mappingData) {
    return res.status(400).json({ message: '템플릿 이름과 매핑 데이터가 필요합니다.' });
  }
  
  try {
    // 매핑 데이터가 유효한 JSON인지 확인
    let parsedMapping;
    if (typeof mappingData === 'string') {
      try {
        parsedMapping = JSON.parse(mappingData);
      } catch (e) {
        return res.status(400).json({ message: '매핑 데이터가 유효한 JSON 형식이 아닙니다.' });
      }
    } else {
      parsedMapping = mappingData;
    }
    
    const serializedMapping = typeof mappingData === 'string' 
      ? mappingData 
      : JSON.stringify(mappingData);
    
    const result = await db.insert(templates).values({
      name,
      mappingData: serializedMapping,
      createdAt: new Date().toISOString()
    }).returning();
    
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('템플릿 생성 오류:', error);
    res.status(500).json({ message: `템플릿 생성 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 템플릿 업데이트
router.put('/:id', async (req, res) => {
  const templateId = Number(req.params.id);
  const { name, mappingData } = req.body;
  
  if (isNaN(templateId)) {
    return res.status(400).json({ message: '유효하지 않은 템플릿 ID입니다.' });
  }
  
  if (!name || !mappingData) {
    return res.status(400).json({ message: '템플릿 이름과 매핑 데이터가 필요합니다.' });
  }
  
  try {
    // 매핑 데이터가 유효한 JSON인지 확인
    if (typeof mappingData === 'string') {
      try {
        JSON.parse(mappingData);
      } catch (e) {
        return res.status(400).json({ message: '매핑 데이터가 유효한 JSON 형식이 아닙니다.' });
      }
    }
    
    const serializedMapping = typeof mappingData === 'string' 
      ? mappingData 
      : JSON.stringify(mappingData);
    
    const result = await db.update(templates)
      .set({
        name,
        mappingData: serializedMapping,
        updatedAt: new Date().toISOString()
      })
      .where(eq(templates.id, templateId))
      .returning();
    
    if (!result || result.length === 0) {
      return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' });
    }
    
    res.json(result[0]);
  } catch (error: any) {
    console.error('템플릿 업데이트 오류:', error);
    res.status(500).json({ message: `템플릿 업데이트 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 템플릿 삭제
router.delete('/:id', async (req, res) => {
  const templateId = Number(req.params.id);
  
  if (isNaN(templateId)) {
    return res.status(400).json({ message: '유효하지 않은 템플릿 ID입니다.' });
  }
  
  try {
    const result = await db.delete(templates)
      .where(eq(templates.id, templateId))
      .returning();
    
    if (!result || result.length === 0) {
      return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '템플릿이 삭제되었습니다.', id: templateId });
  } catch (error: any) {
    console.error('템플릿 삭제 오류:', error);
    res.status(500).json({ message: `템플릿 삭제 중 오류가 발생했습니다: ${error?.message}` });
  }
});

export default router;
