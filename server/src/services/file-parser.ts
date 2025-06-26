import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { PDFExtract } from 'pdf.js-extract';

// 파싱된 파일 데이터 인터페이스
export interface ParsedFileData {
  headers: string[];
  rows: any[];
  metadata: {
    totalRows: number;
    type: 'excel' | 'csv' | 'pdf';
    sheetName?: string;
    filename: string;
  }
}

// 템플릿 매핑 인터페이스
export interface TemplateMappingData {
  fileType: 'excel' | 'csv' | 'pdf';
  skipRows: number;
  columns: {
    name: string;
    sourceColumn: string;
    required: boolean;
    dataType: 'string' | 'number' | 'date';
  }[];
  pdfSettings?: {
    patterns: Record<string, string>;
  };
}

// 매핑 결과 인터페이스
export interface MappingResult {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  mappedRows: number;
  errorRows: number;
  errors?: { row: number; message: string }[];
}

/**
 * 파일 파서 클래스
 * Excel, CSV, PDF 파일을 파싱하는 기능 제공
 */
export class FileParser {
  
  /**
   * 파일 유형에 따라 적절한 파서를 호출하여 데이터를 추출합니다.
   */
  static async parseFile(filePath: string, fileType: string): Promise<ParsedFileData> {
    try {
      // 파일이 존재하는지 확인
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
      }
      
      const filename = path.basename(filePath);
      
      if (fileType.includes('excel') || fileType.includes('spreadsheet') || 
          fileType.includes('xlsx') || fileType.includes('xls')) {
        return await this.parseExcel(filePath, filename);
      }
      
      if (fileType.includes('csv')) {
        return await this.parseCsv(filePath, filename);
      }
      
      if (fileType.includes('pdf')) {
        return await this.parsePdf(filePath, filename);
      }
      
      throw new Error(`지원하지 않는 파일 형식입니다: ${fileType}`);
    } catch (error: any) {
      console.error('파일 파싱 오류:', error);
      throw new Error(`파일 파싱 오류: ${error.message}`);
    }
  }
  
  /**
   * Excel 파일 파싱
   */
  private static async parseExcel(filePath: string, filename: string): Promise<ParsedFileData> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Excel 데이터를 JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 헤더와 데이터 행 분리
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1);
    
    return {
      headers,
      rows,
      metadata: {
        totalRows: rows.length,
        type: 'excel',
        sheetName,
        filename,
      }
    };
  }
  
  /**
   * CSV 파일 파싱
   */
  private static async parseCsv(filePath: string, filename: string): Promise<ParsedFileData> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // CSV 파싱 옵션 (헤더 포함)
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    
    return {
      headers,
      rows: records,
      metadata: {
        totalRows: records.length,
        type: 'csv',
        filename,
      }
    };
  }
  
  /**
   * PDF 파일 파싱
   */
  private static async parsePdf(filePath: string, filename: string): Promise<ParsedFileData> {
    const pdfExtract = new PDFExtract();
    const data = await pdfExtract.extract(filePath);
    
    // PDF 텍스트 내용 추출
    const textContent = data.pages
      .map(page => page.content
        .filter(item => item.str.trim().length > 0)
        .map(item => item.str)
        .join(' ')
      )
      .join('\n');
    
    // PDF의 경우 테이블 형태로 데이터가 없을 수 있으므로,
    // 텍스트 내용만 추출하여 기본 헤더로 반환
    return {
      headers: ['content'],
      rows: [{ content: textContent }],
      metadata: {
        totalRows: 1,
        type: 'pdf',
        filename,
      }
    };
  }
  
  /**
   * 템플릿을 사용하여 파일 데이터 매핑
   */
  static applyTemplate(fileData: ParsedFileData, template: TemplateMappingData): MappingResult {
    try {
      const mappedRows: Record<string, any>[] = [];
      const errors: { row: number; message: string }[] = [];
      
      // 파일 유형에 따라 다른 매핑 로직 적용
      if (template.fileType === 'pdf' && fileData.metadata.type === 'pdf') {
        return this.applyPdfTemplate(fileData, template);
      }
      
      // Excel, CSV 매핑 로직
      const sourceData = fileData.rows;
      const skipRows = template.skipRows || 0;
      const columnMappings = template.columns;
      
      // 매핑 결과 헤더 (템플릿에 정의된 컬럼 이름)
      const resultHeaders = columnMappings.map(col => col.name);
      
      // Excel/CSV 데이터 매핑
      for (let i = skipRows; i < sourceData.length; i++) {
        const sourceRow = sourceData[i];
        const mappedRow: Record<string, any> = {};
        let hasError = false;
        
        // 각 컬럼 매핑
        for (const mapping of columnMappings) {
          let value = null;
          
          if (fileData.metadata.type === 'excel') {
            // Excel의 경우 열 문자(A, B, C...)를 인덱스로 변환
            const columnIndex = this.excelColToIndex(mapping.sourceColumn);
            value = sourceRow[columnIndex];
          } else {
            // CSV의 경우 열 이름 또는 인덱스 사용
            value = sourceRow[mapping.sourceColumn] || null;
          }
          
          // 필수 필드 검사
          if (mapping.required && (value === null || value === undefined)) {
            errors.push({
              row: i + 1,
              message: `필수 필드 '${mapping.name}'의 값이 없습니다.`
            });
            hasError = true;
          }
          
          // 데이터 타입 변환
          try {
            mappedRow[mapping.name] = this.convertDataType(value, mapping.dataType);
          } catch (error: any) {
            errors.push({
              row: i + 1,
              message: `필드 '${mapping.name}'의 데이터 타입 변환 오류: ${error.message}`
            });
            hasError = true;
          }
        }
        
        // 에러가 없는 경우에만 결과 행에 추가
        if (!hasError) {
          mappedRows.push(mappedRow);
        }
      }
      
      return {
        headers: resultHeaders,
        rows: mappedRows,
        totalRows: sourceData.length - skipRows,
        mappedRows: mappedRows.length,
        errorRows: errors.length,
        errors
      };
      
    } catch (error: any) {
      console.error('템플릿 적용 오류:', error);
      throw new Error(`템플릿 적용 오류: ${error.message}`);
    }
  }
  
  /**
   * PDF 템플릿 적용
   * 정규식 패턴을 사용하여 PDF 내용에서 값을 추출
   */
  private static applyPdfTemplate(fileData: ParsedFileData, template: TemplateMappingData): MappingResult {
    const pdfContent = fileData.rows[0]?.content || '';
    const mappedRow: Record<string, any> = {};
    const errors: { row: number; message: string }[] = [];
    
    // 템플릿에 정의된 각 컬럼에 대해 정규식 패턴 적용
    for (const mapping of template.columns) {
      const pattern = template.pdfSettings?.patterns[mapping.name];
      
      if (!pattern) {
        if (mapping.required) {
          errors.push({
            row: 1,
            message: `필수 필드 '${mapping.name}'의 패턴이 정의되지 않았습니다.`
          });
        }
        continue;
      }
      
      // 정규식 패턴 적용
      const regex = new RegExp(pattern, 'i');
      const match = pdfContent.match(regex);
      
      if (match && match[1]) {
        // 첫 번째 캡처 그룹 사용
        mappedRow[mapping.name] = this.convertDataType(match[1], mapping.dataType);
      } else if (mapping.required) {
        errors.push({
          row: 1,
          message: `필수 필드 '${mapping.name}'의 값을 찾을 수 없습니다.`
        });
      }
    }
    
    // 결과 헤더 (템플릿에 정의된 컬럼 이름)
    const resultHeaders = template.columns.map(col => col.name);
    
    // 에러가 있는지 확인
    const hasErrors = errors.length > 0;
    
    return {
      headers: resultHeaders,
      rows: hasErrors ? [] : [mappedRow],
      totalRows: 1,
      mappedRows: hasErrors ? 0 : 1,
      errorRows: errors.length,
      errors
    };
  }
  
  /**
   * Excel 열 문자를 인덱스로 변환 (A -> 0, B -> 1, ...)
   */
  private static excelColToIndex(col: string): number {
    let result = 0;
    for (let i = 0; i < col.length; i++) {
      result = result * 26 + col.charCodeAt(i) - 64; // A의 아스키 코드는 65
    }
    return result - 1; // 0 기반 인덱스
  }
  
  /**
   * 데이터 타입 변환
   */
  private static convertDataType(value: any, dataType: string): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    switch (dataType) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`'${value}'은(는) 유효한 숫자가 아닙니다.`);
        }
        return num;
        
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`'${value}'은(는) 유효한 날짜가 아닙니다.`);
        }
        return date.toISOString();
        
      case 'string':
      default:
        return String(value);
    }
  }
}
