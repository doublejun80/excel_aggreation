import { Router } from 'express';
import { db } from './sqlite-storage';
import { quotes, templates } from '@shared/schema-sqlite';
import { eq, and, sql, count, desc, asc } from 'drizzle-orm';

const router = Router();

// 통계 개요: 총 견적 수, 파일 수, 템플릿 수 등 기본 통계 정보
router.get('/summary', async (req, res) => {
  try {
    // 총 견적 수 조회
    const quoteCountResult = await db.select({ count: db.fn.count() }).from(quotes);
    const quoteCount = Number(quoteCountResult[0].count);
    
    // 사용된 템플릿 수 조회
    const templateCountQuery = db.select({
      count: db.fn.countDistinct(quotes.templateId)
    }).from(quotes);
    const templateCountResult = await templateCountQuery;
    const templateCount = Number(templateCountResult[0].count);
    
    // 등록된 파일 수 조회
    const fileCountQuery = db.select({
      count: db.fn.countDistinct(quotes.fileId)
    }).from(quotes);
    const fileCountResult = await fileCountQuery;
    const fileCount = Number(fileCountResult[0].count);
    
    // 최근 견적 등록일
    const latestQuoteQuery = db
      .select({ createdAt: quotes.createdAt })
      .from(quotes)
      .orderBy(desc(quotes.createdAt))
      .limit(1);
    const latestQuoteResult = await latestQuoteQuery;
    const latestQuoteDate = latestQuoteResult[0]?.createdAt || null;
    
    res.json({
      quoteCount,
      templateCount,
      fileCount,
      latestQuoteDate
    });
  } catch (error: any) {
    console.error('통계 요약 조회 오류:', error);
    res.status(500).json({ message: `통계 요약을 조회하는 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 템플릿별 견적 수 통계
router.get('/by-template', async (req, res) => {
  try {
    const templateStatsQuery = db
      .select({
        templateId: quotes.templateId,
        count: db.fn.count(),
      })
      .from(quotes)
      .groupBy(quotes.templateId);
    
    const templateStats = await templateStatsQuery;
    
    // 템플릿 정보 조회
    const templatesQuery = db.select().from(templates);
    const templatesData = await templatesQuery;
    
    // 템플릿 ID를 이름과 매핑
    const templatesMap = templatesData.reduce((acc, template) => {
      acc[template.id] = template.name;
      return acc;
    }, {} as Record<number, string>);
    
    // 결과 변환
    const result = templateStats.map(stat => ({
      templateId: stat.templateId,
      templateName: templatesMap[stat.templateId] || `템플릿 #${stat.templateId}`,
      count: Number(stat.count)
    }));
    
    res.json(result);
  } catch (error: any) {
    console.error('템플릿별 통계 조회 오류:', error);
    res.status(500).json({ message: `템플릿별 통계를 조회하는 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 기간별 견적 등록 추이
router.get('/by-date', async (req, res) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    
    // 날짜 포맷 조건 설정 (일별, 주별, 월별)
    let dateFormat;
    if (period === 'month') {
      dateFormat = '%Y-%m';
    } else if (period === 'week') {
      // SQLite에서는 주 번호 추출이 복잡하므로 날짜 자체를 사용
      dateFormat = '%Y-%W';
    } else {
      dateFormat = '%Y-%m-%d';
    }
    
    // 날짜 필터링 조건 구성
    let whereConditions = [] as any[];
    if (startDate) {
      whereConditions.push(sql`${quotes.createdAt} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${quotes.createdAt} <= ${endDate}`);
    }
    
    // 쿼리 구성
    let query = db
      .select({
        date: sql`strftime(${dateFormat}, ${quotes.createdAt})`,
        count: db.fn.count(),
      })
      .from(quotes);
    
    // 조건 추가
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // 그룹화 및 정렬
    query = query.groupBy(sql`strftime(${dateFormat}, ${quotes.createdAt})`)
      .orderBy(asc(sql`strftime(${dateFormat}, ${quotes.createdAt})`));
    
    const result = await query;
    
    res.json(result.map(item => ({
      date: item.date,
      count: Number(item.count)
    })));
  } catch (error: any) {
    console.error('날짜별 통계 조회 오류:', error);
    res.status(500).json({ message: `날짜별 통계를 조회하는 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 견적 데이터 세부 항목 분석 (예: 특정 필드의 총합, 평균 등)
router.post('/data-analysis', async (req, res) => {
  try {
    const { field, operation, startDate, endDate, templateId } = req.body;
    
    if (!field || !operation) {
      return res.status(400).json({ message: '필드와 연산 유형이 필요합니다.' });
    }
    
    // 모든 견적 데이터를 가져옵니다
    let query = db.select().from(quotes);
    
    // 필터링 조건 적용
    let whereConditions = [] as any[];
    
    if (templateId) {
      whereConditions.push(eq(quotes.templateId, templateId));
    }
    
    if (startDate) {
      whereConditions.push(sql`${quotes.createdAt} >= ${startDate}`);
    }
    
    if (endDate) {
      whereConditions.push(sql`${quotes.createdAt} <= ${endDate}`);
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    const quotesData = await query;
    
    // 각 견적 데이터에서 필요한 필드 추출 및 연산 수행
    let values = [] as number[];
    
    quotesData.forEach(quote => {
      try {
        const data = JSON.parse(quote.data);
        // 중첩 필드 처리 (예: "customer.name")
        const fieldPath = field.split('.');
        let value = data;
        
        for (const path of fieldPath) {
          value = value?.[path];
          if (value === undefined || value === null) break;
        }
        
        // 숫자 값인 경우만 처리
        if (typeof value === 'number' || !isNaN(Number(value))) {
          values.push(Number(value));
        }
      } catch (e) {
        // 특정 견적의 데이터 처리 오류는 건너뜁니다
        console.warn('견적 데이터 처리 중 오류:', e);
      }
    });
    
    // 연산 수행
    let result;
    switch (operation) {
      case 'sum':
        result = values.reduce((sum, value) => sum + value, 0);
        break;
      case 'average':
        result = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        break;
      case 'min':
        result = values.length > 0 ? Math.min(...values) : null;
        break;
      case 'max':
        result = values.length > 0 ? Math.max(...values) : null;
        break;
      case 'count':
        result = values.length;
        break;
      default:
        return res.status(400).json({ message: '지원하지 않는 연산 유형입니다.' });
    }
    
    res.json({
      field,
      operation,
      result,
      sampleSize: values.length
    });
  } catch (error: any) {
    console.error('데이터 분석 오류:', error);
    res.status(500).json({ message: `데이터 분석 중 오류가 발생했습니다: ${error?.message}` });
  }
});

// 필드별 분포 통계
router.post('/field-distribution', async (req, res) => {
  try {
    const { field, templateId } = req.body;
    
    if (!field) {
      return res.status(400).json({ message: '분석할 필드가 필요합니다.' });
    }
    
    // 견적 데이터 조회
    let query = db.select().from(quotes);
    
    if (templateId) {
      query = query.where(eq(quotes.templateId, templateId));
    }
    
    const quotesData = await query;
    
    // 필드별 값 분포 분석
    const distribution: Record<string, number> = {};
    
    quotesData.forEach(quote => {
      try {
        const data = JSON.parse(quote.data);
        // 중첩 필드 처리
        const fieldPath = field.split('.');
        let value = data;
        
        for (const path of fieldPath) {
          value = value?.[path];
          if (value === undefined || value === null) break;
        }
        
        if (value !== undefined && value !== null) {
          const valueStr = String(value);
          distribution[valueStr] = (distribution[valueStr] || 0) + 1;
        }
      } catch (e) {
        console.warn('견적 데이터 처리 중 오류:', e);
      }
    });
    
    // 결과를 배열 형태로 변환
    const result = Object.entries(distribution).map(([value, count]) => ({ value, count }));
    
    // 빈도순 정렬
    result.sort((a, b) => b.count - a.count);
    
    res.json(result);
  } catch (error: any) {
    console.error('필드 분포 분석 오류:', error);
    res.status(500).json({ message: `필드 분포 분석 중 오류가 발생했습니다: ${error?.message}` });
  }
});

export const analyticsRouter = router;
