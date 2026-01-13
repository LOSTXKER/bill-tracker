# 🚀 Thai Accounting System - New Project Plan

> โปรเจกต์ใหม่ตั้งแต่ศูนย์ - ระบบบัญชีครบวงจรสำหรับ SME ไทย

**Created:** January 12, 2026  
**Project Name:** (TBD) - เลือกชื่อใหม่  
**Status:** Planning  
**Approach:** Start Fresh 🆕

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [Database Schema](#-database-schema)
5. [Feature Modules](#-feature-modules)
6. [Development Phases](#-development-phases)
7. [UI/UX Design](#-uiux-design)
8. [API Design](#-api-design)
9. [Security & Permissions](#-security--permissions)
10. [Deployment](#-deployment)
11. [Timeline](#-timeline)

---

## 🎯 Project Overview

### Vision
สร้างโปรแกรมบัญชีครบวงจรสำหรับ SME ไทย ที่:
- ใช้งานง่าย ไม่ต้องเป็นนักบัญชี
- ครบวงจร ตั้งแต่ซื้อ-ขาย จนถึงงบการเงิน
- ฟรี/ราคาถูก เทียบกับ PEAK
- มี AI ช่วยทำงาน

### Target Users
- SME ไทย (5-50 พนักงาน)
- ร้านค้าออนไลน์
- ธุรกิจบริการ
- Freelancer / โซโล่

### Competitive Advantages
| Feature | เรา | PEAK | Express |
|---------|-----|------|---------|
| ราคา | 🆓 Free / Low cost | 199-999/เดือน | 3,000+/ปี |
| AI OCR Receipt | ✅ | 💰 เพิ่มเงิน | ❌ |
| AI Fraud Detection | ✅ | ❌ | ❌ |
| LINE Bot | ✅ | ❌ | ❌ |
| Reimbursement | ✅ | ❌ | ❌ |
| Mobile First | ✅ | ✅ | ❌ |
| Open Source | ✅ | ❌ | ❌ |

---

## 🛠️ Tech Stack

### Frontend
```
Framework:    Next.js 15 (App Router)
Language:     TypeScript 5.x
Styling:      Tailwind CSS 4.x
Components:   shadcn/ui (latest)
State:        Zustand / Jotai
Forms:        React Hook Form + Zod
Charts:       Recharts / Chart.js
Tables:       TanStack Table
PDF:          React-PDF / @react-pdf/renderer
```

### Backend
```
Runtime:      Node.js 22 LTS
Framework:    Next.js API Routes / tRPC
ORM:          Prisma 6.x
Validation:   Zod
Auth:         NextAuth.js v5 / Lucia Auth
```

### Database
```
Primary:      PostgreSQL 16 (Supabase / Neon)
Cache:        Redis (optional)
Search:       PostgreSQL Full-text / Meilisearch
```

### AI & Services
```
AI/LLM:       Google Gemini 2.0
OCR:          Gemini Vision / Google Cloud Vision
Storage:      Supabase Storage / S3
Notifications: LINE Messaging API
Email:        Resend / SendGrid
```

### DevOps
```
Hosting:      Vercel / Railway
CI/CD:        GitHub Actions
Monitoring:   Vercel Analytics / Sentry
Testing:      Vitest + Playwright
```

---

## 📁 Project Structure

```
thai-accounting/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│       ├── accounts.ts      # Chart of Accounts
│       ├── demo-data.ts     # Demo company
│       └── index.ts
├── public/
│   ├── fonts/
│   ├── images/
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── [company]/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── accounting/
│   │   │   │   │   ├── journals/
│   │   │   │   │   ├── accounts/
│   │   │   │   │   └── ledger/
│   │   │   │   ├── sales/
│   │   │   │   │   ├── quotations/
│   │   │   │   │   ├── invoices/
│   │   │   │   │   ├── receipts/
│   │   │   │   │   └── customers/
│   │   │   │   ├── purchases/
│   │   │   │   │   ├── orders/
│   │   │   │   │   ├── bills/
│   │   │   │   │   ├── payments/
│   │   │   │   │   └── vendors/
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── products/
│   │   │   │   │   ├── stock/
│   │   │   │   │   └── warehouses/
│   │   │   │   ├── banking/
│   │   │   │   │   ├── accounts/
│   │   │   │   │   ├── transactions/
│   │   │   │   │   └── reconciliation/
│   │   │   │   ├── reports/
│   │   │   │   │   ├── financial/
│   │   │   │   │   ├── tax/
│   │   │   │   │   └── analytics/
│   │   │   │   ├── quick/           # Quick Entry
│   │   │   │   │   ├── expense/
│   │   │   │   │   ├── income/
│   │   │   │   │   └── capture/     # AI Capture
│   │   │   │   ├── reimbursements/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── companies/
│   │   │   ├── accounting/
│   │   │   ├── sales/
│   │   │   ├── purchases/
│   │   │   ├── inventory/
│   │   │   ├── banking/
│   │   │   ├── reports/
│   │   │   ├── ai/
│   │   │   ├── webhooks/
│   │   │   └── upload/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── forms/
│   │   │   ├── document-form.tsx
│   │   │   ├── journal-form.tsx
│   │   │   ├── contact-form.tsx
│   │   │   └── product-form.tsx
│   │   ├── tables/
│   │   │   ├── data-table.tsx
│   │   │   ├── document-table.tsx
│   │   │   └── journal-table.tsx
│   │   ├── documents/
│   │   │   ├── document-viewer.tsx
│   │   │   ├── pdf-preview.tsx
│   │   │   └── document-actions.tsx
│   │   ├── charts/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── company-switcher.tsx
│   │   └── shared/
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # Auth config
│   │   ├── utils.ts           # General utilities
│   │   ├── accounting/
│   │   │   ├── journal.ts     # Journal operations
│   │   │   ├── ledger.ts      # General ledger
│   │   │   ├── trial-balance.ts
│   │   │   ├── financial-statements.ts
│   │   │   └── closing.ts     # Period closing
│   │   ├── documents/
│   │   │   ├── numbering.ts   # Auto numbering
│   │   │   ├── workflow.ts    # Status workflow
│   │   │   └── pdf.ts         # PDF generation
│   │   ├── tax/
│   │   │   ├── vat.ts
│   │   │   ├── wht.ts
│   │   │   └── reports.ts
│   │   ├── ai/
│   │   │   ├── gemini.ts
│   │   │   ├── ocr.ts
│   │   │   ├── categorize.ts
│   │   │   └── fraud-detection.ts
│   │   ├── integrations/
│   │   │   ├── line.ts
│   │   │   ├── peak-export.ts
│   │   │   └── bank-import.ts
│   │   └── validations/
│   │       ├── document.ts
│   │       ├── journal.ts
│   │       └── contact.ts
│   ├── hooks/
│   │   ├── use-company.ts
│   │   ├── use-permissions.ts
│   │   ├── use-document.ts
│   │   └── use-toast.ts
│   ├── stores/
│   │   ├── company-store.ts
│   │   ├── cart-store.ts      # For line items
│   │   └── ui-store.ts
│   └── types/
│       ├── index.ts
│       ├── documents.ts
│       ├── accounting.ts
│       └── api.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── docker-compose.yml
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 🗃️ Database Schema

### Core Design Principles

1. **Double-entry from Day 1** - ทุก transaction ต้องมี Journal
2. **Unified Contact** - ไม่แยก Vendor/Customer
3. **Document-centric** - เอกสาร → Journal (auto)
4. **Multi-tenant** - รองรับหลายบริษัท
5. **Soft Delete** - ไม่ลบจริง แค่ mark deleted
6. **Audit Trail** - บันทึกทุกการเปลี่ยนแปลง

### Complete Schema

```prisma
// =============================================================================
// prisma/schema.prisma
// Thai Accounting System - Complete Schema
// =============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// 1. ORGANIZATION & USERS
// =============================================================================

model Company {
  id          String   @id @default(cuid())
  code        String   @unique          // ANJ, MLK
  name        String                    // บริษัท อนาจักร จำกัด
  nameTh      String?                   // ชื่อไทย
  nameEn      String?                   // ชื่ออังกฤษ
  
  // Tax Info
  taxId       String?                   // เลขประจำตัวผู้เสียภาษี 13 หลัก
  branchCode  String   @default("00000") // เลขสาขา
  vatRegistered Boolean @default(true)  // จดทะเบียน VAT
  
  // Address
  address     String?
  subDistrict String?
  district    String?
  province    String?
  postalCode  String?
  country     String   @default("Thailand")
  
  // Contact
  phone       String?
  email       String?
  website     String?
  
  // Branding
  logoUrl     String?
  
  // Settings
  currency    String   @default("THB")
  fiscalYearStart Int  @default(1)      // เดือนเริ่มปีบัญชี (1-12)
  settings    Json     @default("{}")   // Additional settings
  
  // Integrations
  lineChannelSecret      String?
  lineChannelAccessToken String?
  lineGroupId            String?
  
  // Relations
  members     CompanyMember[]
  contacts    Contact[]
  accounts    Account[]
  products    Product[]
  warehouses  Warehouse[]
  bankAccounts BankAccount[]
  documents   Document[]
  journals    JournalEntry[]
  sequences   DocumentSequence[]
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  @@index([code])
}

model User {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String
  password    String                    // bcrypt hashed
  avatarUrl   String?
  
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  
  // Relations
  companies   CompanyMember[]
  journals    JournalEntry[] @relation("JournalCreator")
  documents   Document[]     @relation("DocumentCreator")
  approvals   Document[]     @relation("DocumentApprover")
  auditLogs   AuditLog[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([email])
}

model CompanyMember {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  role        MemberRole @default(STAFF)
  permissions Json      @default("[]")  // Custom permissions
  isOwner     Boolean   @default(false)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
}

enum MemberRole {
  OWNER       // เจ้าของ - ทำได้ทุกอย่าง
  ADMIN       // แอดมิน - จัดการระบบ
  ACCOUNTANT  // นักบัญชี - จัดการบัญชี
  SALES       // ฝ่ายขาย - เอกสารขาย
  PURCHASE    // ฝ่ายจัดซื้อ - เอกสารซื้อ
  STAFF       // พนักงาน - บันทึกรายการ
  VIEWER      // ดูอย่างเดียว
}

// =============================================================================
// 2. CONTACTS (Unified Vendor/Customer)
// =============================================================================

model Contact {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Code & Sync
  code        String                    // C0001
  externalCode String?                  // รหัสจากระบบอื่น (PEAK)
  
  // Classification
  category    ContactCategory @default(VENDOR)
  entityType  EntityType      @default(COMPANY)
  
  // Basic Info
  name        String                    // ชื่อเต็ม/ชื่อบริษัท
  nameTh      String?                   // ชื่อไทย
  nameEn      String?                   // ชื่ออังกฤษ
  shortName   String?                   // ชื่อย่อ
  
  // For Individual
  prefix      String?                   // คำนำหน้า
  firstName   String?
  lastName    String?
  
  // Tax Info
  taxId       String?                   // เลขประจำตัวผู้เสียภาษี
  branchCode  String   @default("00000")
  
  // Address
  address     String?
  subDistrict String?
  district    String?
  province    String?
  postalCode  String?
  country     String   @default("Thailand")
  
  // Contact Info
  contactPerson String?
  phone       String?
  mobile      String?
  email       String?
  website     String?
  
  // Banking
  bankCode    String?
  bankName    String?
  bankBranch  String?
  bankAccountNo String?
  bankAccountName String?
  
  // Credit Terms (as Customer)
  customerCreditDays  Int?
  customerCreditLimit Decimal? @db.Decimal(14, 2)
  customerPriceLevel  String?
  
  // Credit Terms (as Vendor)
  vendorCreditDays    Int?
  vendorPaymentTerms  String?
  
  // Default Accounts
  arAccountId String?
  apAccountId String?
  
  notes       String?
  tags        String[]
  
  // Relations
  documents   Document[]
  journalLines JournalLine[]
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  @@unique([companyId, code])
  @@index([companyId, category])
  @@index([companyId, name])
  @@index([taxId])
}

enum ContactCategory {
  CUSTOMER    // ลูกค้า
  VENDOR      // ผู้จำหน่าย
  BOTH        // ทั้งคู่
  EMPLOYEE    // พนักงาน
  OTHER       // อื่นๆ
}

enum EntityType {
  INDIVIDUAL  // บุคคลธรรมดา
  COMPANY     // นิติบุคคล
  GOVERNMENT  // หน่วยงานราชการ
}

// =============================================================================
// 3. CHART OF ACCOUNTS
// =============================================================================

model Account {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  code        String                    // 110101
  name        String                    // เงินสด
  nameTh      String?
  nameEn      String?
  
  // Classification
  accountClass AccountClass
  accountType  AccountType
  
  // Hierarchy
  parentId    String?
  parent      Account?  @relation("AccountHierarchy", fields: [parentId], references: [id])
  children    Account[] @relation("AccountHierarchy")
  level       Int       @default(1)     // ระดับชั้น
  
  // Behavior
  normalBalance NormalBalance           // DEBIT or CREDIT
  isControl   Boolean   @default(false) // เป็นบัญชีคุม (AR, AP)
  isBank      Boolean   @default(false) // เป็นบัญชีธนาคาร
  isCash      Boolean   @default(false) // เป็นเงินสด
  
  // System
  systemType  SystemAccountType?        // ประเภทบัญชีระบบ
  isSystem    Boolean   @default(false) // ระบบสร้างให้
  isActive    Boolean   @default(true)
  
  description String?
  keywords    String[]                  // สำหรับ AI search
  
  // Relations
  journalLines JournalLine[]
  bankAccounts BankAccount[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, code])
  @@index([companyId, accountClass])
  @@index([companyId, isActive])
}

enum AccountClass {
  ASSET           // 1 - สินทรัพย์
  LIABILITY       // 2 - หนี้สิน
  EQUITY          // 3 - ส่วนของเจ้าของ
  REVENUE         // 4 - รายได้
  COST_OF_SALES   // 5 - ต้นทุนขาย
  EXPENSE         // 6 - ค่าใช้จ่าย
  OTHER_INCOME    // 7 - รายได้อื่น
  OTHER_EXPENSE   // 8 - ค่าใช้จ่ายอื่น
}

enum AccountType {
  // Assets
  CASH
  BANK
  ACCOUNTS_RECEIVABLE
  INVENTORY
  PREPAID
  FIXED_ASSET
  ACCUMULATED_DEPRECIATION
  OTHER_ASSET
  
  // Liabilities
  ACCOUNTS_PAYABLE
  ACCRUED_EXPENSE
  VAT_PAYABLE
  WHT_PAYABLE
  LOAN
  OTHER_LIABILITY
  
  // Equity
  CAPITAL
  RETAINED_EARNINGS
  CURRENT_EARNINGS
  
  // Revenue & Expense
  SALES_REVENUE
  SERVICE_REVENUE
  COST_OF_GOODS
  OPERATING_EXPENSE
  OTHER
}

enum NormalBalance {
  DEBIT
  CREDIT
}

enum SystemAccountType {
  CASH
  PETTY_CASH
  BANK
  AR_TRADE
  AR_OTHER
  AP_TRADE
  AP_OTHER
  VAT_INPUT
  VAT_OUTPUT
  WHT_PAYABLE
  WHT_RECEIVABLE
  INVENTORY
  RETAINED_EARNINGS
  CURRENT_EARNINGS
  SALES
  COGS
  DISCOUNT_GIVEN
  DISCOUNT_RECEIVED
}

// =============================================================================
// 4. PRODUCTS & INVENTORY
// =============================================================================

model Product {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  code        String                    // SKU
  barcode     String?
  name        String
  nameTh      String?
  nameEn      String?
  description String?
  
  type        ProductType @default(GOODS)
  category    String?
  brand       String?
  
  // Units
  baseUnit    String   @default("ชิ้น")
  
  // Pricing
  salePrice   Decimal  @db.Decimal(14, 2)
  costPrice   Decimal? @db.Decimal(14, 2)
  
  // Tax
  vatType     VatType  @default(VAT_7)
  
  // Inventory
  trackStock  Boolean  @default(true)
  minStock    Decimal? @db.Decimal(14, 4)
  maxStock    Decimal? @db.Decimal(14, 4)
  
  // Costing
  costingMethod CostingMethod @default(WEIGHTED_AVERAGE)
  
  // Accounts
  salesAccountId    String?
  cogsAccountId     String?
  inventoryAccountId String?
  
  // Current Stock (denormalized)
  currentStock Decimal @default(0) @db.Decimal(14, 4)
  currentValue Decimal @default(0) @db.Decimal(14, 2)
  averageCost  Decimal @default(0) @db.Decimal(14, 4)
  
  imageUrl    String?
  isActive    Boolean  @default(true)
  
  // Relations
  stockMovements StockMovement[]
  documentLines  DocumentLine[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  @@unique([companyId, code])
  @@index([companyId, type])
  @@index([barcode])
}

enum ProductType {
  GOODS       // สินค้า (track stock)
  SERVICE     // บริการ
  NON_STOCK   // ไม่นับสต็อก
  BUNDLE      // ชุดสินค้า
}

enum VatType {
  VAT_7       // VAT 7%
  VAT_0       // VAT 0%
  NO_VAT      // ไม่มี VAT
  EXEMPT      // ยกเว้น VAT
}

enum CostingMethod {
  FIFO
  WEIGHTED_AVERAGE
  SPECIFIC
}

model Warehouse {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  code        String
  name        String
  address     String?
  
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  
  stockMovements StockMovement[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, code])
}

model StockMovement {
  id          String   @id @default(cuid())
  companyId   String
  
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  
  movementDate DateTime
  movementType StockMoveType
  
  quantity    Decimal  @db.Decimal(14, 4)  // + รับ, - จ่าย
  unitCost    Decimal  @db.Decimal(14, 4)
  totalValue  Decimal  @db.Decimal(14, 2)
  
  // Running balance
  balanceQty  Decimal  @db.Decimal(14, 4)
  balanceValue Decimal @db.Decimal(14, 2)
  
  // Source
  documentId  String?
  document    Document? @relation(fields: [documentId], references: [id])
  
  reference   String?
  notes       String?
  
  createdBy   String
  createdAt   DateTime @default(now())
  
  @@index([productId, movementDate])
  @@index([warehouseId])
  @@index([documentId])
}

enum StockMoveType {
  RECEIVE       // รับเข้า (ซื้อ)
  ISSUE         // จ่ายออก (ขาย)
  ADJUST_IN     // ปรับเพิ่ม
  ADJUST_OUT    // ปรับลด
  TRANSFER_IN   // โอนเข้า
  TRANSFER_OUT  // โอนออก
  RETURN_IN     // รับคืน
  RETURN_OUT    // ส่งคืน
}

// =============================================================================
// 5. BANKING
// =============================================================================

model BankAccount {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  bankCode    String                    // BBL, KBANK, SCB
  bankName    String
  accountNo   String
  accountName String
  branch      String?
  
  accountType BankAccountType @default(SAVINGS)
  
  // Link to GL Account
  accountId   String
  account     Account  @relation(fields: [accountId], references: [id])
  
  // Balance
  openingBalance  Decimal @default(0) @db.Decimal(14, 2)
  currentBalance  Decimal @default(0) @db.Decimal(14, 2)
  
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  
  transactions BankTransaction[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, accountNo])
}

enum BankAccountType {
  SAVINGS     // ออมทรัพย์
  CURRENT     // กระแสรายวัน
  FIXED       // ฝากประจำ
}

model BankTransaction {
  id            String      @id @default(cuid())
  bankAccountId String
  bankAccount   BankAccount @relation(fields: [bankAccountId], references: [id])
  
  transactionDate DateTime
  valueDate     DateTime?
  
  type          BankTxType
  amount        Decimal     @db.Decimal(14, 2)
  runningBalance Decimal    @db.Decimal(14, 2)
  
  description   String?
  reference     String?
  
  // Reconciliation
  status        BankTxStatus @default(UNMATCHED)
  matchedDocumentId String?
  reconciledAt  DateTime?
  
  // Import tracking
  importBatchId String?
  externalId    String?     // ID จาก bank statement
  
  createdAt     DateTime @default(now())
  
  @@index([bankAccountId, transactionDate])
  @@index([status])
}

enum BankTxType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER_IN
  TRANSFER_OUT
  FEE
  INTEREST
  CHEQUE_IN
  CHEQUE_OUT
}

enum BankTxStatus {
  UNMATCHED     // ยังไม่จับคู่
  MATCHED       // จับคู่แล้ว
  RECONCILED    // กระทบยอดแล้ว
  EXCLUDED      // ไม่นำมาคิด
}

// =============================================================================
// 6. DOCUMENTS (Unified Sales/Purchase/Quick)
// =============================================================================

model Document {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Document Identity
  docType     DocumentType
  docNo       String
  docDate     DateTime
  
  // Contact
  contactId   String?
  contact     Contact? @relation(fields: [contactId], references: [id])
  contactName String?                   // สำหรับ one-time contact
  
  // Reference
  refDocId    String?                   // QO → IV, IV → RC
  refDoc      Document? @relation("DocRef", fields: [refDocId], references: [id])
  linkedDocs  Document[] @relation("DocRef")
  
  externalRef String?                   // เลขอ้างอิงภายนอก (เลขบิลซัพพลาย)
  
  // Terms
  dueDate     DateTime?
  creditDays  Int?
  
  // Description
  description String?
  
  // Amounts
  subtotal    Decimal  @db.Decimal(14, 2)
  
  discountType  DiscountType @default(PERCENT)
  discountValue Decimal? @db.Decimal(14, 2)
  discountAmount Decimal? @db.Decimal(14, 2)
  
  amountBeforeVat Decimal @db.Decimal(14, 2)
  
  vatType     VatType  @default(VAT_7)
  vatRate     Int      @default(7)
  vatAmount   Decimal  @db.Decimal(14, 2)
  
  // WHT
  hasWht      Boolean  @default(false)
  whtRate     Decimal? @db.Decimal(5, 2)
  whtAmount   Decimal? @db.Decimal(14, 2)
  whtType     WhtType?
  
  grandTotal  Decimal  @db.Decimal(14, 2)
  
  // Payment tracking (for AR/AP)
  paidAmount  Decimal  @default(0) @db.Decimal(14, 2)
  balanceDue  Decimal  @db.Decimal(14, 2)
  
  // Payment info (for quick entry / payment doc)
  paymentMethod PaymentMethod?
  bankAccountId String?
  paymentRef  String?
  
  // Status
  status      DocumentStatus @default(DRAFT)
  
  // Accounting
  journalId   String?  @unique
  journal     JournalEntry? @relation(fields: [journalId], references: [id])
  accountId   String?                   // Default account (for quick entry)
  
  // Lines
  lines       DocumentLine[]
  
  // Attachments
  attachments Json     @default("[]")   // Array of URLs
  
  // Notes
  notes       String?
  internalNotes String?
  
  // Print tracking
  printCount  Int      @default(0)
  lastPrintedAt DateTime?
  
  // Workflow
  createdBy   String
  creator     User     @relation("DocumentCreator", fields: [createdBy], references: [id])
  approvedBy  String?
  approver    User?    @relation("DocumentApprover", fields: [approvedBy], references: [id])
  approvedAt  DateTime?
  
  // Stock
  stockMovements StockMovement[]
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  deletedBy   String?
  
  @@unique([companyId, docType, docNo])
  @@index([companyId, docType, status])
  @@index([companyId, contactId])
  @@index([companyId, docDate])
  @@index([dueDate])
  @@index([status])
}

model DocumentLine {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  lineNo      Int
  
  // Product (optional)
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  
  description String
  
  quantity    Decimal  @db.Decimal(14, 4)
  unit        String?
  unitPrice   Decimal  @db.Decimal(14, 2)
  
  discountType  DiscountType @default(PERCENT)
  discountValue Decimal? @db.Decimal(14, 2)
  discountAmount Decimal? @db.Decimal(14, 2)
  
  amount      Decimal  @db.Decimal(14, 2)
  
  // Account override
  accountId   String?
  
  // For WHT per line
  whtRate     Decimal? @db.Decimal(5, 2)
  whtAmount   Decimal? @db.Decimal(14, 2)
  
  @@index([documentId])
}

enum DocumentType {
  // Quick Entry
  QUICK_EXPENSE     // รายจ่ายด่วน
  QUICK_INCOME      // รายรับด่วน
  
  // Sales
  QUOTATION         // QO - ใบเสนอราคา
  SALES_ORDER       // SO - ใบสั่งขาย
  INVOICE           // IV - ใบแจ้งหนี้/ใบกำกับภาษี
  RECEIPT           // RC - ใบเสร็จรับเงิน
  SALES_CREDIT_NOTE // CN - ใบลดหนี้
  SALES_DEBIT_NOTE  // DN - ใบเพิ่มหนี้
  
  // Purchase
  PURCHASE_REQUEST  // PR - ใบขอซื้อ
  PURCHASE_ORDER    // PO - ใบสั่งซื้อ
  GOODS_RECEIPT     // GR - ใบรับสินค้า
  PURCHASE_INVOICE  // PI - บันทึกบิลซื้อ
  PAYMENT_VOUCHER   // PV - ใบสำคัญจ่าย
  PURCHASE_CN       // PCN - ใบลดหนี้จากผู้ขาย
  
  // Other
  JOURNAL_VOUCHER   // JV - ใบสำคัญทั่วไป
  REIMBURSEMENT     // RB - เบิกจ่าย
}

enum DocumentStatus {
  DRAFT             // ร่าง
  PENDING_APPROVAL  // รออนุมัติ
  APPROVED          // อนุมัติแล้ว
  PARTIAL           // บางส่วน (partial payment/delivery)
  COMPLETED         // เสร็จสมบูรณ์
  CANCELLED         // ยกเลิก
  EXPIRED           // หมดอายุ
  REJECTED          // ถูกปฏิเสธ
}

enum DiscountType {
  PERCENT
  AMOUNT
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CREDIT_CARD
  PROMPTPAY
  CHEQUE
  CREDIT            // เครดิต (ยังไม่จ่าย)
}

enum WhtType {
  WHT_3_SERVICE     // ค่าบริการ 3%
  WHT_3_TRANSPORT   // ค่าขนส่ง 3% (ไม่ใช่สาธารณะ)
  WHT_1_TRANSPORT   // ค่าขนส่ง 1% (สาธารณะ)
  WHT_1_ADVERTISING // ค่าโฆษณา 1%
  WHT_2_ADVERTISING // ค่าโฆษณา 2%
  WHT_5_RENT        // ค่าเช่า 5%
  WHT_5_PROFESSIONAL // ค่าวิชาชีพ 5%
  WHT_10_OTHER      // อื่นๆ 10%
}

// =============================================================================
// 7. JOURNAL ENTRIES (Double-entry Bookkeeping)
// =============================================================================

model JournalEntry {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Document
  entryNo     String                    // JV2026-0001
  entryDate   DateTime
  
  // Source
  sourceType  JournalSourceType
  sourceId    String?                   // ID of source document
  sourceDoc   Document?
  
  description String?
  reference   String?
  
  // Totals
  totalDebit  Decimal  @db.Decimal(14, 2)
  totalCredit Decimal  @db.Decimal(14, 2)
  
  // Status
  status      JournalStatus @default(DRAFT)
  postedAt    DateTime?
  postedBy    String?
  
  // Lines
  lines       JournalLine[]
  
  // Audit
  createdBy   String
  creator     User     @relation("JournalCreator", fields: [createdBy], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  voidedAt    DateTime?
  voidedBy    String?
  voidReason  String?
  
  @@unique([companyId, entryNo])
  @@unique([sourceType, sourceId])
  @@index([companyId, entryDate])
  @@index([companyId, status])
}

model JournalLine {
  id          String       @id @default(cuid())
  journalId   String
  journal     JournalEntry @relation(fields: [journalId], references: [id], onDelete: Cascade)
  
  lineNo      Int
  
  accountId   String
  account     Account      @relation(fields: [accountId], references: [id])
  
  debit       Decimal      @default(0) @db.Decimal(14, 2)
  credit      Decimal      @default(0) @db.Decimal(14, 2)
  
  description String?
  
  // For AR/AP
  contactId   String?
  contact     Contact?     @relation(fields: [contactId], references: [id])
  dueDate     DateTime?
  
  @@index([journalId])
  @@index([accountId])
}

enum JournalSourceType {
  MANUAL
  QUICK_EXPENSE
  QUICK_INCOME
  INVOICE
  RECEIPT
  SALES_CN
  PURCHASE_INVOICE
  PAYMENT_VOUCHER
  PURCHASE_CN
  STOCK_ADJUST
  DEPRECIATION
  CLOSING
  OPENING
}

enum JournalStatus {
  DRAFT
  POSTED
  VOID
}

// =============================================================================
// 8. DOCUMENT NUMBERING
// =============================================================================

model DocumentSequence {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  docType     String                    // QO, IV, PO, JV
  prefix      String                    // Customizable prefix
  
  yearFormat  String   @default("YYYY") // YYYY or YY
  separator   String   @default("-")
  digitCount  Int      @default(4)
  
  currentYear Int
  lastNumber  Int      @default(0)
  
  // Example: IV2026-0001
  
  @@unique([companyId, docType])
}

// =============================================================================
// 9. FIXED ASSETS & DEPRECIATION
// =============================================================================

model FixedAsset {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Basic Info
  assetNo     String                    // รหัสทรัพย์สิน FA-0001
  name        String
  description String?
  
  category    AssetCategory
  location    String?
  serialNo    String?
  
  // Acquisition
  acquisitionDate  DateTime
  acquisitionCost  Decimal  @db.Decimal(14, 2)
  acquisitionMethod AcquisitionMethod @default(PURCHASE)
  
  // Source document
  documentId  String?
  
  // Depreciation Settings
  depreciationMethod DepreciationMethod @default(STRAIGHT_LINE)
  usefulLifeYears    Int                // อายุการใช้งาน (ปี)
  usefulLifeMonths   Int     @default(0)
  residualValue      Decimal @db.Decimal(14, 2)  // มูลค่าซาก
  
  depreciationStartDate DateTime
  
  // Current Values (denormalized)
  accumulatedDepreciation Decimal @default(0) @db.Decimal(14, 2)
  bookValue               Decimal @db.Decimal(14, 2)  // ราคาตามบัญชี
  
  // Accounts
  assetAccountId           String   // บัญชีทรัพย์สิน
  depreciationAccountId    String   // บัญชีค่าเสื่อมราคา
  accumDepreciationAccountId String // บัญชีค่าเสื่อมราคาสะสม
  
  // Status
  status      AssetStatus @default(ACTIVE)
  disposalDate    DateTime?
  disposalPrice   Decimal?  @db.Decimal(14, 2)
  disposalMethod  String?
  disposalReason  String?
  
  // Photo
  imageUrl    String?
  
  // Relations
  depreciationSchedule DepreciationSchedule[]
  
  // Audit
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, assetNo])
  @@index([companyId, category])
  @@index([companyId, status])
}

model DepreciationSchedule {
  id          String     @id @default(cuid())
  assetId     String
  asset       FixedAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  periodYear  Int                       // ปี
  periodMonth Int                       // เดือน
  
  openingValue     Decimal @db.Decimal(14, 2)  // มูลค่าต้นงวด
  depreciationAmt  Decimal @db.Decimal(14, 2)  // ค่าเสื่อมราคางวดนี้
  closingValue     Decimal @db.Decimal(14, 2)  // มูลค่าปลายงวด
  
  // Journal reference
  journalId   String?
  
  isPosted    Boolean   @default(false)
  postedAt    DateTime?
  
  createdAt   DateTime  @default(now())
  
  @@unique([assetId, periodYear, periodMonth])
  @@index([assetId])
}

enum AssetCategory {
  LAND                  // ที่ดิน (ไม่คิดค่าเสื่อม)
  BUILDING              // อาคาร
  BUILDING_IMPROVEMENT  // ส่วนปรับปรุงอาคาร
  MACHINERY             // เครื่องจักร
  EQUIPMENT             // อุปกรณ์
  FURNITURE             // เครื่องตกแต่ง
  VEHICLE               // ยานพาหนะ
  COMPUTER              // คอมพิวเตอร์
  SOFTWARE              // ซอฟต์แวร์
  LEASEHOLD             // สิทธิการเช่า
  OTHER                 // อื่นๆ
}

enum DepreciationMethod {
  STRAIGHT_LINE         // เส้นตรง
  DECLINING_BALANCE     // ยอดลดลง
  DOUBLE_DECLINING      // ยอดลดลงทวีคูณ
  SUM_OF_YEARS          // ผลรวมจำนวนปี
  UNITS_OF_PRODUCTION   // ตามหน่วยผลิต
}

enum AcquisitionMethod {
  PURCHASE              // ซื้อ
  DONATION              // รับบริจาค
  TRANSFER              // รับโอน
  LEASE                 // เช่าซื้อ
  SELF_CONSTRUCTED      // สร้างเอง
}

enum AssetStatus {
  ACTIVE                // ใช้งานอยู่
  IDLE                  // ไม่ได้ใช้งาน
  UNDER_REPAIR          // ซ่อมบำรุง
  DISPOSED              // จำหน่ายแล้ว
  WRITTEN_OFF           // ตัดจำหน่าย
  LOST                  // สูญหาย
}

// =============================================================================
// 10. PETTY CASH
// =============================================================================

model PettyCash {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  code        String                    // PC-001
  name        String                    // เงินสดย่อยสำนักงาน
  
  // Link to GL Account
  accountId   String
  
  // Fund Settings
  fundLimit   Decimal  @db.Decimal(14, 2)  // วงเงิน
  minBalance  Decimal? @db.Decimal(14, 2)  // ยอดขั้นต่ำก่อนเติม
  
  // Current Balance (denormalized)
  currentBalance Decimal @db.Decimal(14, 2)
  
  // Custodian (ผู้รักษาเงิน)
  custodianId String?
  custodianName String?
  
  isActive    Boolean  @default(true)
  
  // Relations
  transactions PettyCashTransaction[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, code])
}

model PettyCashTransaction {
  id          String    @id @default(cuid())
  pettyCashId String
  pettyCash   PettyCash @relation(fields: [pettyCashId], references: [id], onDelete: Cascade)
  
  transactionDate DateTime
  type        PettyCashTxType
  
  amount      Decimal   @db.Decimal(14, 2)
  runningBalance Decimal @db.Decimal(14, 2)
  
  description String
  reference   String?
  
  // สำหรับ EXPENSE
  accountId   String?   // บัญชีค่าใช้จ่าย
  contactId   String?
  receiptNo   String?
  receiptUrl  String?
  
  // สำหรับ REPLENISH
  replenishDocId String? // Link to payment document
  
  // Journal
  journalId   String?
  
  createdBy   String
  createdAt   DateTime  @default(now())
  
  @@index([pettyCashId, transactionDate])
}

enum PettyCashTxType {
  SETUP         // ตั้งวงเงิน
  REPLENISH     // เติมเงิน
  EXPENSE       // จ่ายเงิน
  RETURN        // คืนเงิน
  ADJUST        // ปรับปรุง
}

// =============================================================================
// 11. MULTI-CURRENCY
// =============================================================================

model Currency {
  id          String   @id @default(cuid())
  code        String   @unique           // THB, USD, EUR, JPY
  name        String                     // Thai Baht
  nameTh      String?                    // บาทไทย
  symbol      String                     // ฿, $, €, ¥
  
  decimalPlaces Int    @default(2)
  
  isBase      Boolean  @default(false)   // THB = true
  isActive    Boolean  @default(true)
  
  // Relations
  exchangeRates ExchangeRate[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ExchangeRate {
  id          String   @id @default(cuid())
  companyId   String
  
  currencyId  String
  currency    Currency @relation(fields: [currencyId], references: [id])
  
  effectiveDate DateTime
  
  // Rates to Base Currency (THB)
  buyingRate  Decimal  @db.Decimal(14, 6)   // อัตราซื้อ
  sellingRate Decimal  @db.Decimal(14, 6)   // อัตราขาย
  midRate     Decimal  @db.Decimal(14, 6)   // อัตรากลาง
  
  source      String?                       // BOT, Manual
  
  createdAt   DateTime @default(now())
  
  @@unique([companyId, currencyId, effectiveDate])
  @@index([companyId, effectiveDate])
}

// Add to Document model (virtual fields):
// currencyCode    String   @default("THB")
// exchangeRate    Decimal  @default(1) @db.Decimal(14, 6)
// amountForeign   Decimal? @db.Decimal(14, 2)  // ยอดเงินสกุลต่างประเทศ
// amountBase      Decimal  @db.Decimal(14, 2)  // ยอดเงินสกุลหลัก (THB)

// =============================================================================
// 12. BUDGET
// =============================================================================

model Budget {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name        String                     // งบประมาณปี 2026
  description String?
  
  fiscalYear  Int                        // 2026
  startDate   DateTime
  endDate     DateTime
  
  status      BudgetStatus @default(DRAFT)
  
  // Relations
  lines       BudgetLine[]
  
  // Approval
  approvedBy  String?
  approvedAt  DateTime?
  
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, fiscalYear, name])
}

model BudgetLine {
  id          String   @id @default(cuid())
  budgetId    String
  budget      Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  
  accountId   String                     // บัญชี
  
  // Monthly budgets
  month1      Decimal  @default(0) @db.Decimal(14, 2)  // มกราคม
  month2      Decimal  @default(0) @db.Decimal(14, 2)
  month3      Decimal  @default(0) @db.Decimal(14, 2)
  month4      Decimal  @default(0) @db.Decimal(14, 2)
  month5      Decimal  @default(0) @db.Decimal(14, 2)
  month6      Decimal  @default(0) @db.Decimal(14, 2)
  month7      Decimal  @default(0) @db.Decimal(14, 2)
  month8      Decimal  @default(0) @db.Decimal(14, 2)
  month9      Decimal  @default(0) @db.Decimal(14, 2)
  month10     Decimal  @default(0) @db.Decimal(14, 2)
  month11     Decimal  @default(0) @db.Decimal(14, 2)
  month12     Decimal  @default(0) @db.Decimal(14, 2)  // ธันวาคม
  
  annualTotal Decimal  @default(0) @db.Decimal(14, 2)  // รวมทั้งปี
  
  notes       String?
  
  @@unique([budgetId, accountId])
  @@index([budgetId])
}

enum BudgetStatus {
  DRAFT       // ร่าง
  PENDING     // รออนุมัติ
  APPROVED    // อนุมัติแล้ว
  ACTIVE      // ใช้งาน
  CLOSED      // ปิด
}

// =============================================================================
// 13. UNIT CONVERSION (for Products)
// =============================================================================

model ProductUnit {
  id          String   @id @default(cuid())
  companyId   String
  
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  unitName    String                     // กล่อง, โหล, แพ็ค
  
  // Conversion to base unit
  conversionRate Decimal @db.Decimal(14, 6)  // 1 กล่อง = 12 ชิ้น
  
  // Pricing for this unit
  salePrice   Decimal? @db.Decimal(14, 2)
  costPrice   Decimal? @db.Decimal(14, 2)
  
  barcode     String?
  
  isDefault   Boolean  @default(false)   // หน่วยหลัก
  isActive    Boolean  @default(true)
  
  @@unique([productId, unitName])
  @@index([productId])
  @@index([barcode])
}

// =============================================================================
// 14. CHEQUE MANAGEMENT
// =============================================================================

model Cheque {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  type        ChequeType                 // RECEIVE (รับ) / PAY (จ่าย)
  
  // Cheque Details
  chequeNo    String
  bankCode    String
  bankName    String
  branch      String?
  
  // Amount
  amount      Decimal  @db.Decimal(14, 2)
  
  // Dates
  chequeDate  DateTime                   // วันที่บนเช็ค
  dueDate     DateTime                   // วันขึ้นเงิน
  
  // Parties
  contactId   String?
  contactName String?
  
  // For RECEIVE: ผู้สั่งจ่าย
  payerName   String?
  
  // For PAY: ผู้รับเงิน
  payeeName   String?
  
  // Status
  status      ChequeStatus @default(PENDING)
  
  // When deposited/cashed
  depositDate     DateTime?
  depositBankAccountId String?
  
  // When bounced
  bounceDate      DateTime?
  bounceReason    String?
  
  // When cancelled
  cancelDate      DateTime?
  cancelReason    String?
  
  // Source document
  documentId  String?
  
  // Journal
  journalId   String?
  
  notes       String?
  imageUrl    String?
  
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([companyId, type, status])
  @@index([companyId, dueDate])
  @@index([chequeNo])
}

enum ChequeType {
  RECEIVE     // เช็ครับ
  PAY         // เช็คจ่าย
}

enum ChequeStatus {
  PENDING     // รอขึ้นเงิน
  DEPOSITED   // นำฝากแล้ว
  CLEARED     // เคลียร์แล้ว
  BOUNCED     // เช็คคืน
  CANCELLED   // ยกเลิก
  REPLACED    // เปลี่ยนเช็คใหม่
}

// =============================================================================
// 15. STOCK COUNT (Physical Inventory)
// =============================================================================

model StockCount {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  countNo     String                     // SC2026-0001
  countDate   DateTime
  
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  
  description String?
  
  status      StockCountStatus @default(DRAFT)
  
  // Relations
  lines       StockCountLine[]
  
  // Summary (denormalized)
  totalItems      Int     @default(0)
  totalVariance   Decimal @default(0) @db.Decimal(14, 2)
  
  // Workflow
  countedBy   String?
  countedAt   DateTime?
  
  approvedBy  String?
  approvedAt  DateTime?
  
  // Journal for adjustment
  adjustmentJournalId String?
  
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, countNo])
  @@index([companyId, status])
}

model StockCountLine {
  id          String     @id @default(cuid())
  stockCountId String
  stockCount  StockCount @relation(fields: [stockCountId], references: [id], onDelete: Cascade)
  
  productId   String
  
  // System quantity (from stock card)
  systemQty   Decimal  @db.Decimal(14, 4)
  systemValue Decimal  @db.Decimal(14, 2)
  
  // Actual counted
  countedQty  Decimal? @db.Decimal(14, 4)
  
  // Variance
  varianceQty   Decimal? @db.Decimal(14, 4)  // counted - system
  varianceValue Decimal? @db.Decimal(14, 2)
  variancePercent Decimal? @db.Decimal(5, 2)
  
  // Reason for variance
  reason      String?
  
  // Unit cost at count time
  unitCost    Decimal  @db.Decimal(14, 4)
  
  notes       String?
  
  @@unique([stockCountId, productId])
  @@index([stockCountId])
}

enum StockCountStatus {
  DRAFT       // ร่าง
  IN_PROGRESS // กำลังนับ
  COUNTED     // นับเสร็จ
  APPROVED    // อนุมัติแล้ว
  ADJUSTED    // ปรับปรุงแล้ว
  CANCELLED   // ยกเลิก
}

// =============================================================================
// 16. AUDIT LOG
// =============================================================================

model AuditLog {
  id          String   @id @default(cuid())
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  companyId   String?
  
  action      AuditAction
  entityType  String                    // Document, JournalEntry, Contact
  entityId    String
  
  changes     Json?                     // { before: {}, after: {} }
  description String?
  
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  @@index([companyId, createdAt])
  @@index([entityType, entityId])
  @@index([userId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  APPROVE
  REJECT
  POST
  VOID
  PRINT
  EXPORT
  LOGIN
  LOGOUT
}
```

---

## 📦 Feature Modules

### Module Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FEATURE MODULES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   QUICK      │  │    SALES     │  │   PURCHASE   │  │   PETTY      │    │
│  │   ENTRY      │  │   MODULE     │  │    MODULE    │  │   CASH       │    │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤    │
│  │ • Expense    │  │ • Quotation  │  │ • PO         │  │ • Fund Setup │    │
│  │ • Income     │  │ • Invoice    │  │ • GR         │  │ • Expense    │    │
│  │ • AI Capture │  │ • Receipt    │  │ • Bill       │  │ • Replenish  │    │
│  │ • Reimburse  │  │ • CN/DN      │  │ • Payment    │  │ • Report     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│                   ┌──────────────────────────────┐                          │
│                   │     ACCOUNTING ENGINE        │                          │
│                   ├──────────────────────────────┤                          │
│                   │ • Auto Journal               │                          │
│                   │ • General Ledger             │                          │
│                   │ • Trial Balance              │                          │
│                   │ • Financial Statements       │                          │
│                   │ • Budget vs Actual           │                          │
│                   └──────────────────────────────┘                          │
│                                    │                                         │
│    ┌───────────────┬───────────────┼───────────────┬───────────────┐        │
│    ▼               ▼               ▼               ▼               ▼        │
│ ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│ │INVENTORY│  │ BANKING  │  │ CHEQUE   │  │  FIXED   │  │ REPORTS  │       │
│ ├─────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤       │
│ │•Products│  │•Accounts │  │•Receive  │  │•Assets   │  │•Financial│       │
│ │•Stock   │  │•Reconcile│  │•Pay      │  │•Deprec.  │  │•Tax      │       │
│ │•Count   │  │•Cash Flow│  │•Tracking │  │•Disposal │  │•AR/AP    │       │
│ │•Units   │  │          │  │          │  │          │  │•Budget   │       │
│ └─────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                              │
│                        ┌──────────────────────┐                             │
│                        │   MULTI-CURRENCY     │                             │
│                        ├──────────────────────┤                             │
│                        │ • Currency Setup     │                             │
│                        │ • Exchange Rates     │                             │
│                        │ • Forex Gain/Loss    │                             │
│                        └──────────────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Priority Order

| Priority | Module | Description | Dependency |
|----------|--------|-------------|------------|
| 🔴 P0 | Core Setup | Auth, Company, Permissions | - |
| 🔴 P0 | Chart of Accounts | ผังบัญชี | Core |
| 🔴 P0 | Contacts | ผู้ติดต่อ | Core |
| 🔴 P0 | Journal Engine | Auto-journal, Ledger | Accounts |
| 🟠 P1 | Quick Entry | Expense, Income | Journal |
| 🟠 P1 | Sales | QO, IV, RC, AR Aging | Journal, Contacts |
| 🟠 P1 | Purchase | PO, Bill, Payment, AP Aging | Journal, Contacts |
| 🟡 P2 | Products | สินค้า + Unit Conversion | Core |
| 🟡 P2 | Inventory | Stock movements, Stock Count | Products |
| 🟡 P2 | Banking | Bank accounts, Reconcile | Accounts |
| 🟡 P2 | Petty Cash | เงินสดย่อย | Banking |
| 🟡 P2 | Cheque | เช็ครับ/จ่าย | Banking |
| 🟡 P2 | Reports | Financial, Tax, AR/AP Aging | All |
| 🟢 P3 | Fixed Assets | ทรัพย์สิน + ค่าเสื่อมราคา | Accounts |
| 🟢 P3 | Budget | งบประมาณ + เปรียบเทียบ | Accounts |
| 🟢 P3 | Multi-currency | หลายสกุลเงิน | Core |
| 🟢 P3 | AI Features | OCR, Categorize, Fraud | Quick Entry |
| 🟢 P3 | Integrations | LINE, PEAK Export | All |

---

## 📅 Development Phases

### Phase 0: Project Setup (Week 1)

```
□ Initialize Next.js 15 project
□ Configure TypeScript, ESLint, Prettier
□ Install and configure Tailwind + shadcn/ui
□ Setup Prisma with PostgreSQL (Supabase)
□ Configure NextAuth.js v5
□ Create project structure
□ Setup CI/CD with GitHub Actions
□ Deploy initial version to Vercel
□ Setup Supabase Storage
```

### Phase 1: Core Foundation (Week 2-3)

```
□ Company CRUD + Settings
□ User management + Avatar
□ Member roles & permissions (RBAC)
□ Contact management (unified Vendor/Customer)
□ Chart of Accounts with default seeding
□ Currency setup (THB as base)
□ Basic dashboard layout
□ Company switcher
□ Theme (light/dark)
```

### Phase 2: Accounting Engine (Week 4-5)

```
□ Journal Entry model & API
□ Journal Line with AR/AP tracking
□ Auto-journal generator functions
□ Validation (Debit = Credit)
□ Document Sequence (auto numbering)
□ General Ledger view
□ Trial Balance
□ Period closing
□ Opening Balance entry
```

### Phase 3: Quick Entry (Week 6-7)

```
□ Quick Expense form
□ Quick Income form
□ Auto-journal from quick entry
□ Reimbursement workflow
□ Document listing with filters
□ Search by multiple fields
□ File attachments (receipts)
□ Export to Excel
```

### Phase 4: Sales Module (Week 8-10)

```
□ Quotation CRUD + PDF print
□ Invoice CRUD (from QO or direct)
□ Tax Invoice format
□ Receipt CRUD (from Invoice)
□ Credit Note / Debit Note
□ AR tracking + balanceDue
□ AR Aging Report (Current/30/60/90/120+)
□ Payment recording
□ Customer statement
□ Document copying
```

### Phase 5: Purchase Module (Week 11-13)

```
□ Purchase Order CRUD + PDF
□ Goods Receipt (from PO)
□ Purchase Invoice (Bill) CRUD
□ Payment Voucher + WHT
□ WHT calculation & ภ.ง.ด.3/53 print
□ AP tracking + balanceDue
□ AP Aging Report
□ Vendor payment schedule
```

### Phase 6: Inventory (Week 14-16)

```
□ Product management (Goods/Service/Non-stock)
□ Product Unit conversion (box, dozen, pack)
□ Barcode support
□ Warehouse setup (multi-warehouse)
□ Stock movements (receive/issue/adjust/transfer)
□ Stock Card view
□ Costing (Weighted Average / FIFO)
□ Stock Count (physical inventory)
□ Stock adjustment from count
□ Low stock alerts
□ Stock valuation report
```

### Phase 7: Banking & Cash (Week 17-19)

```
□ Bank account management
□ Link to GL Account
□ Bank transactions recording
□ Statement import (CSV/Excel)
□ Bank reconciliation
□ Petty Cash fund setup
□ Petty Cash transactions
□ Petty Cash replenishment
□ Cheque receive tracking
□ Cheque pay tracking
□ Cheque status management (clear/bounce)
□ Cash flow view
```

### Phase 8: Fixed Assets (Week 20-21)

```
□ Fixed Asset register
□ Asset categories (Land, Building, Equipment, etc.)
□ Acquisition recording
□ Depreciation methods (Straight-line, Declining)
□ Depreciation schedule generation
□ Monthly depreciation posting
□ Asset disposal
□ Asset report
```

### Phase 9: Budget (Week 22)

```
□ Budget creation (annual)
□ Budget lines by account
□ Monthly budget allocation
□ Budget approval workflow
□ Budget vs Actual report
□ Variance analysis
```

### Phase 10: Multi-currency (Week 23)

```
□ Currency master data
□ Exchange rate management
□ BOT rate import (optional)
□ Foreign currency documents
□ Exchange rate at transaction
□ Realized Forex Gain/Loss
□ Unrealized Forex Gain/Loss
```

### Phase 11: Reports & Analytics (Week 24-26)

```
□ Income Statement (P&L)
□ Balance Sheet
□ Cash Flow Statement (Direct method)
□ Trial Balance (detailed/summary)
□ AR Aging Report
□ AP Aging Report
□ VAT Report (ภ.พ.30)
□ WHT Report (ภ.ง.ด.3/53)
□ Budget vs Actual
□ Profit by customer/product
□ Dashboard widgets
□ Custom date ranges
□ Export to Excel/PDF
```

### Phase 12: AI Features (Week 27-28)

```
□ AI OCR receipt scanning (Gemini Vision)
□ Auto-extract: vendor, amount, date, items
□ AI account suggestion
□ AI contact matching
□ Fraud detection scoring
□ Duplicate detection
□ Smart categorization
```

### Phase 13: Integrations (Week 29-30)

```
□ LINE Bot for notifications
□ LINE Bot commands (balance, pending)
□ PEAK export format
□ Bank statement import
□ Email notifications (Resend)
□ Webhook for external systems
```

### Phase 14: Polish & Launch (Week 31-32)

```
□ Mobile responsiveness
□ Performance optimization
□ Error handling & messages (Thai)
□ Loading states & skeletons
□ Help documentation
□ Keyboard shortcuts
□ Demo company with sample data
□ Onboarding wizard
□ Beta testing
□ Security audit
□ Launch! 🚀
```

---

## 🎨 UI/UX Design

### 🎯 Core UX Philosophy: "สอนบัญชีไปในตัว"

> **ปัญหา:** คนส่วนใหญ่กลัวบัญชี ไม่เข้าใจศัพท์ ไม่รู้ว่าต้องทำอะไร
> 
> **เป้าหมาย:** ทำให้คนที่ไม่รู้เรื่องบัญชีก็ใช้งานได้ และเข้าใจมากขึ้นโดยไม่รู้ตัว

### Design Principles (10 ข้อ)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🎓 EDUCATIONAL UX PRINCIPLES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1️⃣  PLAIN THAI FIRST         - ใช้ภาษาง่ายๆ ไม่ใช้ศัพท์บัญชียากๆ            │
│  2️⃣  SHOW THE WHY             - บอกเหตุผลว่าทำไปทำไม                        │
│  3️⃣  VISUAL PROCESS FLOW      - แสดง flow ให้เห็นภาพกระบวนการ               │
│  4️⃣  CONTEXTUAL HELP          - มี tooltip อธิบายตรงจุดที่สงสัย              │
│  5️⃣  PROGRESSIVE DISCLOSURE   - แสดงทีละขั้น ไม่ overwhelm                  │
│  6️⃣  SMART DEFAULTS           - ตั้งค่าเริ่มต้นให้ดี ไม่ต้องคิดมาก            │
│  7️⃣  LIVE PREVIEW             - เห็นผลลัพธ์ทันทีก่อนบันทึก                   │
│  8️⃣  GUIDED WIZARD            - มี wizard พาทำทีละขั้น                      │
│  9️⃣  UNDO FRIENDLY            - แก้ไขได้ ไม่กลัวผิด                         │
│  🔟  CELEBRATION               - ฉลองเมื่อทำสำเร็จ สร้างกำลังใจ               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 📚 Language Mapping: ศัพท์บัญชี → ภาษาคน

| ศัพท์บัญชี | ภาษาที่ใช้ใน App | คำอธิบาย Tooltip |
|-----------|-----------------|-----------------|
| Invoice | ใบแจ้งหนี้ | เอกสารบอกลูกค้าว่าต้องจ่ายเงินเท่าไหร่ |
| Receipt | ใบเสร็จ | เอกสารยืนยันว่ารับเงินแล้ว |
| Quotation | ใบเสนอราคา | เอกสารบอกลูกค้าว่าสินค้า/บริการราคาเท่าไหร่ |
| Purchase Order | ใบสั่งซื้อ | เอกสารสั่งซื้อของจากร้านค้า |
| Journal Entry | รายการบันทึกบัญชี | การบันทึกเงินเข้า-ออกในบัญชี |
| General Ledger | บัญชีแยกประเภท | รายงานแสดงความเคลื่อนไหวของแต่ละบัญชี |
| Trial Balance | งบทดลอง | รายงานตรวจสอบว่าบัญชีถูกต้องไหม |
| AR (Accounts Receivable) | ลูกหนี้ | เงินที่ลูกค้าค้างจ่ายเรา |
| AP (Accounts Payable) | เจ้าหนี้ | เงินที่เราค้างจ่ายร้านค้า |
| VAT | ภาษีมูลค่าเพิ่ม | ภาษี 7% ที่ต้องเก็บจากลูกค้า/จ่ายให้ร้านค้า |
| WHT | ภาษีหัก ณ ที่จ่าย | ภาษีที่หักไว้ก่อนจ่าย ส่งให้สรรพากร |
| Debit | เดบิต (เงินเข้า) | บันทึกฝั่งซ้าย = เพิ่มสินทรัพย์/ค่าใช้จ่าย |
| Credit | เครดิต (เงินออก) | บันทึกฝั่งขวา = เพิ่มหนี้สิน/รายได้ |
| Depreciation | ค่าเสื่อมราคา | มูลค่าทรัพย์สินที่ลดลงตามเวลา |
| Reconciliation | กระทบยอด | ตรวจสอบว่ายอดในระบบตรงกับ statement ธนาคาร |

### 🎨 Visual Design System

#### Color Palette (Semantic Colors)

```css
:root {
  /* === Primary Actions === */
  --primary: 220 90% 45%;           /* น้ำเงิน - ปุ่มหลัก */
  --primary-hover: 220 90% 40%;
  
  /* === Money Colors (สื่อความหมายชัด) === */
  --money-in: 142 70% 45%;          /* เขียว - เงินเข้า, รายรับ, AR */
  --money-out: 0 85% 55%;           /* แดง - เงินออก, รายจ่าย, AP */
  --money-neutral: 45 90% 50%;      /* เหลือง - รอดำเนินการ */
  
  /* === Status Colors === */
  --status-draft: 210 40% 70%;      /* เทา - ร่าง */
  --status-pending: 45 90% 50%;     /* เหลือง - รออนุมัติ */
  --status-approved: 142 70% 45%;   /* เขียว - อนุมัติแล้ว */
  --status-completed: 220 90% 45%;  /* น้ำเงิน - เสร็จสิ้น */
  --status-cancelled: 0 0% 60%;     /* เทาเข้ม - ยกเลิก */
  
  /* === Educational Colors === */
  --info: 200 90% 50%;              /* ฟ้า - ข้อมูลช่วยเหลือ */
  --tip: 280 70% 55%;               /* ม่วง - เคล็ดลับ */
  --warning: 35 90% 50%;            /* ส้ม - คำเตือน */
  
  /* === Background === */
  --background: 0 0% 100%;
  --background-muted: 210 40% 98%;
  --foreground: 222 47% 11%;
}
```

#### Typography

```css
/* ใช้ font ไทยที่อ่านง่าย */
--font-sans: 'IBM Plex Sans Thai', 'Sarabun', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;

/* Font sizes - ใหญ่พอให้อ่านง่าย */
--text-xs: 0.75rem;    /* 12px - label เล็ก */
--text-sm: 0.875rem;   /* 14px - body text */
--text-base: 1rem;     /* 16px - default */
--text-lg: 1.125rem;   /* 18px - emphasis */
--text-xl: 1.25rem;    /* 20px - heading */
--text-2xl: 1.5rem;    /* 24px - page title */
--text-3xl: 2rem;      /* 32px - hero */
```

### 🧩 Educational UI Components

#### 1. Info Tooltip (อธิบายศัพท์)

```tsx
// ใช้ตรงคำศัพท์ที่อาจไม่เข้าใจ
<InfoTooltip term="ภาษีหัก ณ ที่จ่าย">
  <p>ภาษีที่ต้องหักจากยอดจ่าย แล้วนำส่งสรรพากรแทนผู้รับเงิน</p>
  <p className="text-muted">ตัวอย่าง: จ้างทำงาน 10,000 หัก 3% = หัก 300 จ่าย 9,700</p>
</InfoTooltip>

// UI:
// ┌─────────────────────────────────────┐
// │ ภาษีหัก ณ ที่จ่าย ℹ️                 │ ← hover แล้วเด้ง tooltip
// └─────────────────────────────────────┘
```

#### 2. Process Flow Indicator (แสดงขั้นตอน)

```tsx
// แสดงว่าตอนนี้อยู่ขั้นตอนไหน และต้องทำอะไรต่อ
<ProcessFlow 
  steps={[
    { id: 1, label: 'สร้างใบเสนอราคา', status: 'completed' },
    { id: 2, label: 'ออกใบแจ้งหนี้', status: 'current' },
    { id: 3, label: 'รับชำระเงิน', status: 'pending' },
    { id: 4, label: 'ออกใบเสร็จ', status: 'pending' },
  ]}
/>

// UI:
// ┌─────────────────────────────────────────────────────────────────┐
// │  ✅ สร้างใบเสนอราคา  →  📝 ออกใบแจ้งหนี้  →  ⏳ รับเงิน  →  ⏳ ใบเสร็จ │
// │  QO-2026-0001           กำลังทำ...                              │
// └─────────────────────────────────────────────────────────────────┘
```

#### 3. Why Card (อธิบายเหตุผล)

```tsx
// บอกว่าทำไปทำไม มีประโยชน์อะไร
<WhyCard 
  title="ทำไมต้องออกใบแจ้งหนี้?"
  reasons={[
    'เป็นหลักฐานว่าลูกค้าต้องจ่ายเงิน',
    'ใช้เป็นใบกำกับภาษีได้ (ถ้าจดทะเบียน VAT)',
    'ระบบจะ track ว่าลูกค้าค้างจ่ายเท่าไหร่',
  ]}
/>

// UI:
// ┌─────────────────────────────────────────────────┐
// │ 💡 ทำไมต้องออกใบแจ้งหนี้?                        │
// │                                                 │
// │ • เป็นหลักฐานว่าลูกค้าต้องจ่ายเงิน              │
// │ • ใช้เป็นใบกำกับภาษีได้                         │
// │ • ระบบจะ track ว่าลูกค้าค้างจ่ายเท่าไหร่         │
// └─────────────────────────────────────────────────┘
```

#### 4. Live Journal Preview (เห็นการลงบัญชีทันที)

```tsx
// แสดงว่าเมื่อบันทึกแล้ว จะเกิดรายการบัญชีอะไรบ้าง
<JournalPreview 
  title="📒 รายการที่จะบันทึก"
  entries={[
    { account: 'ค่าวัตถุดิบ', debit: 10000, credit: 0 },
    { account: 'ภาษีซื้อ 7%', debit: 700, credit: 0 },
    { account: 'เงินฝากธนาคาร', debit: 0, credit: 10700 },
  ]}
  footer="✅ เดบิต = เครดิต (ถูกต้อง!)"
/>

// UI:
// ┌─────────────────────────────────────────────────────────────────┐
// │ 📒 รายการที่จะบันทึก (Journal Entry)                            │
// ├─────────────────────────────────────────────────────────────────┤
// │  บัญชี              │     เดบิต     │    เครดิต     │          │
// │ ─────────────────────────────────────────────────────          │
// │  ค่าวัตถุดิบ         │    10,000.00 │              │ ← เพิ่มค่าใช้จ่าย │
// │  ภาษีซื้อ 7%        │       700.00 │              │ ← เก็บไว้ขอคืน   │
// │  เงินฝากธนาคาร      │              │    10,700.00 │ ← เงินออก     │
// │ ─────────────────────────────────────────────────────          │
// │  รวม               │    10,700.00 │    10,700.00 │ ✅ Balance!  │
// └─────────────────────────────────────────────────────────────────┘
```

#### 5. Smart Form Field (ช่วยกรอก)

```tsx
// Input ที่มี hint และ auto-complete
<SmartField 
  label="ภาษีหัก ณ ที่จ่าย"
  hint="ปกติค่าบริการหัก 3%, ค่าเช่าหัก 5%"
  suggestions={[
    { label: 'ค่าบริการ 3%', value: 3 },
    { label: 'ค่าเช่า 5%', value: 5 },
    { label: 'ค่าวิชาชีพ 5%', value: 5 },
  ]}
/>

// UI:
// ┌─────────────────────────────────────────────────┐
// │ ภาษีหัก ณ ที่จ่าย ℹ️                            │
// │ ┌───────────────────────────────────────────┐  │
// │ │ 3                                      %  │  │
// │ └───────────────────────────────────────────┘  │
// │ 💡 ปกติค่าบริการหัก 3%, ค่าเช่าหัก 5%          │
// │                                                │
// │ เลือกด่วน: [ค่าบริการ 3%] [ค่าเช่า 5%]         │
// └────────────────────────────────────────────────┘
```

#### 6. Guided Wizard (พาทำทีละขั้น)

```tsx
// สำหรับงานที่ซับซ้อน ค่อยๆ พาทำ
<Wizard 
  title="ออกใบแจ้งหนี้"
  steps={[
    { 
      id: 1, 
      title: 'เลือกลูกค้า',
      description: 'ใครเป็นคนจ่ายเงิน?',
      component: <CustomerSelector />
    },
    { 
      id: 2, 
      title: 'เพิ่มรายการ',
      description: 'ขายอะไร ราคาเท่าไหร่?',
      component: <LineItemsEditor />
    },
    { 
      id: 3, 
      title: 'ตรวจสอบยอด',
      description: 'เช็คความถูกต้อง',
      component: <TotalsPreview />
    },
    { 
      id: 4, 
      title: 'บันทึก',
      description: 'พร้อมออกใบแจ้งหนี้',
      component: <ConfirmSave />
    },
  ]}
/>

// UI:
// ┌─────────────────────────────────────────────────────────────────┐
// │ ออกใบแจ้งหนี้                                                   │
// │                                                                  │
// │  ① เลือกลูกค้า  →  ② เพิ่มรายการ  →  ③ ตรวจสอบ  →  ④ บันทึก     │
// │     ✓ เสร็จ         กำลังทำ                                      │
// ├──────────────────────────────────────────────────────────────────┤
// │                                                                  │
// │  ขั้นตอนที่ 2: เพิ่มรายการ                                       │
// │  ───────────────────────────                                    │
// │  ขายอะไร ราคาเท่าไหร่?                                          │
// │                                                                  │
// │  ┌─────────────────────────────────────────────────────────┐   │
// │  │ [Form content here]                                      │   │
// │  └─────────────────────────────────────────────────────────┘   │
// │                                                                  │
// │                              [← ย้อนกลับ]  [ถัดไป →]              │
// └──────────────────────────────────────────────────────────────────┘
```

#### 7. Success Celebration (ฉลองความสำเร็จ)

```tsx
// แสดงเมื่อทำสำเร็จ สร้างความรู้สึกดี
<SuccessCelebration 
  title="🎉 บันทึกสำเร็จ!"
  message="ใบแจ้งหนี้ IV-2026-0042 ถูกสร้างแล้ว"
  summary={[
    { label: 'ลูกค้า', value: 'บริษัท ABC จำกัด' },
    { label: 'ยอดรวม', value: '53,500 บาท' },
    { label: 'ครบกำหนด', value: '15 ก.พ. 2026 (30 วัน)' },
  ]}
  actions={[
    { label: 'ดูใบแจ้งหนี้', action: 'view' },
    { label: 'พิมพ์ PDF', action: 'print' },
    { label: 'สร้างใบใหม่', action: 'new' },
  ]}
  tip="💡 ติดตามการชำระได้ที่เมนู 'ลูกหนี้'"
/>
```

#### 8. Empty State with Guidance (หน้าว่างที่สอน)

```tsx
// เมื่อยังไม่มีข้อมูล บอกว่าต้องทำอะไร
<EmptyState 
  icon="📄"
  title="ยังไม่มีใบแจ้งหนี้"
  description="ใบแจ้งหนี้คือเอกสารบอกลูกค้าว่าต้องจ่ายเงินเท่าไหร่"
  cta={{ label: 'สร้างใบแจ้งหนี้แรก', action: () => {} }}
  tip="💡 สร้างจากใบเสนอราคาได้ ไม่ต้องพิมพ์ใหม่"
/>

// UI:
// ┌─────────────────────────────────────────────────────────────────┐
// │                                                                  │
// │                          📄                                     │
// │                                                                  │
// │               ยังไม่มีใบแจ้งหนี้                                 │
// │                                                                  │
// │   ใบแจ้งหนี้คือเอกสารบอกลูกค้าว่าต้องจ่ายเงินเท่าไหร่           │
// │                                                                  │
// │              [ + สร้างใบแจ้งหนี้แรก ]                           │
// │                                                                  │
// │   💡 สร้างจากใบเสนอราคาได้ ไม่ต้องพิมพ์ใหม่                     │
// │                                                                  │
// └─────────────────────────────────────────────────────────────────┘
```

### 📱 Key Screen Designs

#### 1. Dashboard (หน้าหลัก - เห็นภาพรวม)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏢 บริษัท ตัวอย่าง จำกัด                              🔔  👤  ⚙️          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  สวัสดี, สมชาย! 👋  วันนี้ 12 ม.ค. 2026                                    │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 💰 เงินสด       │  │ 📈 รายรับเดือนนี้│  │ 📉 รายจ่ายเดือนนี้│            │
│  │   125,430      │  │   89,500       │  │   45,200       │              │
│  │   +12% ↑       │  │   +8% ↑        │  │   -5% ↓        │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ 🟢 ลูกหนี้ (เงินที่จะได้รับ) │  │ 🔴 เจ้าหนี้ (เงินที่ต้องจ่าย) │        │
│  │                             │  │                             │          │
│  │     53,500 บาท             │  │     28,700 บาท             │          │
│  │     ───────────────        │  │     ───────────────        │          │
│  │     3 รายการ รอรับเงิน     │  │     2 รายการ รอจ่ายเงิน     │          │
│  │                             │  │                             │          │
│  │  [ดูรายละเอียด]            │  │  [ดูรายละเอียด]            │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                              │
│  ⚡ ทำอะไรต่อ?                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ + บันทึก     │ │ + ออกใบ     │ │ + บันทึก     │ │ 📸 สแกน     │       │
│  │   รายจ่าย    │ │   แจ้งหนี้   │ │   รายรับ     │ │   ใบเสร็จ    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
│  📋 รอดำเนินการ                                         [ดูทั้งหมด]        │
│  ├─ ⏰ ใบแจ้งหนี้ IV-0039 ครบกำหนด 3 วัน                                   │
│  ├─ ⏰ บิลซื้อ PI-0012 ครบกำหนดพรุ่งนี้                                     │
│  └─ 📝 ใบเสนอราคา QO-0045 รออนุมัติ                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Quick Expense (บันทึกรายจ่ายด่วน - ง่ายที่สุด)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← กลับ              บันทึกรายจ่าย                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                         💰 จ่ายเท่าไหร่?                             │   │
│  │                                                                      │   │
│  │                    ┌─────────────────────┐                          │   │
│  │                    │      1,070.00       │  บาท                     │   │
│  │                    └─────────────────────┘                          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  📁 หมวดหมู่                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🛒 ซื้อของ/วัตถุดิบ                                           ▼    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  💡 หมวดหมู่ช่วยให้รู้ว่าจ่ายอะไรไปบ้าง และใช้ทำรายงานภาษี                │
│                                                                              │
│  🏪 จ่ายให้ใคร (ไม่บังคับ)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ พิมพ์ชื่อร้าน หรือเลือกจากรายการ...                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  📅 วันที่จ่าย                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ วันนี้ (12 ม.ค. 2026)                                          ▼    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  📝 หมายเหตุ (ไม่บังคับ)                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ซื้อผ้าดิบ 10 หลา                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  📎 แนบใบเสร็จ                                                              │
│  ┌────────────┐                                                             │
│  │  📸 ถ่ายรูป │  หรือ  📁 เลือกไฟล์                                       │
│  └────────────┘                                                             │
│  💡 แนบใบเสร็จไว้ ใช้เป็นหลักฐานค่าใช้จ่าย                                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  📒 สิ่งที่จะบันทึก (ดูก่อน)                                      [ซ่อน]    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ค่าซื้อของ/วัตถุดิบ      เดบิต    1,000.00                        │   │
│  │  ภาษีซื้อ 7%             เดบิต       70.00                        │   │
│  │  เงินสด                 เครดิต   1,070.00                        │   │
│  │  ─────────────────────────────────────────                        │   │
│  │  ✅ ถูกต้อง! เดบิต = เครดิต                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                      [ 💾 บันทึกรายจ่าย ]                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3. Invoice Form (ออกใบแจ้งหนี้ - แบบ Wizard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← กลับ              ออกใบแจ้งหนี้                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ① ลูกค้า  →  ② รายการ  →  ③ ตรวจสอบ  →  ④ บันทึก                          │
│     ✓            ●                                                          │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ขั้นตอนที่ 2: เพิ่มรายการสินค้า/บริการ                                     │
│  ─────────────────────────────────────────                                  │
│  ขายอะไรให้ลูกค้าบ้าง?                                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ # │ รายการ               │ จำนวน │ หน่วย │ ราคา/หน่วย │   รวม     │   │
│  │───┼──────────────────────┼───────┼───────┼────────────┼───────────│   │
│  │ 1 │ เสื้อโปโล ไซส์ M     │   50  │ ตัว   │    200.00  │ 10,000.00 │   │
│  │ 2 │ เสื้อโปโล ไซส์ L     │   30  │ ตัว   │    200.00  │  6,000.00 │   │
│  │ 3 │ ค่าสกรีนโลโก้        │   80  │ ตัว   │     15.00  │  1,200.00 │   │
│  │───┴──────────────────────┴───────┴───────┴────────────┴───────────│   │
│  │                                              ยอดรวม   │ 17,200.00 │   │
│  │                                                                    │   │
│  │  [+ เพิ่มรายการ]                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  💡 เคล็ดลับ: พิมพ์รหัสสินค้าหรือชื่อ แล้วกด Enter เพื่อเพิ่มรายการ        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                                           ยอดรวมสินค้า   17,200.00  │   │
│  │                                           VAT 7%          1,204.00  │   │
│  │                                           ─────────────────────────  │   │
│  │                                           ยอดรวมสุทธิ    18,404.00  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│                         [← ย้อนกลับ]      [ถัดไป →]                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4. AR Aging (ลูกหนี้ค้างชำระ - เห็นภาพชัด)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 ลูกหนี้การค้า (เงินที่ลูกค้าค้างจ่าย)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📊 สรุปยอดค้างชำระ                                                         │
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│  │  ยังไม่ถึง  │ │  1-30 วัน │ │ 31-60 วัน │ │ 61-90 วัน │ │  >90 วัน  │    │
│  │  กำหนด    │ │   เกิน    │ │   เกิน    │ │   เกิน    │ │   เกิน    │    │
│  │           │ │           │ │           │ │           │ │           │    │
│  │  53,500   │ │  18,200   │ │  12,500   │ │   5,800   │ │   3,200   │    │
│  │  🟢       │ │  🟡       │ │  🟠       │ │  🔴       │ │  ⚫       │    │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
│                                                                              │
│  💡 ยิ่งค้างนาน ยิ่งเก็บเงินยาก ควรติดตามรายการที่เกินกำหนดก่อน            │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  รายละเอียดลูกหนี้                              🔍 ค้นหา   📊 Export       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ลูกค้า            │ เอกสาร      │ วันครบกำหนด │ ค้างจ่าย  │ สถานะ  │   │
│  │───────────────────┼─────────────┼─────────────┼──────────┼────────│   │
│  │ 🔴 บริษัท XYZ     │ IV-2026-021 │ 15 ธ.ค. 25  │  12,500  │ เกิน 28 วัน │
│  │    └─ โทรติดตาม?  │             │             │          │ [ติดตาม]   │
│  │───────────────────┼─────────────┼─────────────┼──────────┼────────│   │
│  │ 🟡 ร้าน ABC       │ IV-2026-035 │ 5 ม.ค. 26   │  18,200  │ เกิน 7 วัน │
│  │───────────────────┼─────────────┼─────────────┼──────────┼────────│   │
│  │ 🟢 บริษัท 123     │ IV-2026-041 │ 25 ม.ค. 26  │  53,500  │ อีก 13 วัน │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎓 Onboarding Flow (ครั้งแรกที่ใช้)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                        🎉 ยินดีต้อนรับสู่ [App Name]!                       │
│                                                                              │
│                  เราจะพาคุณตั้งค่าระบบใน 3 ขั้นตอนง่ายๆ                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │    ① ข้อมูลบริษัท  →  ② เชื่อมต่อธนาคาร  →  ③ เริ่มต้นใช้งาน        │   │
│  │       กำลังทำ                                                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ขั้นตอนที่ 1: บอกเราเกี่ยวกับธุรกิจของคุณ                                 │
│  ─────────────────────────────────────────                                  │
│                                                                              │
│  ชื่อบริษัท *                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ บริษัท ตัวอย่าง จำกัด                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  เลขประจำตัวผู้เสียภาษี (ถ้ามี)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 0-1234-56789-01-2                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  💡 ใส่เลขนี้เพื่อออกใบกำกับภาษีได้                                        │
│                                                                              │
│  ธุรกิจของคุณจด VAT หรือเปล่า?                                             │
│  ┌─────────┐  ┌─────────┐                                                   │
│  │ ✅ จด   │  │ ❌ ไม่จด │                                                  │
│  └─────────┘  └─────────┘                                                   │
│  💡 ถ้าจด VAT จะต้องเก็บภาษี 7% จากลูกค้า และขอคืนภาษีซื้อได้              │
│                                                                              │
│                              [ถัดไป →]                                       │
│                                                                              │
│                         [ข้ามขั้นตอนนี้]                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 📚 In-App Learning Features

#### 1. First-time Hints

```tsx
// แสดงครั้งแรกที่เข้าหน้า แล้วซ่อนได้
<FirstTimeHint 
  id="invoice-page"
  title="💡 รู้หรือเปล่า?"
  content="ใบแจ้งหนี้ทุกใบจะถูก track อัตโนมัติ ว่าลูกค้าจ่ายเงินหรือยัง"
  dismissable
/>
```

#### 2. Contextual Tips

```tsx
// แสดงเมื่อ hover หรือ focus ที่ field
<ContextTip trigger="focus" field="wht-rate">
  <h4>หัก ณ ที่จ่าย คืออะไร?</h4>
  <p>เป็นภาษีที่ต้องหักไว้ก่อนจ่ายเงิน แล้วส่งให้สรรพากรภายในวันที่ 7 ของเดือนถัดไป</p>
  <a href="/learn/wht">เรียนรู้เพิ่มเติม →</a>
</ContextTip>
```

#### 3. Learn More Section

```tsx
// ส่วนท้ายของหน้าที่ซับซ้อน
<LearnMore 
  title="📚 เรียนรู้เพิ่มเติม"
  links={[
    { label: 'ใบกำกับภาษีคืออะไร?', url: '/learn/tax-invoice' },
    { label: 'เมื่อไหร่ต้องหัก ณ ที่จ่าย?', url: '/learn/wht' },
    { label: 'ภาษีซื้อ vs ภาษีขาย', url: '/learn/vat' },
  ]}
/>
```

### 🎯 UX Success Metrics

| Metric | Target | วัดอย่างไร |
|--------|--------|----------|
| Time to First Invoice | < 5 นาที | จากสมัคร ถึงออกใบแจ้งหนี้แรก |
| Task Completion Rate | > 90% | กี่ % ที่ทำเสร็จโดยไม่ต้องขอความช่วยเหลือ |
| Error Rate | < 5% | จำนวนครั้งที่กดผิด/ต้องแก้ไข |
| Help Requests | < 10% | กี่ % ที่ต้องเปิด help/FAQ |
| User Satisfaction | > 4.5/5 | NPS Survey |
| Return Rate | > 80% | กี่ % ที่กลับมาใช้ภายใน 7 วัน |

---

## 🔐 Security & Permissions

### Permission Matrix

| Action | Owner | Admin | Accountant | Sales | Purchase | Staff | Viewer |
|--------|-------|-------|------------|-------|----------|-------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Docs | ✅ | ✅ | ✅ | 🔶 | 🔶 | 🔶 | ✅ |
| Create Sales Doc | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Purchase Doc | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create Quick Entry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Documents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Post Journals | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | 🔶 | 🔶 | ❌ | ✅ |
| Export Data | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

🔶 = Limited (own records or department only)

### Security Measures

```typescript
// 1. Input Validation
const schema = z.object({
  amount: z.number().positive().max(999999999.99),
  description: z.string().max(500),
});

// 2. Rate Limiting
const rateLimit = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
});

// 3. Audit Logging
await auditLog.create({
  action: 'CREATE',
  entityType: 'Document',
  entityId: doc.id,
  changes: { after: doc },
  userId: session.user.id,
});

// 4. Row-Level Security
const documents = await prisma.document.findMany({
  where: {
    companyId: session.companyId, // Always filter by company
    // ... other filters
  },
});
```

---

## 🚀 Deployment

### Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Vercel     │    │   Supabase   │    │  Supabase    │  │
│  │   (Next.js)  │◄──►│  PostgreSQL  │    │  Storage     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       ▲           │
│         │                                       │           │
│         ▼                                       │           │
│  ┌──────────────┐    ┌──────────────┐          │           │
│  │   Resend     │    │   Gemini     │──────────┘           │
│  │   (Email)    │    │   (AI/OCR)   │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://app.example.com"
NEXTAUTH_SECRET="..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# AI
GOOGLE_AI_API_KEY="..."

# Integrations
LINE_CHANNEL_SECRET="..."
LINE_CHANNEL_ACCESS_TOKEN="..."
RESEND_API_KEY="..."
```

---

## ⏱️ Timeline Summary

```
Month 1 (Week 1-5):
├── Week 1: Project Setup
├── Week 2-3: Core Foundation
└── Week 4-5: Accounting Engine

Month 2 (Week 6-10):
├── Week 6-7: Quick Entry
└── Week 8-10: Sales Module

Month 3 (Week 11-16):
├── Week 11-13: Purchase Module
└── Week 14-16: Inventory + Unit Conversion + Stock Count

Month 4 (Week 17-21):
├── Week 17-19: Banking + Petty Cash + Cheque
└── Week 20-21: Fixed Assets + Depreciation

Month 5 (Week 22-26):
├── Week 22: Budget
├── Week 23: Multi-currency
└── Week 24-26: Reports & Analytics

Month 6 (Week 27-30):
├── Week 27-28: AI Features
└── Week 29-30: Integrations (LINE, PEAK, Email)

Month 7 (Week 31-32):
└── Week 31-32: Polish + Launch 🚀

────────────────────────────────────────────
Total: ~8 เดือน (Full-time 1 คน)
────────────────────────────────────────────

MVP Tiers:
├── MVP 1 (3 เดือน): Quick + Sales + Purchase
├── MVP 2 (5 เดือน): + Inventory + Banking
└── Full (8 เดือน): ครบทุก feature
```

### Phase Summary Table

| Phase | Feature | Duration | Cumulative |
|-------|---------|----------|------------|
| 0 | Project Setup | 1 week | Week 1 |
| 1 | Core Foundation | 2 weeks | Week 3 |
| 2 | Accounting Engine | 2 weeks | Week 5 |
| 3 | Quick Entry | 2 weeks | Week 7 |
| 4 | Sales Module | 3 weeks | Week 10 |
| 5 | Purchase Module | 3 weeks | Week 13 |
| 6 | Inventory + Stock Count | 3 weeks | Week 16 |
| 7 | Banking + Petty Cash + Cheque | 3 weeks | Week 19 |
| 8 | Fixed Assets | 2 weeks | Week 21 |
| 9 | Budget | 1 week | Week 22 |
| 10 | Multi-currency | 1 week | Week 23 |
| 11 | Reports & Analytics | 3 weeks | Week 26 |
| 12 | AI Features | 2 weeks | Week 28 |
| 13 | Integrations | 2 weeks | Week 30 |
| 14 | Polish & Launch | 2 weeks | Week 32 |

---

## 📝 Naming Suggestions

| Option | Name | Tagline |
|--------|------|---------|
| 1 | **บัญชีดี** (BanCheDee) | ระบบบัญชีที่ดีสำหรับ SME ไทย |
| 2 | **AccuThai** | Thai Accounting Made Easy |
| 3 | **SmartBooks** | บัญชีอัจฉริยะ |
| 4 | **PeakSlayer** | ฆ่า Peak 😈 |
| 5 | **CloudBooks TH** | บัญชีบนคลาวด์ |
| 6 | **AccFlow** | Accounting Workflow |
| 7 | **LedgerThai** | บัญชีไทยครบวงจร |
| 8 | **ThaiBooks** | โปรแกรมบัญชีไทย |

---

## ✅ Next Steps

1. [ ] ตั้งชื่อโปรเจกต์
2. [ ] Create GitHub repository
3. [ ] Initialize Next.js 15 project
4. [ ] Setup Supabase project (DB + Storage)
5. [ ] Setup Vercel deployment
6. [ ] Start Phase 0!

---

## 📊 Feature Completeness Checklist

| Category | Features | Count |
|----------|----------|-------|
| **Core** | Company, User, Contact, Accounts | 4 |
| **Accounting** | Journal, Ledger, Trial Balance, Statements | 4 |
| **Quick Entry** | Expense, Income, Reimbursement | 3 |
| **Sales** | QO, SO, IV, RC, CN, DN, AR | 7 |
| **Purchase** | PR, PO, GR, PI, PV, CN, AP | 7 |
| **Inventory** | Product, Unit, Warehouse, Stock, Count | 5 |
| **Banking** | Bank Account, Transaction, Reconcile | 3 |
| **Cash** | Petty Cash, Cheque | 2 |
| **Assets** | Fixed Asset, Depreciation | 2 |
| **Budget** | Budget, Budget Line | 2 |
| **Multi-currency** | Currency, Exchange Rate | 2 |
| **Reports** | Financial, Tax, AR/AP, Budget | 4 |
| **AI** | OCR, Categorize, Fraud | 3 |
| **Integration** | LINE, PEAK, Email | 3 |
| **Total** | | **51 features** |

---

**Document Version:** 2.0  
**Created:** January 12, 2026  
**Last Updated:** January 12, 2026  
**Status:** Ready to Start! 🚀

---

## 📝 Changelog

### v2.0 (January 12, 2026)
- Added Fixed Assets & Depreciation schema
- Added Petty Cash schema
- Added Multi-currency schema
- Added Budget schema
- Added Product Unit Conversion
- Added Cheque Management
- Added Stock Count
- Updated Feature Modules diagram
- Updated Development Phases (14 phases)
- Updated Timeline (8 months full)
- Added Phase Summary Table
- Added Feature Completeness Checklist

### v1.0 (January 12, 2026)
- Initial document
