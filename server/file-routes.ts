import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { sqliteStorage } from './sqlite-storage';
import { 
  handleFileUpload, 
  extractDataFromFile, 
  applyTemplateMapping,
  exportToExcel,
  exportToCsv,
  type UploadedFileInfo 
} from './file-processor';

// 라우터 생성
export const fileRouter = express.Router();

// 파일 업로드 처리
fileRouter.post('/upload', async (req, res) => {
  try {
    // 파일 업로드 처리
    const files = await handleFileUpload(req);
    
    // 업로드된 각 파일을 데이터베이스에 등록
    const savedFiles = await Promise.all(files.map(async (file) => {
      const uploadedFile = await sqliteStorage.createUploadedFile({
        filename: file.originalFilename,
        size: file.size,
        status: 'pending',
        templateId: null // 아직 템플릿 미지정
      });
      
      return {
        ...uploadedFile,
        internalPath: file.path
      };
    }));
    
    res.status(200).json({ message: '파일 업로드 성공', files: savedFiles });
  } catch (error: any) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ error: `파일 업로드 실패: ${error?.message || '알 수 없는 오류'}` });
  }
});

// 파일에 템플릿 적용
fileRouter.post('/apply-template', async (req, res) => {
  try {
    const { fileId, templateId } = req.body;
    
    // 파일 정보 조회
    const fileInfo = await sqliteStorage.getUploadedFile(fileId);
    if (!fileInfo) {
      return res.status(404).json({ error: '파일을 찾을 수 없음' });
    }
    
    // 템플릿 정보 조회
    const template = await sqliteStorage.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없음' });
    }
    
    // 파일 상태 업데이트
    await sqliteStorage.updateUploadedFile(fileId, {
      status: 'processing',
      templateId
    });
    
    // 파일 경로 구성
    const filePath = path.join(process.cwd(), 'uploads', fileInfo.filename);
    
    // 파일 데이터 추출
    const fileData = await extractDataFromFile({
      id: fileId.toString(),
      originalFilename: fileInfo.filename,
      path: filePath,
      size: fileInfo.size,
      type: path.extname(fileInfo.filename).toLowerCase().substring(1) as any
    });
    
    // 템플릿 매핑 적용
    const mappedData = applyTemplateMapping(fileData, template.mappingData);
    
    // 견적서 데이터로 저장
    const quotation = await sqliteStorage.createQuotation({
      quotationId: mappedData.quotationId || `QT-${Date.now()}`,
      solution: mappedData.solution || null,
      category: mappedData.category || null,
      partner: mappedData.partner || null,
      vendor: mappedData.vendor || null,
      mainProduct: mappedData.mainProduct || null,
      quantity: mappedData.quantity || null,
      consumerPrice: mappedData.consumerPrice || null,
      contractAmount: mappedData.contractAmount || null,
      savingsAmount: mappedData.savingsAmount || null,
      freeMaintenancePeriod: mappedData.freeMaintenancePeriod || null,
      vendorContact: mappedData.vendorContact || null,
      vendorEmail: mappedData.vendorEmail || null,
      partnerContact: mappedData.partnerContact || null,
      partnerEmail: mappedData.partnerEmail || null,
      specialNotes: mappedData.specialNotes || null
    });
    
    // 파일 상태 업데이트
    await sqliteStorage.updateUploadedFile(fileId, {
      status: 'completed'
    });
    
    res.status(200).json({ 
      message: '템플릿 적용 성공', 
      quotation,
      mappedData 
    });
  } catch (error: any) {
    console.error('템플릿 적용 오류:', error);
    
    // 오류 시 파일 상태 업데이트
    if (req.body.fileId) {
      await sqliteStorage.updateUploadedFile(req.body.fileId, {
        status: 'failed'
      });
    }
    
    res.status(500).json({ error: `템플릿 적용 실패: ${error?.message || '알 수 없는 오류'}` });
  }
});

// 데이터 내보내기 - Excel
fileRouter.post('/export/excel', async (req, res) => {
  try {
    const { ids, filename = '견적서_데이터.xlsx' } = req.body;
    
    // 견적서 데이터 조회
    let quotations = [];
    
    if (Array.isArray(ids) && ids.length > 0) {
      // 지정된 ID의 견적서만 내보내기
      quotations = await Promise.all(ids.map(id => sqliteStorage.getQuotation(id)));
      quotations = quotations.filter(Boolean); // null/undefined 제거
    } else {
      // 전체 견적서 내보내기
      quotations = await sqliteStorage.getQuotations();
    }
    
    if (quotations.length === 0) {
      return res.status(404).json({ error: '내보낼 데이터가 없습니다' });
    }
    
    // Excel 파일로 내보내기
    const filePath = exportToExcel(quotations, filename);
    
    // 파일 다운로드 제공
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('파일 다운로드 오류:', err);
        return res.status(500).send('파일 다운로드 실패');
      }
      
      // 다운로드 후 임시 파일 삭제
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('임시 파일 삭제 오류:', unlinkErr);
      });
    });
  } catch (error: any) {
    console.error('Excel 내보내기 오류:', error);
    res.status(500).json({ error: `Excel 내보내기 실패: ${error?.message || '알 수 없는 오류'}` });
  }
});

// 데이터 내보내기 - CSV
fileRouter.post('/export/csv', async (req, res) => {
  try {
    const { ids, filename = '견적서_데이터.csv' } = req.body;
    
    // 견적서 데이터 조회
    let quotations = [];
    
    if (Array.isArray(ids) && ids.length > 0) {
      // 지정된 ID의 견적서만 내보내기
      quotations = await Promise.all(ids.map(id => sqliteStorage.getQuotation(id)));
      quotations = quotations.filter(Boolean); // null/undefined 제거
    } else {
      // 전체 견적서 내보내기
      quotations = await sqliteStorage.getQuotations();
    }
    
    if (quotations.length === 0) {
      return res.status(404).json({ error: '내보낼 데이터가 없습니다' });
    }
    
    // CSV 파일로 내보내기
    const filePath = exportToCsv(quotations, filename);
    
    // 파일 다운로드 제공
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('파일 다운로드 오류:', err);
        return res.status(500).send('파일 다운로드 실패');
      }
      
      // 다운로드 후 임시 파일 삭제
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('임시 파일 삭제 오류:', unlinkErr);
      });
    });
  } catch (error: any) {
    console.error('CSV 내보내기 오류:', error);
    res.status(500).json({ error: `CSV 내보내기 실패: ${error?.message || '알 수 없는 오류'}` });
  }
});

// PDF 내보내기는 pdfkit 등의 라이브러리를 설치한 후 구현 필요

// 파일 목록 조회
fileRouter.get('/files', async (req, res) => {
  try {
    const files = await sqliteStorage.getUploadedFiles();
    res.status(200).json(files);
  } catch (error) {
    console.error('파일 목록 조회 오류:', error);
    res.status(500).json({ error: '파일 목록 조회 실패' });
  }
});

// 단일 파일 조회
fileRouter.get('/files/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await sqliteStorage.getUploadedFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: '파일을 찾을 수 없음' });
    }
    
    res.status(200).json(file);
  } catch (error) {
    console.error('파일 조회 오류:', error);
    res.status(500).json({ error: '파일 조회 실패' });
  }
});
