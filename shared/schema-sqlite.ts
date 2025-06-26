import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 컬럼 정의 테이블
export const columns = sqliteTable("columns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  dataType: text("data_type").notNull(),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  defaultValue: text("default_value"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 템플릿 정의 테이블
export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mappingData: text("mapping_data").notNull(), // JSON string
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 견적서 데이터 테이블
export const quotations = sqliteTable("quotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quotationId: text("quotation_id").notNull(),
  solution: text("solution"),
  category: text("category"),
  partner: text("partner"),
  vendor: text("vendor"),
  mainProduct: text("main_product"),
  quantity: integer("quantity"),
  consumerPrice: real("consumer_price"),
  contractAmount: real("contract_amount"),
  savingsAmount: real("savings_amount"),
  freeMaintenancePeriod: text("free_maintenance_period"),
  vendorContact: text("vendor_contact"),
  vendorEmail: text("vendor_email"),
  partnerContact: text("partner_contact"),
  partnerEmail: text("partner_email"),
  specialNotes: text("special_notes"),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 업로드된 파일 테이블
export const uploadedFiles = sqliteTable("uploaded_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull(), // "pending", "processing", "completed", "failed"
  templateId: integer("template_id").references(() => templates.id),
  uploadedAt: text("uploaded_at").default(sql`CURRENT_TIMESTAMP`),
});

// 견적 데이터 테이블 - 매핑된 결과 저장
export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id").references(() => uploadedFiles.id).notNull(),
  templateId: integer("template_id").references(() => templates.id).notNull(),
  data: text("data").notNull(), // JSON string of mapped quote data
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
});

// Zod 스키마 생성
export const insertColumnSchema = createInsertSchema(columns).pick({
  name: true,
  dataType: true,
  required: true,
  defaultValue: true,
});

export const insertTemplateSchema = createInsertSchema(templates).pick({
  name: true,
  mappingData: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).pick({
  quotationId: true,
  solution: true,
  category: true,
  partner: true,
  vendor: true,
  mainProduct: true,
  quantity: true,
  consumerPrice: true,
  contractAmount: true,
  savingsAmount: true,
  freeMaintenancePeriod: true,
  vendorContact: true,
  vendorEmail: true,
  partnerContact: true,
  partnerEmail: true,
  specialNotes: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).pick({
  filename: true,
  size: true,
  status: true,
  templateId: true,
});

// 타입 추출
export type Column = typeof columns.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

import { sql } from "drizzle-orm";
