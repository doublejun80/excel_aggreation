import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parsePdf } from 'pdf-parse';
import { IncomingForm } from 'formidable';

// 업로드 디렉토리 설정
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 파일 유형 확인
export type FileType = 'xlsx' | 'xls' | 'csv' | 'pdf' | 'unknown';

export function getFileType(filename: string): FileType {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.xlsx':
      return 'xlsx';
    case '.xls':
      return 'xls';
    case '.csv':
      return 'csv';
    case '.pdf':
      return 'pdf';
    default:
      return 'unknown';
  }
}

// 업로드된 파일 정보
export interface UploadedFileInfo {
  id: string;
  originalFilename: string;
  path: string;
  size: number;
  type: FileType;
}

// 파일 업로드 처리
export async function handleFileUpload(req: any): Promise<UploadedFileInfo[]> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ 
      multiples: true,
      uploadDir: UPLOAD_DIR,
      keepExtensions: true
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
      const fileInfos = uploadedFiles.map(file => ({
        id: path.basename(file.filepath),
        originalFilename: file.originalFilename || 'unknown',
        path: file.filepath,
        size: file.size,
        type: getFileType(file.originalFilename || '')
      }));

      resolve(fileInfos);
    });
  });
}

// 엑셀 파일 파서
export async function parseExcelFile(filePath: string): Promise<any[][]> {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // 시트를 2D 배열로 변환
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  return data as any[][];
}

// CSV 파일 파서
export async function parseCsvFile(filePath: string): Promise<any[][]> {
  // CSV도 xlsx 라이브러리로 처리 가능
  return parseExcelFile(filePath);
}

// PDF 파일 파서
export async function parsePdfFile(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await parsePdf(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error(`PDF 파싱 오류: ${error.message}`);
  }
}

// 파일 데이터 추출
export async function extractDataFromFile(fileInfo: UploadedFileInfo): Promise<any> {
  try {
    switch (fileInfo.type) {
      case 'xlsx':
      case 'xls':
        return await parseExcelFile(fileInfo.path);
      
      case 'csv':
        return await parseCsvFile(fileInfo.path);
      
      case 'pdf':
        return await parsePdfFile(fileInfo.path);
      
      default:
        throw new Error(`지원하지 않는 파일 형식: ${fileInfo.type}`);
    }
  } catch (error) {
    console.error(`File processing error (${fileInfo.originalFilename}):`, error);
    throw error;
  }
}

// 템플릿 매핑 적용
export function applyTemplateMapping(data: any[][], mappingData: any): Record<string, any> {
  const result: Record<string, any> = {};

  // mappingData는 JSON 문자열 형태일 수 있음
  const mapping = typeof mappingData === 'string' ? JSON.parse(mappingData) : mappingData;
  
  // 각 필드에 대해 매핑 적용
  for (const [field, mapInfo] of Object.entries(mapping)) {
    try {
      // mapInfo는 { row: number, col: number } 또는 { selector: string } 형태
      if ('row' in mapInfo && 'col' in mapInfo) {
        // 데이터가 존재하는지 확인
        if (data[mapInfo.row] && data[mapInfo.row][mapInfo.col] !== undefined) {
          result[field] = data[mapInfo.row][mapInfo.col];
        }
      } 
      // PDF용 텍스트 선택자 처리 (향후 구현)
      else if ('selector' in mapInfo && typeof data === 'string') {
        // PDF 텍스트에서 정규식 등을 사용한 데이터 추출 로직 (구현 필요)
        // 현재는 예시로 빈 값 할당
        result[field] = "";
      }
    } catch (error) {
      console.error(`매핑 오류 (${field}):`, error);
      result[field] = null; // 오류 시 null 할당
    }
  }

  return result;
}

// 데이터 내보내기: Excel
export function exportToExcel(data: any[], filename: string): string {
  // 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 워크시트 생성
  const ws = XLSX.utils.json_to_sheet(data);
  
  // 워크북에 워크시트 추가
  XLSX.utils.book_append_sheet(wb, ws, "견적서 데이터");
  
  // 파일로 저장
  const exportPath = path.join(UPLOAD_DIR, filename);
  XLSX.writeFile(wb, exportPath);
  
  return exportPath;
}

// 데이터 내보내기: CSV
export function exportToCsv(data: any[], filename: string): string {
  // CSV 옵션으로 워크시트 생성
  const ws = XLSX.utils.json_to_sheet(data);
  
  // 워크북 생성 및 워크시트 추가
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "견적서 데이터");
  
  // CSV 파일로 저장
  const exportPath = path.join(UPLOAD_DIR, filename);
  XLSX.writeFile(wb, exportPath, { bookType: 'csv' });
  
  return exportPath;
}

// PDF 내보내기는 향후 구현 (pdfkit 라이브러리 등 필요)
