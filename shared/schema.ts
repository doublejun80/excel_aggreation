import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const columns = pgTable("columns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dataType: text("data_type").notNull(),
  required: boolean("required").notNull().default(false),
  defaultValue: text("default_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mappingData: text("mapping_data").notNull(), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationId: text("quotation_id").notNull(),
  solution: text("solution"),
  category: text("category"),
  partner: text("partner"),
  vendor: text("vendor"),
  mainProduct: text("main_product"),
  quantity: integer("quantity"),
  consumerPrice: decimal("consumer_price", { precision: 15, scale: 2 }),
  contractAmount: decimal("contract_amount", { precision: 15, scale: 2 }),
  savingsAmount: decimal("savings_amount", { precision: 15, scale: 2 }),
  freeMaintenancePeriod: text("free_maintenance_period"),
  vendorContact: text("vendor_contact"),
  vendorEmail: text("vendor_email"),
  partnerContact: text("partner_contact"),
  partnerEmail: text("partner_email"),
  specialNotes: text("special_notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull(), // "pending", "processing", "completed", "failed"
  templateId: integer("template_id").references(() => templates.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

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

export type Column = typeof columns.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
