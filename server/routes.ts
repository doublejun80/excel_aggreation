import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertColumnSchema, insertTemplateSchema, insertQuotationSchema, insertUploadedFileSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Column routes
  app.get("/api/columns", async (req, res) => {
    try {
      const columns = await storage.getColumns();
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.post("/api/columns", async (req, res) => {
    try {
      const validatedData = insertColumnSchema.parse(req.body);
      const column = await storage.createColumn(validatedData);
      res.status(201).json(column);
    } catch (error) {
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.put("/api/columns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertColumnSchema.partial().parse(req.body);
      const column = await storage.updateColumn(id, validatedData);
      res.json(column);
    } catch (error) {
      res.status(400).json({ message: "Failed to update column" });
    }
  });

  app.delete("/api/columns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteColumn(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete column" });
    }
  });

  // Template routes
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(id, validatedData);
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete template" });
    }
  });

  // Quotation routes
  app.get("/api/quotations", async (req, res) => {
    try {
      const { category, partner } = req.query;
      let quotations;
      
      if (category) {
        quotations = await storage.getQuotationsByCategory(category as string);
      } else if (partner) {
        quotations = await storage.getQuotationsByPartner(partner as string);
      } else {
        quotations = await storage.getQuotations();
      }
      
      res.json(quotations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quotation = await storage.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotation" });
    }
  });

  app.post("/api/quotations", async (req, res) => {
    try {
      const validatedData = insertQuotationSchema.parse(req.body);
      const quotation = await storage.createQuotation(validatedData);
      res.status(201).json(quotation);
    } catch (error) {
      res.status(400).json({ message: "Invalid quotation data" });
    }
  });

  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertQuotationSchema.partial().parse(req.body);
      const quotation = await storage.updateQuotation(id, validatedData);
      res.json(quotation);
    } catch (error) {
      res.status(400).json({ message: "Failed to update quotation" });
    }
  });

  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteQuotation(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete quotation" });
    }
  });

  // Uploaded file routes
  app.get("/api/uploaded-files", async (req, res) => {
    try {
      const files = await storage.getUploadedFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch uploaded files" });
    }
  });

  app.post("/api/uploaded-files", async (req, res) => {
    try {
      const validatedData = insertUploadedFileSchema.parse(req.body);
      const file = await storage.createUploadedFile(validatedData);
      res.status(201).json(file);
    } catch (error) {
      res.status(400).json({ message: "Invalid file data" });
    }
  });

  app.put("/api/uploaded-files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertUploadedFileSchema.partial().parse(req.body);
      const file = await storage.updateUploadedFile(id, validatedData);
      res.json(file);
    } catch (error) {
      res.status(400).json({ message: "Failed to update file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
