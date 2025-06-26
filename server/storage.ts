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
} from "@shared/schema";

export interface IStorage {
  // Column management
  getColumns(): Promise<Column[]>;
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column>;
  deleteColumn(id: number): Promise<void>;

  // Template management
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;

  // Quotation management
  getQuotations(): Promise<Quotation[]>;
  getQuotation(id: number): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  deleteQuotation(id: number): Promise<void>;
  getQuotationsByCategory(category: string): Promise<Quotation[]>;
  getQuotationsByPartner(partner: string): Promise<Quotation[]>;

  // File management
  getUploadedFiles(): Promise<UploadedFile[]>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  updateUploadedFile(id: number, file: Partial<InsertUploadedFile>): Promise<UploadedFile>;
  deleteUploadedFile(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private columns: Map<number, Column>;
  private templates: Map<number, Template>;
  private quotations: Map<number, Quotation>;
  private uploadedFiles: Map<number, UploadedFile>;
  private currentColumnId: number;
  private currentTemplateId: number;
  private currentQuotationId: number;
  private currentFileId: number;

  constructor() {
    this.columns = new Map();
    this.templates = new Map();
    this.quotations = new Map();
    this.uploadedFiles = new Map();
    this.currentColumnId = 1;
    this.currentTemplateId = 1;
    this.currentQuotationId = 1;
    this.currentFileId = 1;

    // Initialize with default columns and sample data
    this.initializeDefaultColumns();
    this.initializeSampleData();
  }

  private initializeDefaultColumns() {
    const defaultColumns = [
      { name: "솔루션", dataType: "문자열", required: true, defaultValue: null },
      { name: "협력사", dataType: "문자열", required: true, defaultValue: null },
      { name: "벤더사", dataType: "문자열", required: false, defaultValue: null },
      { name: "계약금액", dataType: "숫자", required: true, defaultValue: null },
      { name: "무상유지보수", dataType: "날짜", required: false, defaultValue: null },
      { name: "벤더담당", dataType: "문자열", required: false, defaultValue: null },
    ];

    defaultColumns.forEach(col => {
      const column: Column = {
        id: this.currentColumnId++,
        name: col.name,
        dataType: col.dataType,
        required: col.required,
        defaultValue: col.defaultValue,
        createdAt: new Date(),
      };
      this.columns.set(column.id, column);
    });
  }

  private initializeSampleData() {
    // Add sample quotations
    const sampleQuotations = [
      {
        quotationId: "Q2024-001",
        solution: "ERP 시스템",
        category: "SW군",
        partner: "협력사A",
        vendor: "벤더A",
        mainProduct: "SAP ERP",
        quantity: 10,
        consumerPrice: "50000000",
        contractAmount: "42000000",
        savingsAmount: "8000000",
        freeMaintenancePeriod: "12개월",
        vendorContact: "김상무",
        vendorEmail: "kim@vendor-a.com",
        partnerContact: "이대리",
        partnerEmail: "lee@partner-a.com",
        specialNotes: "교육 포함",
      },
      {
        quotationId: "Q2024-002",
        solution: "서버 장비",
        category: "HW군",
        partner: "협력사B",
        vendor: "벤더B",
        mainProduct: "Dell PowerEdge",
        quantity: 5,
        consumerPrice: "30000000",
        contractAmount: "27000000",
        savingsAmount: "3000000",
        freeMaintenancePeriod: "24개월",
        vendorContact: "박과장",
        vendorEmail: "park@vendor-b.com",
        partnerContact: "최팀장",
        partnerEmail: "choi@partner-b.com",
        specialNotes: "온사이트 설치",
      },
      {
        quotationId: "Q2024-003",
        solution: "보안 컨설팅",
        category: "서비스군",
        partner: "협력사A",
        vendor: "벤더A",
        mainProduct: "보안 진단",
        quantity: 1,
        consumerPrice: "15000000",
        contractAmount: "12000000",
        savingsAmount: "3000000",
        freeMaintenancePeriod: "6개월",
        vendorContact: "김상무",
        vendorEmail: "kim@vendor-a.com",
        partnerContact: "이대리",
        partnerEmail: "lee@partner-a.com",
        specialNotes: "월 1회 점검",
      },
    ];

    sampleQuotations.forEach(quotationData => {
      const quotation: Quotation = {
        id: this.currentQuotationId++,
        quotationId: quotationData.quotationId,
        solution: quotationData.solution,
        category: quotationData.category,
        partner: quotationData.partner,
        vendor: quotationData.vendor,
        mainProduct: quotationData.mainProduct,
        quantity: quotationData.quantity,
        consumerPrice: quotationData.consumerPrice,
        contractAmount: quotationData.contractAmount,
        savingsAmount: quotationData.savingsAmount,
        freeMaintenancePeriod: quotationData.freeMaintenancePeriod,
        vendorContact: quotationData.vendorContact,
        vendorEmail: quotationData.vendorEmail,
        partnerContact: quotationData.partnerContact,
        partnerEmail: quotationData.partnerEmail,
        specialNotes: quotationData.specialNotes,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.quotations.set(quotation.id, quotation);
    });

    // Add sample templates
    const sampleTemplates = [
      {
        name: "표준 ERP 템플릿",
        mappingData: JSON.stringify({
          solution: "A1",
          partner: "B1",
          vendor: "C1",
          contractAmount: "D1"
        }),
      },
      {
        name: "하드웨어 견적 템플릿",
        mappingData: JSON.stringify({
          solution: "A2",
          quantity: "B2",
          consumerPrice: "C2",
          contractAmount: "D2"
        }),
      },
    ];

    sampleTemplates.forEach(templateData => {
      const template: Template = {
        id: this.currentTemplateId++,
        ...templateData,
        createdAt: new Date(),
      };
      this.templates.set(template.id, template);
    });

    // Add sample uploaded files
    const sampleFiles = [
      {
        filename: "ERP_견적서_2024.xlsx",
        size: 245760,
        status: "completed",
        templateId: 1,
      },
      {
        filename: "서버장비_견적_20241201.pdf",
        size: 1048576,
        status: "pending",
        templateId: null,
      },
      {
        filename: "보안컨설팅_제안서.xlsx",
        size: 512000,
        status: "failed",
        templateId: null,
      },
    ];

    sampleFiles.forEach(fileData => {
      const file: UploadedFile = {
        id: this.currentFileId++,
        filename: fileData.filename,
        size: fileData.size,
        status: fileData.status,
        templateId: fileData.templateId,
        uploadedAt: new Date(),
      };
      this.uploadedFiles.set(file.id, file);
    });
  }

  // Column methods
  async getColumns(): Promise<Column[]> {
    return Array.from(this.columns.values());
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const column: Column = {
      id: this.currentColumnId++,
      ...insertColumn,
      createdAt: new Date(),
    };
    this.columns.set(column.id, column);
    return column;
  }

  async updateColumn(id: number, updateData: Partial<InsertColumn>): Promise<Column> {
    const column = this.columns.get(id);
    if (!column) throw new Error("Column not found");
    
    const updatedColumn = { ...column, ...updateData };
    this.columns.set(id, updatedColumn);
    return updatedColumn;
  }

  async deleteColumn(id: number): Promise<void> {
    this.columns.delete(id);
  }

  // Template methods
  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const template: Template = {
      id: this.currentTemplateId++,
      ...insertTemplate,
      createdAt: new Date(),
    };
    this.templates.set(template.id, template);
    return template;
  }

  async updateTemplate(id: number, updateData: Partial<InsertTemplate>): Promise<Template> {
    const template = this.templates.get(id);
    if (!template) throw new Error("Template not found");
    
    const updatedTemplate = { ...template, ...updateData };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: number): Promise<void> {
    this.templates.delete(id);
  }

  // Quotation methods
  async getQuotations(): Promise<Quotation[]> {
    return Array.from(this.quotations.values());
  }

  async getQuotation(id: number): Promise<Quotation | undefined> {
    return this.quotations.get(id);
  }

  async createQuotation(insertQuotation: InsertQuotation): Promise<Quotation> {
    const quotation: Quotation = {
      id: this.currentQuotationId++,
      ...insertQuotation,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.quotations.set(quotation.id, quotation);
    return quotation;
  }

  async updateQuotation(id: number, updateData: Partial<InsertQuotation>): Promise<Quotation> {
    const quotation = this.quotations.get(id);
    if (!quotation) throw new Error("Quotation not found");
    
    const updatedQuotation = { 
      ...quotation, 
      ...updateData, 
      version: quotation.version + 1,
      updatedAt: new Date()
    };
    this.quotations.set(id, updatedQuotation);
    return updatedQuotation;
  }

  async deleteQuotation(id: number): Promise<void> {
    this.quotations.delete(id);
  }

  async getQuotationsByCategory(category: string): Promise<Quotation[]> {
    return Array.from(this.quotations.values()).filter(q => q.category === category);
  }

  async getQuotationsByPartner(partner: string): Promise<Quotation[]> {
    return Array.from(this.quotations.values()).filter(q => q.partner === partner);
  }

  // File methods
  async getUploadedFiles(): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values());
  }

  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const file: UploadedFile = {
      id: this.currentFileId++,
      ...insertFile,
      uploadedAt: new Date(),
    };
    this.uploadedFiles.set(file.id, file);
    return file;
  }

  async updateUploadedFile(id: number, updateData: Partial<InsertUploadedFile>): Promise<UploadedFile> {
    const file = this.uploadedFiles.get(id);
    if (!file) throw new Error("File not found");
    
    const updatedFile = { ...file, ...updateData };
    this.uploadedFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteUploadedFile(id: number): Promise<void> {
    this.uploadedFiles.delete(id);
  }
}

export const storage = new MemStorage();
