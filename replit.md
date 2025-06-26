# Quote Management System

## Overview

This is a comprehensive quote management system designed to handle various quotation formats, extract data efficiently, and provide business intelligence for decision-making. The application is built with a modern full-stack architecture using React for the frontend, Express.js for the backend, and PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API architecture
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Development Server**: Vite for hot module replacement and development experience

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Centralized schema definitions in `/shared/schema.ts`
- **Migrations**: Drizzle Kit for database schema migrations
- **Connection**: Neon serverless PostgreSQL connection

## Key Components

### 1. Database Schema
The system uses four main tables:
- **columns**: Defines data column types and validation rules
- **templates**: Stores mapping templates for different quotation formats
- **quotations**: Main table storing extracted quotation data
- **uploadedFiles**: Tracks file upload status and processing

### 2. Tab-based Interface
The application is organized into four main functional areas:
- **Template Management**: Configure columns and create mapping templates
- **Quote Upload**: Upload files and perform data extraction
- **Data Management**: View, edit, and manage extracted quotation data
- **Data Analysis**: Generate reports and insights from stored data

### 3. Data Storage Layer
- **Interface-based Design**: IStorage interface defines data operations
- **Memory Storage**: MemStorage class for development/testing
- **Database Storage**: Production storage using Drizzle ORM
- **Type Safety**: Zod schemas for runtime validation

### 4. Component Architecture
- **Reusable UI Components**: Comprehensive component library in `/client/src/components/ui/`
- **Business Components**: Domain-specific components for template management, data upload, etc.
- **Data Table**: Custom data table component with sorting, filtering, and selection
- **Form Components**: Integrated form handling with validation

## Data Flow

1. **Template Creation**: Users define data columns and create mapping templates for different quotation formats
2. **File Upload**: Users upload quotation files (individual or batch)
3. **Auto-Processing**: System automatically detects matching templates and extracts data
4. **Manual Mapping**: For unmatched files, users can manually map data fields
5. **Data Storage**: Extracted data is validated and stored in PostgreSQL
6. **Data Management**: Users can view, edit, and manage stored quotation data
7. **Analytics**: System generates insights and reports from stored data

## External Dependencies

### Frontend Dependencies
- **@radix-ui/***: Primitive UI components for accessibility
- **@tanstack/react-query**: Server state management
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing library
- **zod**: Schema validation
- **react-hook-form**: Form state management

### Backend Dependencies
- **express**: Web framework
- **drizzle-orm**: Database ORM
- **@neondatabase/serverless**: PostgreSQL connection
- **connect-pg-simple**: PostgreSQL session store
- **tsx**: TypeScript execution for development

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking
- **esbuild**: Fast bundler for production

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:
- **Development**: `npm run dev` - Runs both frontend and backend in development mode
- **Build**: `npm run build` - Builds frontend assets and bundles backend
- **Production**: `npm run start` - Serves built application
- **Database**: Uses Neon PostgreSQL with connection pooling
- **Environment**: Node.js 20 with PostgreSQL 16 module

The deployment uses Replit's autoscale feature with proper port configuration (5000 internal, 80 external).

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 26, 2025. Initial setup