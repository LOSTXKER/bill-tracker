---
name: Bill Tracker Ultimate ERP
overview: สร้าง Web Application แบบ Full-Stack สำหรับจัดการกระแสเงินสด เอกสารทางบัญชี และภาษีหัก ณ ที่จ่าย สำหรับโรงงานสกรีน (Anajak) และเว็บปั๊มไลค์ (Meelike) พร้อม Security, Multi-user, Reporting และรองรับการขยายเป็น Custom ERP
todos:
  - id: setup-project
    content: Initialize Next.js 14 project with TypeScript, Tailwind, Prisma
    status: pending
  - id: design-database
    content: Create complete Prisma schema with all models and relationships
    status: pending
    dependencies:
      - setup-project
  - id: setup-auth
    content: Implement NextAuth.js with RBAC and permission system
    status: pending
    dependencies:
      - design-database
  - id: security-implementation
    content: Add input validation, file upload security, rate limiting
    status: pending
    dependencies:
      - setup-auth
  - id: landing-page
    content: Build mobile-first landing page with company selector
    status: pending
    dependencies:
      - setup-auth
  - id: expense-form
    content: Create expense capture form with VAT/WHT calculation
    status: pending
    dependencies:
      - landing-page
  - id: income-form
    content: Create income capture form with customer WHT handling
    status: pending
    dependencies:
      - expense-form
  - id: file-upload
    content: Implement secure file upload to Supabase Storage with optimization
    status: pending
    dependencies:
      - expense-form
  - id: line-notify
    content: Integrate LINE Notify API for real-time notifications
    status: pending
    dependencies:
      - income-form
  - id: dashboard
    content: Build priority-based dashboard with action required zones
    status: pending
    dependencies:
      - line-notify
  - id: vat-report
    content: Create VAT report for ภ.พ.30 filing
    status: pending
    dependencies:
      - dashboard
  - id: wht-report
    content: Create WHT report for ภ.ง.ด.53/54 filing
    status: pending
    dependencies:
      - vat-report
  - id: excel-export
    content: Implement Excel export with proper formatting
    status: pending
    dependencies:
      - wht-report
  - id: charts
    content: Add interactive charts for cash flow and expense analysis
    status: pending
    dependencies:
      - dashboard
  - id: budget-management
    content: Implement budget tracking and alerts system
    status: pending
    dependencies:
      - charts
  - id: recurring-expenses
    content: Create recurring expense automation with cron jobs
    status: pending
    dependencies:
      - expense-form
  - id: vendor-customer-mgmt
    content: Build vendor and customer master data management
    status: pending
    dependencies:
      - dashboard
  - id: audit-logs
    content: Implement audit log viewer for compliance tracking
    status: pending
    dependencies:
      - security-implementation
  - id: pwa-features
    content: Add PWA capabilities with offline mode and camera integration
    status: pending
    dependencies:
      - file-upload
  - id: anajak-job-orders
    content: Build job order system for Anajak T-Shirt factory
    status: pending
    dependencies:
      - income-form
  - id: anajak-inventory
    content: Create inventory management with stock alerts
    status: pending
    dependencies:
      - anajak-job-orders
  - id: anajak-costing
    content: Implement costing calculator for pricing decisions
    status: pending
    dependencies:
      - anajak-inventory
  - id: meelike-sync
    content: Build automated revenue sync from Meelike database
    status: pending
    dependencies:
      - income-form
  - id: meelike-provider
    content: Create provider balance tracker with alerts
    status: pending
    dependencies:
      - meelike-sync
  - id: meelike-profit
    content: Build real-time profit monitoring dashboard
    status: pending
    dependencies:
      - meelike-provider
  - id: unit-tests
    content: Write unit tests for tax calculations and business logic
    status: pending
    dependencies:
      - expense-form
      - income-form
  - id: integration-tests
    content: Create integration tests for API routes and database
    status: pending
    dependencies:
      - unit-tests
  - id: e2e-tests
    content: Build E2E tests for complete workflows with Playwright
    status: pending
    dependencies:
      - integration-tests
  - id: ci-cd-pipeline
    content: Setup GitHub Actions for automated testing and deployment
    status: pending
    dependencies:
      - e2e-tests
  - id: monitoring
    content: Configure Sentry, logging, and uptime monitoring
    status: pending
    dependencies:
      - ci-cd-pipeline
  - id: backup-strategy
    content: Implement automated backup and recovery procedures
    status: pending
    dependencies:
      - monitoring
  - id: documentation
    content: Write technical and user documentation with tutorials
    status: pending
    dependencies:
      - e2e-tests
---

# Ultimate Bill Tracker & Mini-ERP System

## Tech Stack

**Frontend/Backend**: Next.js 14+ (App Router with Server Components)

**Database**: PostgreSQL via Supabase

**ORM**: Prisma (Type-safe database access)

**Storage**: Supabase Storage (receipts, invoices, WHT certificates)

**Authentication**: NextAuth.js v5 (Auth.js) with Supabase adapter

**Notifications**: LINE Notify API

**File Upload**: React Dropzone + Image compression

**UI Library**: Tailwind CSS + shadcn/ui components

**Form Validation**: Zod + React Hook Form

**State Management**: React Context + SWR for data fetching

**Testing**: Vitest + Playwright

**Deployment**: Vercel

---

## Phase 1: Foundation & Security

### 1.1 Project Setup & Infrastructure

Initialize Next.js 14 project with TypeScript, set up Prisma with PostgreSQL, configure Supabase for database and storage, set up environment variables and Git repository structure.

**Key files**:

- `package.json` - dependencies
- `prisma/schema.prisma` - complete database schema
- `.env.example` - environment template
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind + shadcn/ui setup

### 1.2 Complete Database Schema

Design comprehensive schema covering all entities with proper relationships, indexes, and validation rules.

```prisma
// Core Business Entities
model Company {
  id              String            @id @default(cuid())
  name            String            // "Anajak T-Shirt", "Meelike-th"
  code            String            @unique // "ANJ", "MLK"
  taxId           String?           // เลขประจำตัวผู้เสียภาษี
  address         String?
  phone           String?
  
  // Relations
  expenses        Expense[]
  incomes         Income[]
  users           CompanyAccess[]
  vendors         Vendor[]
  customers       Customer[]
  budgets         Budget[]
  integrations    Integration[]
  recurringExpenses RecurringExpense[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([code])
}

// User Management with RBAC
model User {
  id              String            @id @default(cuid())
  email           String            @unique
  name            String
  password        String            // hashed
  role            UserRole          @default(STAFF)
  isActive        Boolean           @default(true)
  lastLoginAt     DateTime?
  
  // Relations
  companies       CompanyAccess[]
  expenses        Expense[]         @relation("ExpenseCreator")
  incomes         Income[]          @relation("IncomeCreator")
  auditLogs       AuditLog[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([email])
}

enum UserRole {
  ADMIN           // ระดับสูงสุด
  ACCOUNTANT      // บัญชี
  STAFF           // พนักงานทั่วไป
  VIEWER          // ดูอย่างเดียว
}

model CompanyAccess {
  id              String            @id @default(cuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  role            CompanyRole       @default(VIEWER)
  
  createdAt       DateTime          @default(now())
  
  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
}

enum CompanyRole {
  OWNER           // เจ้าของ
  MANAGER         // ผู้จัดการ
  ACCOUNTANT      // บัญชี
  VIEWER          // ดูอย่างเดียว
}

// Vendors (ผู้ขาย/ร้านค้า)
model Vendor {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  name            String
  taxId           String?
  address         String?
  phone           String?
  email           String?
  
  expenses        Expense[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId])
  @@index([taxId])
}

// Customers (ลูกค้า)
model Customer {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  name            String
  taxId           String?
  address         String?
  phone           String?
  email           String?
  creditLimit     Decimal?          @db.Decimal(12, 2)
  paymentTermDays Int               @default(0) // จำนวนวันเครดิต
  
  incomes         Income[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId])
  @@index([taxId])
}

// Expense (รายจ่าย) - Enhanced
model Expense {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  
  // Vendor Information
  vendorId        String?
  vendor          Vendor?           @relation(fields: [vendorId], references: [id])
  vendorName      String?           // สำหรับกรณีไม่ได้เลือก vendor จาก master
  vendorTaxId     String?
  
  // Financial Data
  amount          Decimal           @db.Decimal(12, 2) // ยอดเต็มก่อน VAT
  vatRate         Int               @default(7)        // 7% หรือ 0%
  vatAmount       Decimal?          @db.Decimal(12, 2)
  
  // WHT (เราหักเขา)
  isWht           Boolean           @default(false)
  whtRate         Decimal?          @db.Decimal(5, 2)  // 1, 2, 3, 5, 10
  whtAmount       Decimal?          @db.Decimal(12, 2)
  whtType         WhtType?          // ประเภทเงินได้
  netPaid         Decimal           @db.Decimal(12, 2) // Amount + VAT - WHT
  
  // Document Details
  description     String?
  category        ExpenseCategory?
  invoiceNumber   String?           // เลขที่ใบกำกับภาษี
  referenceNo     String?           // เลขอ้างอิง transaction
  paymentMethod   PaymentMethod     @default(BANK_TRANSFER)
  
  // Evidence Files
  slipUrl         String?           // รูปสลิปโอนเงิน
  taxInvoiceUrl   String?           // รูปใบกำกับภาษี
  whtCertUrl      String?           // รูปใบ 50 ทวิ
  
  // Dates
  billDate        DateTime          @default(now()) // วันที่จ่ายเงิน
  dueDate         DateTime?         // วันครบกำหนด (กรณีเครดิต)
  
  // Status & Workflow
  status          ExpenseDocStatus  @default(PENDING_PHYSICAL)
  notes           String?           @db.Text
  
  // Approval (สำหรับรายจ่ายสูง)
  approvedBy      String?
  approvedAt      DateTime?
  
  // Tracking
  createdBy       String
  creator         User              @relation("ExpenseCreator", fields: [createdBy], references: [id])
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId, billDate])
  @@index([status])
  @@index([category])
  @@index([vendorId])
  @@index([createdAt])
}

enum ExpenseCategory {
  MATERIAL        // วัตถุดิบ
  UTILITY         // สาธารณูปโภค
  MARKETING       // การตลาด
  SALARY          // เงินเดือน
  FREELANCE       // ค่าจ้างฟรีแลนซ์
  TRANSPORT       // ค่าขนส่ง
  RENT            // ค่าเช่า
  OFFICE          // สำนักงาน
  OTHER           // อื่นๆ
}

enum ExpenseDocStatus {
  WAITING_FOR_DOC   // 🟠 จ่ายเงินแล้ว แต่ร้านยังไม่ส่งใบเสร็จมา
  PENDING_PHYSICAL  // 🔴 ได้ใบเสร็จแล้ว แต่ตัวจริงยังอยู่ที่ตัว
  READY_TO_SEND     // 🟡 รวบรวมใส่ซองแล้ว รอส่งบัญชี
  SENT_TO_ACCOUNT   // 🟢 ส่งให้บัญชีเรียบร้อยแล้ว
}

// Income (รายรับ) - Enhanced
model Income {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  
  // Customer Information
  customerId      String?
  customer        Customer?         @relation(fields: [customerId], references: [id])
  customerName    String?
  customerTaxId   String?
  
  // Financial Data
  amount          Decimal           @db.Decimal(12, 2) // ยอดเต็มก่อน VAT
  vatRate         Int               @default(0)
  vatAmount       Decimal?          @db.Decimal(12, 2)
  
  // WHT (เขาหักเรา)
  isWhtDeducted   Boolean           @default(false)
  whtRate         Decimal?          @db.Decimal(5, 2)
  whtAmount       Decimal?          @db.Decimal(12, 2)
  whtType         WhtType?
  netReceived     Decimal           @db.Decimal(12, 2)
  
  // Document Details
  source          String?           // แหล่งที่มา
  invoiceNumber   String?           // เลขที่ใบกำกับภาษีที่เราออกให้
  referenceNo     String?
  paymentMethod   PaymentMethod     @default(BANK_TRANSFER)
  
  // Evidence Files
  customerSlipUrl String?           // สลิปที่ลูกค้าโอนมา
  myBillCopyUrl   String?           // สำเนาบิลที่เราเขียนให้
  whtCertUrl      String?           // ใบ 50 ทวิ ที่ลูกค้าให้มา
  
  // Dates
  receiveDate     DateTime          @default(now())
  
  // Status & Workflow
  status          IncomeDocStatus   @default(PENDING_COPY_SEND)
  notes           String?           @db.Text
  
  // Job Order (สำหรับ Phase 5)
  jobOrderId      String?
  
  // Tracking
  createdBy       String
  creator         User              @relation("IncomeCreator", fields: [createdBy], references: [id])
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId, receiveDate])
  @@index([status])
  @@index([customerId])
  @@index([createdAt])
}

enum IncomeDocStatus {
  NO_DOC_REQUIRED     // ⚪ รับเงินแล้ว ไม่ต้องทำเอกสาร
  WAITING_ISSUE       // 🟠 รับเงินแล้ว แต่ยังไม่ได้เขียนบิล
  WAITING_WHT_CERT    // 🟠 ออกบิลแล้ว แต่รอใบ 50 ทวิ
  PENDING_COPY_SEND   // 🔴 เอกสารครบ รอส่งบัญชี
  SENT_COPY           // 🟢 ส่งปึกสำเนาให้บัญชีแล้ว
}

enum PaymentMethod {
  CASH              // เงินสด
  BANK_TRANSFER     // โอนเงิน
  CREDIT_CARD       // บัตรเครดิต
  PROMPTPAY         // พร้อมเพย์
  CHEQUE            // เช็ค
}

enum WhtType {
  SERVICE_3         // ค่าบริการ 3%
  PROFESSIONAL_5    // ค่าบริการวิชาชีพ 5%
  TRANSPORT_1       // ค่าขนส่ง 1%
  RENT_5            // ค่าเช่า 5%
  ADVERTISING_2     // ค่าโฆษณา 2%
  OTHER             // อื่นๆ
}

// Recurring Expenses (รายจ่ายประจำ)
model RecurringExpense {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  
  name            String            // เช่น "ค่าเช่าโกดัง", "ค่าไฟรายเดือน"
  templateData    Json              // ข้อมูลที่จะใช้สร้าง Expense
  frequency       RecurrenceFreq
  amount          Decimal           @db.Decimal(12, 2)
  
  nextDueDate     DateTime
  lastCreatedAt   DateTime?
  
  isActive        Boolean           @default(true)
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId, nextDueDate])
}

enum RecurrenceFreq {
  MONTHLY
  QUARTERLY
  YEARLY
}

// Budget Management
model Budget {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  
  category        ExpenseCategory
  amount          Decimal           @db.Decimal(12, 2) // งบประมาณที่ตั้งไว้
  period          BudgetPeriod
  
  startDate       DateTime
  endDate         DateTime
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId, startDate])
}

enum BudgetPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
}

// Integration Configuration
model Integration {
  id              String            @id @default(cuid())
  companyId       String
  company         Company           @relation(fields: [companyId], references: [id])
  
  type            IntegrationType
  name            String            // ชื่อการเชื่อมต่อ
  config          Json              // API keys, endpoints, etc.
  
  isActive        Boolean           @default(true)
  lastSyncAt      DateTime?
  lastSyncStatus  String?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([companyId, type])
}

enum IntegrationType {
  ACCOUNTING_SOFTWARE  // PEAK, Express
  BANK_STATEMENT      // ดึงข้อมูลจากธนาคาร
  PAYMENT_GATEWAY     // PromptPay
  LINE_NOTIFY
  GOOGLE_DRIVE        // Backup
}

// Audit Log (บันทึกการเปลี่ยนแปลง)
model AuditLog {
  id              String            @id @default(cuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  
  action          AuditAction
  entityType      String            // "Expense", "Income", etc.
  entityId        String
  changes         Json?             // บันทึกการเปลี่ยนแปลง (before/after)
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime          @default(now())
  
  @@index([entityType, entityId])
  @@index([userId, createdAt])
  @@index([createdAt])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  STATUS_CHANGE
  APPROVE
  EXPORT
}
```

**Key considerations**:

- All money fields use `Decimal` type for precision
- Comprehensive indexing for query performance
- Soft delete capability via `isActive` flags
- Audit trail for compliance
- Flexible vendor/customer management
- WHT type enumeration for proper classification

### 1.3 Authentication & Authorization System

Implement NextAuth.js v5 with credential-based login, password hashing with bcrypt, session management, and role-based access control middleware.

**Key files**:

- `app/api/auth/[...nextauth]/route.ts` - Auth configuration
- `lib/auth.ts` - Auth utilities and middleware
- `lib/permissions.ts` - RBAC permission checks
- `middleware.ts` - Protected routes middleware

**Permission matrix**:

```typescript
// Example permission rules
ADMIN: full access to everything
ACCOUNTANT: read/write expenses & incomes, read-only users
STAFF: create expenses/incomes for assigned companies
VIEWER: read-only access
```

### 1.4 Security Implementation

- **Input Validation**: Zod schemas for all forms
- **File Upload Security**: Type checking (images only), size limits (5MB), virus scanning via ClamAV or similar
- **SQL Injection Prevention**: Prisma parameterized queries
- **XSS Prevention**: React's built-in escaping + CSP headers
- **CSRF Protection**: NextAuth CSRF tokens
- **Rate Limiting**: API route rate limiting
- **Environment Variables**: Secure secret management

**Key files**:

- `lib/validations/expense.ts` - Expense validation schemas
- `lib/validations/income.ts` - Income validation schemas
- `lib/security/file-upload.ts` - File upload security
- `lib/security/rate-limit.ts` - Rate limiting utilities

---

## Phase 2: Core Features - Quick Capture & Dashboard

### 2.1 Landing Page & Company Selector

Mobile-first landing page with large, thumb-friendly buttons for company selection. Persist selection in localStorage for quick access.

**Key files**:

- `app/page.tsx` - Landing page with company selector
- `components/company-selector.tsx` - Large button components
- `hooks/useCompany.tsx` - Company selection state management

**Design**:

- Giant buttons (min height 120px)
- Company logo/icon
- Color coding (Anajak = Blue, Meelike = Orange)
- Last selected company highlighted

### 2.2 Quick Capture Form - Expense Mode

Smart form with real-time tax calculation, instant VAT/WHT computation, category quick-select, and evidence upload with preview.

**Key files**:

- `app/[company]/capture/page.tsx` - Main capture page
- `components/expense-form.tsx` - Expense capture form
- `lib/utils/tax-calculator.ts` - VAT/WHT calculation logic
- `components/file-upload.tsx` - Multi-file upload component

**Features**:

- Amount input with number pad optimization
- Toggle switches for VAT (0% / 7%)
- Checkbox + dropdown for WHT rate selection
- Real-time Net Paid calculation display
- Category tag selection (Material, Utility, Marketing, etc.)
- Triple evidence upload: Slip + Invoice + WHT Certificate
- Status selector with helpful icons
- Vendor autocomplete from master data
- Description with common phrases autocomplete

**Calculation logic**:

```typescript
// Example: Amount 1,000 + VAT 7% - WHT 3%
Base: 1,000
VAT: 1,000 × 0.07 = 70
Subtotal: 1,070
WHT: 1,000 × 0.03 = 30 (หักจาก base, not subtotal)
Net Paid: 1,070 - 30 = 1,040
```

### 2.3 Quick Capture Form - Income Mode

Similar to expense mode but focused on receiving money, with WHT handling from customer perspective and document status tracking.

**Key files**:

- `components/income-form.tsx` - Income capture form
- `lib/utils/income-calculator.ts` - Income calculation logic

**Features**:

- Amount input with VAT option
- "โดนหัก ณ ที่จ่าย" checkbox with rate selection
- Net Received calculation
- Customer autocomplete
- Evidence upload: Customer slip + Our bill copy + WHT cert
- Status workflow: "ได้ใบ 50 ทวิ มาหรือยัง?"
- Invoice number tracking

### 2.4 File Upload & Storage

Implement secure file upload to Supabase Storage with image optimization, thumbnail generation, and CDN delivery.

**Key files**:

- `lib/storage/upload.ts` - File upload utilities
- `lib/storage/image-processor.ts` - Image compression
- `components/image-viewer.tsx` - Lightbox image viewer

**Features**:

- Direct camera capture on mobile
- Drag & drop on desktop
- Image compression (WebP format, max 1920px width)
- Thumbnail generation (200px)
- Progress indicator
- Multiple file upload
- Preview before submit
- Secure signed URLs

### 2.5 LINE Notification System

Real-time notifications to LINE group when transactions are created or status changes occur.

**Key files**:

- `lib/notifications/line-notify.ts` - LINE API integration
- `lib/notifications/templates.ts` - Message templates

**Message formats**:

```
[Anajak] 💸 รายจ่าย
ค่าจ้างกราฟิก: ฿5,000
หัก ณ ที่จ่าย 3% = ฿150
โอนจริง: ฿4,850
📄 รอใบ 50 ทวิ
---
[Meelike] 💰 รายรับ
ค่าสกรีนจาก บ.ยักษ์ใหญ่: ฿20,000
โดนหัก 3% = ฿600
🟠 ต้องทวงใบ 50 ทวิ!
```

### 2.6 Dashboard - Action Required Zone

Priority-based dashboard showing urgent items requiring attention, grouped by action type.

**Key files**:

- `app/[company]/dashboard/page.tsx` - Main dashboard
- `components/dashboard/action-required.tsx` - Urgent items widget
- `components/dashboard/ready-to-send.tsx` - Batch send widget
- `lib/queries/dashboard.ts` - Optimized dashboard queries

**Sections**:

1. **🔴 ด่วน! ต้องจัดการ (Action Required)**

   - `WAITING_FOR_DOC` - Show days waiting, sort by oldest first
   - `WAITING_WHT_CERT` - Critical tax items, highlight in red
   - `WAITING_ISSUE` - Forgot to issue invoice

2. **🟡 รอส่งบัญชี (Ready to Batch)**

   - `PENDING_PHYSICAL` - Physical documents in hand
   - `PENDING_COPY_SEND` - Complete document copies
   - Bulk action: "Mark as Sent" button

3. **📊 Quick Stats**

   - This month income/expense summary
   - Outstanding WHT amount
   - Document completion rate

4. **📅 Upcoming**

   - Recurring expenses due soon
   - Payment terms approaching due date

---

## Phase 3: Reporting & Analytics

### 3.1 Financial Reports

Comprehensive reporting module for tax compliance and business insights.

**Key files**:

- `app/[company]/reports/page.tsx` - Reports hub
- `components/reports/vat-report.tsx` - VAT summary
- `components/reports/wht-report.tsx` - WHT summary
- `components/reports/pnl.tsx` - Profit & Loss
- `lib/reports/generators.ts` - Report generation logic

**Reports to implement**:

**VAT Report (รายงานภาษีมูลค่าเพิ่ม)**:

- Input VAT (ภาษีซื้อ) from expenses
- Output VAT (ภาษีขาย) from incomes
- Net VAT payable/refundable
- Export format for ภ.พ.30 filing

**WHT Report (รายงานภาษีหัก ณ ที่จ่าย)**:

- WHT paid (เราหักเขา) - must remit to revenue dept
- WHT received (เขาหักเรา) - tax credit for us
- Grouped by WHT type
- Export format for ภ.ง.ด.53/54

**Monthly Summary**:

- Total income by category
- Total expense by category
- Net cash flow
- Month-over-month comparison
- Charts and visualizations

**Profit & Loss Statement**:

- Revenue (from Income)
- Cost of Goods Sold
- Gross Profit
- Operating Expenses
- Net Profit
- Export to PDF/Excel

### 3.2 Data Export & Integration

Excel export functionality with proper formatting for accountants to import into accounting software.

**Key files**:

- `lib/export/excel.ts` - Excel generation with ExcelJS
- `lib/export/pdf.ts` - PDF generation
- `components/export-dialog.tsx` - Export options UI

**Export formats**:

- Excel (.xlsx) with multiple sheets
- CSV for simple imports
- PDF for printing/sharing
- JSON for API consumers

**Column structure**:

```
Date | Invoice No | Vendor/Customer | Description | Amount | VAT | WHT | Net | Category | Status
```

### 3.3 Charts & Visualizations

Interactive charts using Recharts for visual insights.

**Key files**:

- `components/charts/cash-flow-chart.tsx`
- `components/charts/expense-category-chart.tsx`
- `components/charts/monthly-trend-chart.tsx`

**Chart types**:

- Line chart: Monthly cash flow trend
- Pie chart: Expense breakdown by category
- Bar chart: Income vs Expense comparison
- Area chart: Cumulative cash position

---

## Phase 4: Advanced Features

### 4.1 Budget Management

Set and track budgets by category and period with alerts when approaching limits.

**Key files**:

- `app/[company]/budgets/page.tsx`
- `components/budget-card.tsx`
- `lib/queries/budget-tracking.ts`

**Features**:

- Create budgets by category + period
- Real-time spending vs budget comparison
- Progress bars with color coding
- Alerts at 80% and 100% thresholds
- Historical budget performance

### 4.2 Recurring Expenses Automation

Automate creation of monthly recurring expenses like rent, utilities, subscriptions.

**Key files**:

- `app/[company]/recurring/page.tsx`
- `lib/cron/recurring-expenses.ts` - Automated creation job

**Features**:

- Define recurring expense templates
- Frequency selection (monthly, quarterly, yearly)
- Auto-generate on due date
- Notification when created
- Easy edit before saving

### 4.3 Customer & Vendor Management

Master data management for customers and vendors with credit terms tracking.

**Key files**:

- `app/[company]/vendors/page.tsx`
- `app/[company]/customers/page.tsx`
- `components/vendor-form.tsx`
- `components/customer-form.tsx`

**Features**:

- Add/edit/search vendors and customers
- Store contact info and tax ID
- Transaction history per vendor/customer
- Credit limit tracking for customers
- Payment terms management
- Quick select in capture forms

### 4.4 Audit Log Viewer

View complete audit trail of all changes for compliance and accountability.

**Key files**:

- `app/admin/audit-logs/page.tsx`
- `components/audit-log-table.tsx`

**Features**:

- Filter by user, date range, action type
- View before/after changes
- Export audit logs
- Search by entity ID

### 4.5 Mobile PWA Enhancement

Progressive Web App features for native-like mobile experience.

**Key files**:

- `public/manifest.json` - PWA manifest
- `app/service-worker.js` - Service worker for offline
- `components/install-prompt.tsx` - Install banner

**Features**:

- Install to home screen
- Offline mode with sync queue
- Push notifications (future)
- Camera integration for receipts
- Biometric authentication

---

## Phase 5: Future Growth - Custom ERP Modules

### 5.1 Module A: Anajak T-Shirt Factory Operations

**Job Order System**:

- Create job tickets from income records
- Specify: quantity, sizes, colors, screen positions, design files
- Print job tickets with QR codes
- Track job status (pending → in production → completed)

**Inventory Management**:

- T-shirt stock by size and color
- Auto-deduct stock when job created
- Low stock alerts via LINE
- Purchase order generation
- Stock valuation (FIFO/LIFO)

**Costing Calculator**:

- Formula: (design width × height) × ink consumption rate
- Material cost per item
- Labor cost estimation
- Gross margin calculation per order
- Pricing recommendations

**Key files**:

- `app/anajak/jobs/page.tsx`
- `app/anajak/inventory/page.tsx`
- `lib/costing/calculator.ts`

### 5.2 Module B: Meelike Digital Operations

**Automated Revenue Sync**:

- Cron job to pull daily top-ups from Meelike database
- Auto-create daily Income summary
- Reconciliation with bank deposits

**Provider Balance Tracker**:

- Monitor balance in foreign provider accounts
- Alert when balance low
- Auto-sync via provider APIs

**Real-time Profit Monitoring**:

- Revenue from Meelike database
- Cost from provider APIs
- Daily profit calculation
- Real-time dashboard with trend graphs

**Key files**:

- `lib/integrations/meelike-sync.ts`
- `lib/integrations/provider-api.ts`
- `app/meelike/profit-dashboard/page.tsx`

---

## Phase 6: DevOps & Deployment

### 6.1 Testing Strategy

**Unit Tests (Vitest)**:

- Tax calculation functions
- Form validations
- Business logic utilities

**Integration Tests**:

- API routes
- Database operations
- File uploads

**E2E Tests (Playwright)**:

- Complete expense/income workflows
- Dashboard interactions
- Report generation

**Key files**:

- `__tests__/unit/tax-calculator.test.ts`
- `__tests__/integration/expense-api.test.ts`
- `__tests__/e2e/capture-workflow.spec.ts`

### 6.2 CI/CD Pipeline

Set up GitHub Actions for automated testing, building, and deployment to Vercel.

**Key files**:

- `.github/workflows/ci.yml` - Run tests on PR
- `.github/workflows/deploy.yml` - Deploy to Vercel

**Pipeline stages**:

1. Lint code (ESLint + Prettier)
2. Run unit tests
3. Run integration tests
4. Build Next.js app
5. Deploy to staging
6. Run E2E tests on staging
7. Deploy to production

### 6.3 Monitoring & Logging

**Error Tracking**: Sentry for runtime errors

**Performance**: Vercel Analytics

**Logging**: Structured logs with Winston or Pino

**Uptime**: UptimeRobot or similar

**Key files**:

- `lib/monitoring/sentry.ts`
- `lib/logging/logger.ts`

### 6.4 Backup & Recovery

**Database Backups**:

- Daily automated backups via Supabase
- Retention: 30 days
- Test restore procedures monthly

**File Storage Backups**:

- Replicate Supabase Storage to Google Drive
- Weekly full backup
- Versioning enabled

**Disaster Recovery Plan**:

- Document restore procedures
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

---

## Phase 7: Documentation & Training

### 7.1 Technical Documentation

- Architecture overview
- Database schema documentation
- API documentation
- Deployment guide
- Troubleshooting guide

### 7.2 User Documentation

- User manual (Thai language)
- Video tutorials for key workflows
- FAQ section
- Quick reference cards

### 7.3 Training Materials

- Onboarding checklist for new users
- Best practices guide
- Tax compliance reminders
- Common mistakes to avoid

---

## Security Checklist

- [ ] Input validation on all forms
- [ ] File upload size and type restrictions
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention (CSP headers)
- [ ] CSRF tokens on all mutations
- [ ] Rate limiting on API routes
- [ ] Authentication on all protected routes
- [ ] Role-based authorization
- [ ] Audit logging for sensitive operations
- [ ] Secure environment variable management
- [ ] HTTPS only in production
- [ ] Secure session management
- [ ] Password complexity requirements
- [ ] Regular security audits

---

## Performance Optimization

- [ ] Database indexes on all foreign keys and query fields
- [ ] Image optimization and lazy loading
- [ ] Code splitting and dynamic imports
- [ ] Server-side rendering for initial page load
- [ ] Caching strategy (SWR for client, Redis for server)
- [ ] API response pagination
- [ ] Optimistic UI updates
- [ ] Debounced search inputs
- [ ] Virtualized lists for large datasets
- [ ] Bundle size optimization

---

## Compliance & Legal

- [ ] Data retention policy (5 years for accounting)
- [ ] PDPA compliance (personal data handling)
- [ ] Terms of service
- [ ] Privacy policy
- [ ] Cookie consent
- [ ] E-document readiness for future e-Tax Invoice
- [ ] Backup and recovery procedures documented
- [ ] User data export capability (GDPR-like)

---

## Project Structure

```
bill-tracker/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── [company]/
│   │   │   ├── dashboard/
│   │   │   ├── capture/
│   │   │   ├── expenses/
│   │   │   ├── incomes/
│   │   │   ├── reports/
│   │   │   ├── budgets/
│   │   │   ├── vendors/
│   │   │   └── customers/
│   │   └── admin/
│   │       ├── users/
│   │       ├── companies/
│   │       └── audit-logs/
│   ├── api/
│   │   ├── auth/
│   │   ├── expenses/
│   │   ├── incomes/
│   │   ├── reports/
│   │   └── upload/
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── forms/
│   ├── dashboard/
│   ├── charts/
│   └── reports/
├── lib/
│   ├── auth.ts
│   ├── db.ts (Prisma client)
│   ├── validations/
│   ├── utils/
│   ├── queries/
│   ├── mutations/
│   ├── notifications/
│   ├── export/
│   └── integrations/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── __tests__/
└── package.json
```

---

## Estimated Timeline

**Phase 1**: 3-4 weeks (Foundation, Database, Auth, Security)

**Phase 2**: 3-4 weeks (Core capture forms, Dashboard, LINE notify)

**Phase 3**: 2-3 weeks (Reporting, Export, Charts)

**Phase 4**: 2-3 weeks (Budget, Recurring, Vendor/Customer management)

**Phase 5**: 4-6 weeks (Custom ERP modules - Anajak & Meelike)

**Phase 6**: 1-2 weeks (Testing, CI/CD, Monitoring)

**Phase 7**: 1 week (Documentation, Training)

**Total MVP (Phase 1-3)**: 8-11 weeks

**Full System**: 16-23 weeks

---

## Success Criteria

- Zero data loss
- 100% document tracking accuracy
- < 2 second page load time
- 99.9% uptime
- Mobile responsive on all devices
- Positive user feedback on ease of use
- Successful tax filing with exported data
- All critical features tested with E2E tests