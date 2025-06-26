import { Router } from 'express';
import { db } from './sqlite-storage';
import { quotes, templates, uploadedFiles } from '@shared/schema-sqlite';
import { eq, and, desc, asc } from 'drizzle-orm';

const router = Router();

// 모든 견적 조회 (페이지네이션)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const orderBy = req.query.orderBy as string || 'createdAt';
    const order = req.query.order as string || 'desc';

    const sortField = order === 'desc' ? desc(quotes.createdAt) : asc(quotes.createdAt);
    
    const results = await db.select()
      .from(quotes)
      .limit(limit)
      .offset(offset)
      .orderBy(sortField);
    
    // 총 견적 수 조회
    const countResult = await db.select({ count: db.fn.count() }).from(quotes);
    const totalCount = Number(countResult[0].count);
    
    res.json({
      data: results,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });
  } catch (error: any) {
    console.error('견적 조회 오류:', error);
    res.status(500).json({ message: `견적 조회 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 특정 견적 조회
router.get('/:id', async (req, res) => {
  const quoteId = Number(req.params.id);
  
  if (isNaN(quoteId)) {
    return res.status(400).json({ message: '유효하지 않은 견적 ID입니다.' });
  }
  
  try {
    const quoteResult = await db.select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);
    
    if (!quoteResult || quoteResult.length === 0) {
      return res.status(404).json({ message: '견적을 찾을 수 없습니다.' });
    }
    
    const quote = quoteResult[0];
    
    // 템플릿과 파일 정보 조회
    const templateResult = await db.select()
      .from(templates)
      .where(eq(templates.id, quote.templateId))
      .limit(1);
    
    const fileResult = await db.select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, quote.fileId))
      .limit(1);
    
    // 결과 반환 (견적 데이터 파싱)
    const parsedData = JSON.parse(quote.data);
    res.json({
      ...quote,
      data: parsedData,
      template: templateResult[0] || null,
      file: fileResult[0] || null
    });
  } catch (error: any) {
    console.error('견적 조회 오류:', error);
    res.status(500).json({ message: `견적 조회 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 파일별 견적 조회
router.get('/by-file/:fileId', async (req, res) => {
  const fileId = Number(req.params.fileId);
  
  if (isNaN(fileId)) {
    return res.status(400).json({ message: '유효하지 않은 파일 ID입니다.' });
  }
  
  try {
    const results = await db.select()
      .from(quotes)
      .where(eq(quotes.fileId, fileId))
      .orderBy(desc(quotes.createdAt));
    
    // 각 견적의 데이터 파싱
    const parsedResults = results.map(quote => ({
      ...quote,
      data: JSON.parse(quote.data)
    }));
    
    res.json(parsedResults);
  } catch (error: any) {
    console.error('견적 조회 오류:', error);
    res.status(500).json({ message: `견적 조회 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 템플릿별 견적 조회
router.get('/by-template/:templateId', async (req, res) => {
  const templateId = Number(req.params.templateId);
  
  if (isNaN(templateId)) {
    return res.status(400).json({ message: '유효하지 않은 템플릿 ID입니다.' });
  }
  
  try {
    const results = await db.select()
      .from(quotes)
      .where(eq(quotes.templateId, templateId))
      .orderBy(desc(quotes.createdAt));
    
    // 각 견적의 데이터 파싱
    const parsedResults = results.map(quote => ({
      ...quote,
      data: JSON.parse(quote.data)
    }));
    
    res.json(parsedResults);
  } catch (error: any) {
    console.error('견적 조회 오류:', error);
    res.status(500).json({ message: `견적 조회 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 견적 검색
router.post('/search', async (req, res) => {
  const { keyword, startDate, endDate, templateId } = req.body;
  
  try {
    // 검색 조건 구성
    let query = db.select().from(quotes);
    
    if (templateId) {
      query = query.where(eq(quotes.templateId, templateId));
    }
    
    if (startDate && endDate) {
      // 날짜 필터링은 문자열 비교로 처리
      // (SQLite에서는 ISO 문자열 형식으로 저장된 날짜를 비교할 수 있음)
      query = query.where(
        and(
          db.sql`${quotes.createdAt} >= ${startDate}`,
          db.sql`${quotes.createdAt} <= ${endDate}`
        )
      );
    }
    
    const results = await query.orderBy(desc(quotes.createdAt));
    
    // 키워드 검색은 DB 쿼리로 하기 어려우므로 메모리에서 필터링
    let filteredResults = results;
    if (keyword) {
      filteredResults = results.filter(quote => {
        try {
          const data = JSON.parse(quote.data);
          const dataString = JSON.stringify(data).toLowerCase();
          return dataString.includes(keyword.toLowerCase());
        } catch (e) {
          return false;
        }
      });
    }
    
    // 각 견적의 데이터 파싱
    const parsedResults = filteredResults.map(quote => ({
      ...quote,
      data: JSON.parse(quote.data)
    }));
    
    res.json(parsedResults);
  } catch (error: any) {
    console.error('견적 검색 오류:', error);
    res.status(500).json({ message: `견적 검색 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 견적 삭제
router.delete('/:id', async (req, res) => {
  const quoteId = Number(req.params.id);
  
  if (isNaN(quoteId)) {
    return res.status(400).json({ message: '유효하지 않은 견적 ID입니다.' });
  }
  
  try {
    const result = await db.delete(quotes)
      .where(eq(quotes.id, quoteId))
      .returning();
    
    if (!result || result.length === 0) {
      return res.status(404).json({ message: '견적을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '견적이 삭제되었습니다.', id: quoteId });
  } catch (error: any) {
    console.error('견적 삭제 오류:', error);
    res.status(500).json({ message: `견적 삭제 중 오류가 발생했습니다: ${error?.message}` });
  }
});

export const quoteRouter = router;
