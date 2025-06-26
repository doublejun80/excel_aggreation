import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { 
  columns, 
  templates, 
  quotations, 
  uploadedFiles,
  type Column, 
  type InsertColumn,
  type Template, 
  type InsertTemplate,
  type Quotation, 
  type InsertQuotation,
  type UploadedFile, 
  type InsertUploadedFile
} from "../shared/schema-sqlite";
import { eq } from "drizzle-orm";
import { IStorage } from "./storage";
import * as path from "path";
import * as fs from "fs";

// 앱 데이터 디렉토리 생성
const APP_DATA_DIR = path.join(process.cwd(), "app-data");
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// SQLite 데이터베이스 연결
const DB_PATH = path.join(APP_DATA_DIR, "quote-manager.db");
const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite);

export class SQLiteStorage implements IStorage {
  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // 테이블이 존재하는지 확인하고 없으면 생성
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS columns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          data_type TEXT NOT NULL,
          required INTEGER NOT NULL DEFAULT 0,
          default_value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          mapping_data TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS quotations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quotation_id TEXT NOT NULL,
          solution TEXT,
          category TEXT,
          partner TEXT,
          vendor TEXT,
          main_product TEXT,
          quantity INTEGER,
          consumer_price REAL,
          contract_amount REAL,
          savings_amount REAL,
          free_maintenance_period TEXT,
          vendor_contact TEXT,
          vendor_email TEXT,
          partner_contact TEXT,
          partner_email TEXT,
          special_notes TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS uploaded_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          size INTEGER NOT NULL,
          status TEXT NOT NULL,
          template_id INTEGER,
          uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (template_id) REFERENCES templates (id)
        );
      `);
      
      // 기본 컬럼 데이터 초기화
      this.initializeDefaultData();
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  private async initializeDefaultData() {
    // 기존 컬럼이 있는지 확인
    const existingColumns = await db.select().from(columns);
    
    // 컬럼이 없을 경우에만 기본 데이터 추가
    if (existingColumns.length === 0) {
      await db.insert(columns).values([
        { name: "견적ID", dataType: "string", required: true },
        { name: "솔루션", dataType: "string", required: false },
        { name: "카테고리", dataType: "string", required: false },
        { name: "파트너사", dataType: "string", required: false },
        { name: "벤더", dataType: "string", required: false },
        { name: "주요제품", dataType: "string", required: false },
        { name: "수량", dataType: "number", required: false },
        { name: "소비자가격", dataType: "number", required: false },
        { name: "계약금액", dataType: "number", required: false },
        { name: "절감액", dataType: "number", required: false }
      ]);
    }
  }

  // Column management
  async getColumns(): Promise<Column[]> {
    return await db.select().from(columns);
  }

  async createColumn(column: InsertColumn): Promise<Column> {
    const [result] = await db.insert(columns).values(column).returning();
    return result;
  }

  async updateColumn(id: number, columnData: Partial<InsertColumn>): Promise<Column> {
    const [result] = await db
      .update(columns)
      .set(columnData)
      .where(eq(columns.id, id))
      .returning();
    return result;
  }

  async deleteColumn(id: number): Promise<void> {
    await db.delete(columns).where(eq(columns.id, id));
  }

  // Template management
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [result] = await db.select().from(templates).where(eq(templates.id, id));
    return result;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [result] = await db.insert(templates).values(template).returning();
    return result;
  }

  async updateTemplate(id: number, templateData: Partial<InsertTemplate>): Promise<Template> {
    const [result] = await db
      .update(templates)
      .set(templateData)
      .where(eq(templates.id, id))
      .returning();
    return result;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Quotation management
  async getQuotations(): Promise<Quotation[]> {
    return await db.select().from(quotations);
  }

  async getQuotation(id: number): Promise<Quotation | undefined> {
    const [result] = await db.select().from(quotations).where(eq(quotations.id, id));
    return result;
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const [result] = await db.insert(quotations).values(quotation).returning();
    return result;
  }

  async updateQuotation(id: number, quotationData: Partial<InsertQuotation>): Promise<Quotation> {
    // 버전 증가
    const existing = await this.getQuotation(id);
    const newVersion = existing ? existing.version + 1 : 1;
    
    const [result] = await db
      .update(quotations)
      .set({ ...quotationData, version: newVersion, updatedAt: new Date().toISOString() })
      .where(eq(quotations.id, id))
      .returning();
    return result;
  }

  async deleteQuotation(id: number): Promise<void> {
    await db.delete(quotations).where(eq(quotations.id, id));
  }

  async getQuotationsByCategory(category: string): Promise<Quotation[]> {
    return await db.select().from(quotations).where(eq(quotations.category, category));
  }

  async getQuotationsByPartner(partner: string): Promise<Quotation[]> {
    return await db.select().from(quotations).where(eq(quotations.partner, partner));
  }

  // File management
  async getUploadedFiles(): Promise<UploadedFile[]> {
    return await db.select().from(uploadedFiles);
  }

  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const [result] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id));
    return result;
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const [result] = await db.insert(uploadedFiles).values(file).returning();
    return result;
  }

  async updateUploadedFile(id: number, fileData: Partial<InsertUploadedFile>): Promise<UploadedFile> {
    const [result] = await db
      .update(uploadedFiles)
      .set(fileData)
      .where(eq(uploadedFiles.id, id))
      .returning();
    return result;
  }

  async deleteUploadedFile(id: number): Promise<void> {
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
  }
}

// 싱글톤 인스턴스 생성
export const sqliteStorage = new SQLiteStorage();
