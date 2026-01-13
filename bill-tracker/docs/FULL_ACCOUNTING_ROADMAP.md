# 🎯 Full Accounting System Roadmap

> แผนพัฒนา Bill Tracker ให้เป็นโปรแกรมบัญชีครบวงจร ท้าชน PEAK

**Created:** January 12, 2026  
**Status:** Planning  
**Target:** SME Accounting Software (Thai Market)

---

## 📊 Executive Summary

### Current State (Bill Tracker v1)
- ✅ Expense/Income Management พร้อม VAT/WHT
- ✅ Chart of Accounts (PEAK Compatible)
- ✅ Contact Management (Vendor/Customer)
- ✅ Reimbursement System + AI Fraud Detection
- ✅ Tax Reports (ภ.พ.30, ภ.ง.ด.53)
- ✅ PEAK Export (21 columns)
- ✅ Multi-Company + RBAC
- ✅ LINE Bot Integration
- ✅ AI OCR Receipt Analysis

### Target State (Bill Tracker v2 - Full Accounting)
- 🎯 Double-entry Bookkeeping (Journal Entries)
- 🎯 Complete Sales Module (Quotation → Invoice → Receipt)
- 🎯 Complete Purchase Module (PO → GR → Payment)
- 🎯 Inventory Management
- 🎯 Bank Reconciliation
- 🎯 Full Financial Statements

### Competitive Advantages vs PEAK
| Feature | Bill Tracker | PEAK |
|---------|-------------|------|
| AI OCR Receipt | ✅ ฟรี | 💰 จ่ายเพิ่ม |
| AI Fraud Detection | ✅ | ❌ |
| LINE Bot Integration | ✅ | ❌ |
| Reimbursement System | ✅ ครบวงจร | ❌ ไม่มี |
| Price | 🆓 Open Source | 💰 199-999/เดือน |

---

## 🏗️ Architecture Overview

### Current Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐
      │  Expense  │   │  Income   │   │Reimbursement│
      │  Record   │   │  Record   │   │  Request   │
      └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                    ┌───────────────┐
                    │  PEAK Export  │
                    └───────────────┘
```

### Target Architecture (Full Accounting)
```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
┌─────────┐           ┌─────────────┐           ┌─────────────┐
│  SALES  │           │  PURCHASE   │           │  ACCOUNTING │
│ Module  │           │   Module    │           │   Module    │
├─────────┤           ├─────────────┤           ├─────────────┤
│Quotation│           │Purchase Order│          │Manual Journal│
│Invoice  │           │Goods Receipt │          │Adjustments  │
│Receipt  │           │AP Invoice   │           │Closing Entry│
│CN/DN    │           │Payment      │           │             │
└────┬────┘           └──────┬──────┘           └──────┬──────┘
     │                       │                         │
     └───────────────────────┼─────────────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │    AUTO JOURNAL GENERATOR    │
              │   (Double-entry Bookkeeping) │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │       JOURNAL ENTRIES        │
              │   (สมุดรายวันทั่วไป)           │
              └──────────────┬───────────────┘
                             ▼
    ┌────────────────────────┼────────────────────────┐
    ▼                        ▼                        ▼
┌─────────┐          ┌─────────────┐          ┌─────────────┐
│ General │          │    Trial    │          │  Financial  │
│ Ledger  │          │   Balance   │          │ Statements  │
│(แยกประเภท)│         │ (งบทดลอง)    │          │(งบการเงิน)   │
└─────────┘          └─────────────┘          └─────────────┘
```

---

## 📅 Development Phases

### Overview Timeline

```
2026
┌────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│  Jan   │  Feb   │  Mar   │  Apr   │  May   │  Jun   │  Jul   │  Aug   │
├────────┴────────┼────────┴────────┼────────┴────────┼────────┴────────┤
│    Phase 1      │    Phase 2      │   Phase 3 & 4   │   Phase 5-7     │
│ Core Accounting │  Sales Module   │ Purchase + Inv  │ Bank + Reports  │
│   (4-6 weeks)   │   (4-6 weeks)   │   (6-8 weeks)   │   (6-8 weeks)   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## 🔷 Phase 1: Core Accounting (Double-entry)

> **Goal:** ทำให้ระบบเป็นบัญชีจริงๆ ด้วย Double-entry Bookkeeping  
> **Duration:** 4-6 สัปดาห์  
> **Priority:** 🔴 Critical

### 1.1 Database Schema Changes

#### New Models

```prisma
// =============================================================================
// Journal Entry (สมุดรายวันทั่วไป)
// =============================================================================

model JournalEntry {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Document Info
  entryNo     String   // JV2026-0001
  entryDate   DateTime
  description String?
  reference   String?  // เลขอ้างอิงภายนอก
  
  // Source Document (auto-generated from)
  sourceType  JournalSourceType?
  sourceId    String?  // ID ของเอกสารต้นทาง
  
  // Lines
  lines       JournalLine[]
  
  // Totals (for validation)
  totalDebit  Decimal  @db.Decimal(14, 2)
  totalCredit Decimal  @db.Decimal(14, 2)
  
  // Status & Workflow
  status      JournalStatus @default(DRAFT)
  postedAt    DateTime?
  postedBy    String?
  
  // Audit
  createdBy   String
  creator     User     @relation("JournalCreator", fields: [createdBy], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Soft Delete
  deletedAt   DateTime?
  deletedBy   String?
  
  @@unique([companyId, entryNo])
  @@index([companyId, entryDate])
  @@index([companyId, status])
  @@index([sourceType, sourceId])
}

model JournalLine {
  id          String       @id @default(cuid())
  journalId   String
  journal     JournalEntry @relation(fields: [journalId], references: [id], onDelete: Cascade)
  
  lineNo      Int          // ลำดับบรรทัด
  
  // Account
  accountId   String
  account     Account      @relation(fields: [accountId], references: [id])
  
  // Amount (one of these must be > 0)
  debit       Decimal      @default(0) @db.Decimal(14, 2)
  credit      Decimal      @default(0) @db.Decimal(14, 2)
  
  description String?      // คำอธิบายบรรทัด
  
  // For AR/AP tracking
  contactId   String?
  contact     Contact?     @relation(fields: [contactId], references: [id])
  dueDate     DateTime?    // วันครบกำหนด (สำหรับ AR/AP)
  
  // Reconciliation
  isReconciled Boolean     @default(false)
  reconciledAt DateTime?
  
  @@index([journalId])
  @@index([accountId])
  @@index([contactId])
}

enum JournalSourceType {
  MANUAL          // บันทึกด้วยมือ
  EXPENSE         // จาก Expense
  INCOME          // จาก Income
  INVOICE         // จาก Invoice
  RECEIPT         // จาก Receipt
  PAYMENT         // จาก Payment
  ADJUSTMENT      // รายการปรับปรุง
  CLOSING         // รายการปิดบัญชี
}

enum JournalStatus {
  DRAFT           // ร่าง
  POSTED          // ผ่านรายการแล้ว
  VOID            // ยกเลิก
}
```

#### Modify Existing Models

```prisma
// Add to Expense model
model Expense {
  // ... existing fields ...
  
  // 🆕 Link to Journal
  journalId   String?       @unique
  journal     JournalEntry? @relation(fields: [journalId], references: [id])
}

// Add to Income model  
model Income {
  // ... existing fields ...
  
  // 🆕 Link to Journal
  journalId   String?       @unique
  journal     JournalEntry? @relation(fields: [journalId], references: [id])
}

// Add to Account model (for system accounts)
model Account {
  // ... existing fields ...
  
  // 🆕 System Account Types
  systemType  SystemAccountType?  // CASH, BANK, VAT_INPUT, VAT_OUTPUT, WHT_PAYABLE, etc.
  
  // 🆕 Relations
  journalLines JournalLine[]
}

enum SystemAccountType {
  CASH              // เงินสด
  BANK              // เงินฝากธนาคาร
  PETTY_CASH        // เงินสดย่อย
  VAT_INPUT         // ภาษีซื้อ
  VAT_OUTPUT        // ภาษีขาย
  WHT_PAYABLE       // ภาษีหัก ณ ที่จ่ายค้างจ่าย
  WHT_RECEIVABLE    // ภาษีหัก ณ ที่จ่ายค้างรับ
  AR                // ลูกหนี้การค้า
  AP                // เจ้าหนี้การค้า
  RETAINED_EARNINGS // กำไรสะสม
}
```

### 1.2 Core Functions

#### File: `src/lib/accounting/journal-generator.ts`

```typescript
/**
 * Auto-generate Journal Entry from Expense
 * 
 * Example: ซื้อวัตถุดิบ 10,000 + VAT 700 หัก WHT 3% (300)
 * 
 * Dr. วัตถุดิบ (530101)           10,000
 * Dr. ภาษีซื้อ (110501)              700
 *     Cr. เงินฝากธนาคาร (110201)        10,400
 *     Cr. ภาษีหัก ณ ที่จ่าย (210301)       300
 */
export async function createJournalFromExpense(
  expense: ExpenseWithRelations
): Promise<JournalEntry>

/**
 * Auto-generate Journal Entry from Income
 * 
 * Example: ขายสินค้า 50,000 + VAT 3,500 ลูกค้าหัก WHT 3% (1,500)
 * 
 * Dr. เงินฝากธนาคาร (110201)     52,000
 * Dr. ภาษีถูกหัก ณ ที่จ่าย (110601) 1,500
 *     Cr. รายได้จากการขาย (410101)     50,000
 *     Cr. ภาษีขาย (210501)              3,500
 */
export async function createJournalFromIncome(
  income: IncomeWithRelations
): Promise<JournalEntry>

/**
 * Validate Journal Entry (Debit must equal Credit)
 */
export function validateJournalBalance(
  lines: JournalLineInput[]
): { isValid: boolean; difference: Decimal }

/**
 * Generate next Journal Entry number
 */
export async function generateJournalNo(
  companyId: string,
  prefix?: string  // default: "JV"
): Promise<string>  // JV2026-0001

/**
 * Post Journal Entry (change status from DRAFT to POSTED)
 */
export async function postJournalEntry(
  journalId: string,
  userId: string
): Promise<JournalEntry>

/**
 * Void Journal Entry (cannot delete, only void)
 */
export async function voidJournalEntry(
  journalId: string,
  userId: string,
  reason: string
): Promise<JournalEntry>
```

#### File: `src/lib/accounting/ledger.ts`

```typescript
/**
 * Get General Ledger for an account
 */
export async function getGeneralLedger(
  companyId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<LedgerEntry[]>

/**
 * Get Trial Balance
 */
export async function getTrialBalance(
  companyId: string,
  asOfDate: Date
): Promise<TrialBalanceRow[]>

/**
 * Get Account Balance
 */
export async function getAccountBalance(
  companyId: string,
  accountId: string,
  asOfDate?: Date
): Promise<{ debit: Decimal; credit: Decimal; balance: Decimal }>
```

#### File: `src/lib/accounting/financial-statements.ts`

```typescript
/**
 * Generate Income Statement (งบกำไรขาดทุน)
 */
export async function getIncomeStatement(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<IncomeStatement>

/**
 * Generate Balance Sheet (งบดุล)
 */
export async function getBalanceSheet(
  companyId: string,
  asOfDate: Date
): Promise<BalanceSheet>
```

### 1.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/[company]/journals` | List journal entries |
| POST | `/api/[company]/journals` | Create manual journal |
| GET | `/api/[company]/journals/[id]` | Get journal detail |
| PUT | `/api/[company]/journals/[id]` | Update draft journal |
| POST | `/api/[company]/journals/[id]/post` | Post journal |
| POST | `/api/[company]/journals/[id]/void` | Void journal |
| GET | `/api/[company]/ledger/[accountId]` | Get general ledger |
| GET | `/api/[company]/reports/trial-balance` | Get trial balance |
| GET | `/api/[company]/reports/income-statement` | Get income statement |
| GET | `/api/[company]/reports/balance-sheet` | Get balance sheet |

### 1.4 UI Components

| Component | Path | Description |
|-----------|------|-------------|
| JournalList | `/[company]/journals` | รายการสมุดรายวัน |
| JournalForm | `/[company]/journals/new` | บันทึกรายการด้วยมือ |
| JournalDetail | `/[company]/journals/[id]` | รายละเอียด Journal |
| GeneralLedger | `/[company]/ledger` | บัญชีแยกประเภท |
| TrialBalance | `/[company]/reports/trial-balance` | งบทดลอง |
| IncomeStatement | `/[company]/reports/income-statement` | งบกำไรขาดทุน |
| BalanceSheet | `/[company]/reports/balance-sheet` | งบดุล |

### 1.5 Migration Tasks

- [ ] Add JournalEntry and JournalLine models
- [ ] Add journalId to Expense and Income
- [ ] Add systemType to Account
- [ ] Seed system accounts (Cash, Bank, VAT Input, etc.)
- [ ] Create journal-generator functions
- [ ] Modify Expense API to auto-create journal
- [ ] Modify Income API to auto-create journal
- [ ] Create backfill script for existing data
- [ ] Create Journal CRUD API
- [ ] Create Ledger/Reports API
- [ ] Build Journal UI
- [ ] Build Reports UI

### 1.6 Definition of Done

- [ ] ทุก Expense/Income ใหม่มี Journal Entry อัตโนมัติ
- [ ] Debit = Credit ทุก Journal Entry
- [ ] General Ledger แสดงผลถูกต้อง
- [ ] Trial Balance balance = 0
- [ ] Income Statement คำนวณ Net Profit ถูกต้อง
- [ ] Balance Sheet: Assets = Liabilities + Equity
- [ ] Backfill ข้อมูลเก่าเรียบร้อย

---

## 🔷 Phase 2: Sales Module

> **Goal:** ครบวงจรฝั่งขาย ตั้งแต่เสนอราคาถึงรับเงิน  
> **Duration:** 4-6 สัปดาห์  
> **Priority:** 🟠 High

### 2.1 Database Schema

```prisma
// =============================================================================
// Sales Documents (เอกสารขาย)
// =============================================================================

model SalesDocument {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Document Type & Number
  docType      SalesDocType
  docNo        String        // QO2026-0001, IV2026-0001, etc.
  docDate      DateTime
  
  // Customer
  contactId    String
  contact      Contact  @relation(fields: [contactId], references: [id])
  
  // Reference (linked documents)
  refDocId     String?       // QO -> IV, IV -> RC
  refDoc       SalesDocument? @relation("SalesDocRef", fields: [refDocId], references: [id])
  linkedDocs   SalesDocument[] @relation("SalesDocRef")
  
  // Terms
  dueDate      DateTime?     // วันครบกำหนดชำระ
  creditDays   Int?          // จำนวนวันเครดิต
  
  // Amounts
  subtotal     Decimal  @db.Decimal(14, 2)
  discountType DiscountType @default(PERCENT)
  discountValue Decimal? @db.Decimal(14, 2)
  discountAmount Decimal? @db.Decimal(14, 2)
  
  amountBeforeVat Decimal @db.Decimal(14, 2)
  vatRate      Int       @default(7)
  vatAmount    Decimal   @db.Decimal(14, 2)
  
  // WHT (ลูกค้าหักเรา)
  isWhtDeducted Boolean   @default(false)
  whtRate      Decimal?  @db.Decimal(5, 2)
  whtAmount    Decimal?  @db.Decimal(14, 2)
  
  grandTotal   Decimal   @db.Decimal(14, 2)  // ยอดรวมสุทธิ
  
  // Payment tracking
  paidAmount   Decimal   @default(0) @db.Decimal(14, 2)
  balanceDue   Decimal   @db.Decimal(14, 2)
  
  // Lines
  lines        SalesLine[]
  
  // Payments received
  payments     Payment[]
  
  // Status
  status       SalesDocStatus @default(DRAFT)
  
  // Accounting
  journalId    String?   @unique
  journal      JournalEntry? @relation(fields: [journalId], references: [id])
  
  // Notes & Attachments
  notes        String?   @db.Text
  internalNotes String?  @db.Text
  attachments  Json      @default("[]")
  
  // Printing
  printCount   Int       @default(0)
  lastPrintedAt DateTime?
  
  // Audit
  createdBy    String
  creator      User      @relation(fields: [createdBy], references: [id])
  approvedBy   String?
  approvedAt   DateTime?
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  // Soft Delete
  deletedAt    DateTime?
  deletedBy    String?
  
  @@unique([companyId, docType, docNo])
  @@index([companyId, docType, status])
  @@index([companyId, contactId])
  @@index([companyId, docDate])
  @@index([dueDate])
}

model SalesLine {
  id           String        @id @default(cuid())
  documentId   String
  document     SalesDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  lineNo       Int           // ลำดับ
  
  // Product/Service (optional)
  productId    String?
  product      Product?      @relation(fields: [productId], references: [id])
  
  // Description
  description  String
  
  // Quantity & Price
  quantity     Decimal       @db.Decimal(14, 4)
  unit         String?       // หน่วย: ชิ้น, กล่อง
  unitPrice    Decimal       @db.Decimal(14, 2)
  
  // Discount per line
  discountType DiscountType  @default(PERCENT)
  discountValue Decimal?     @db.Decimal(14, 2)
  discountAmount Decimal?    @db.Decimal(14, 2)
  
  // Amount
  amount       Decimal       @db.Decimal(14, 2)  // quantity * unitPrice - discount
  
  // Account (override from product)
  accountId    String?
  account      Account?      @relation(fields: [accountId], references: [id])
  
  @@index([documentId])
  @@index([productId])
}

enum SalesDocType {
  QUOTATION       // QO - ใบเสนอราคา
  SALES_ORDER     // SO - ใบสั่งขาย
  INVOICE         // IV - ใบแจ้งหนี้/ใบกำกับภาษี
  RECEIPT         // RC - ใบเสร็จรับเงิน
  CREDIT_NOTE     // CN - ใบลดหนี้
  DEBIT_NOTE      // DN - ใบเพิ่มหนี้
}

enum SalesDocStatus {
  DRAFT           // ร่าง
  PENDING         // รออนุมัติ
  APPROVED        // อนุมัติแล้ว
  PARTIAL         // ชำระบางส่วน
  COMPLETED       // เสร็จสมบูรณ์
  CANCELLED       // ยกเลิก
  EXPIRED         // หมดอายุ (สำหรับ Quotation)
}

enum DiscountType {
  PERCENT         // ส่วนลดเป็น %
  AMOUNT          // ส่วนลดเป็นจำนวนเงิน
}

// =============================================================================
// Payments (การรับชำระเงิน)
// =============================================================================

model Payment {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  paymentNo    String        // PM2026-0001
  paymentDate  DateTime
  
  // Type
  paymentType  PaymentType   // RECEIVE (รับ) or PAY (จ่าย)
  
  // Contact
  contactId    String
  contact      Contact  @relation(fields: [contactId], references: [id])
  
  // Amount
  amount       Decimal  @db.Decimal(14, 2)
  
  // Method
  paymentMethod PaymentMethod
  bankAccountId String?
  bankAccount   BankAccount? @relation(fields: [bankAccountId], references: [id])
  
  reference    String?       // เลขอ้างอิง
  
  // Linked documents
  salesDocId   String?
  salesDoc     SalesDocument? @relation(fields: [salesDocId], references: [id])
  purchaseDocId String?
  purchaseDoc  PurchaseDocument? @relation(fields: [purchaseDocId], references: [id])
  
  // Accounting
  journalId    String?   @unique
  journal      JournalEntry? @relation(fields: [journalId], references: [id])
  
  notes        String?
  attachments  Json      @default("[]")
  
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@unique([companyId, paymentNo])
  @@index([companyId, paymentDate])
  @@index([contactId])
}

enum PaymentType {
  RECEIVE       // รับเงิน
  PAY           // จ่ายเงิน
}

// =============================================================================
// Document Numbering
// =============================================================================

model DocumentSequence {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  docType     String        // QO, IV, RC, JV, PO, etc.
  prefix      String        // QO, IV, RC (customizable)
  yearFormat  String        @default("YYYY")  // YYYY or YY
  separator   String        @default("-")
  
  currentYear Int
  lastNumber  Int           @default(0)
  
  // Format example: QO2026-0001, IV26-00001
  digitCount  Int           @default(4)
  
  @@unique([companyId, docType])
}
```

### 2.2 Document Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Quotation   │ ───▶ │   Invoice    │ ───▶ │   Receipt    │
│  ใบเสนอราคา   │      │ ใบแจ้งหนี้/กำกับ │      │ ใบเสร็จรับเงิน │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Credit Note  │
                      │   ใบลดหนี้    │
                      └──────────────┘
```

### 2.3 Journal Auto-Generation

#### Invoice Journal
```
เมื่อออก Invoice (ยังไม่รับเงิน):
Dr. ลูกหนี้การค้า (AR)           53,500
    Cr. รายได้จากการขาย              50,000
    Cr. ภาษีขาย                       3,500
```

#### Receipt Journal
```
เมื่อรับเงินจาก Invoice:
Dr. เงินฝากธนาคาร               52,000
Dr. ภาษีถูกหัก ณ ที่จ่าย            1,500
    Cr. ลูกหนี้การค้า (AR)              53,500
```

### 2.4 Features Checklist

- [ ] Quotation (ใบเสนอราคา)
  - [ ] Create/Edit/Delete
  - [ ] Copy from previous
  - [ ] Validity period
  - [ ] Convert to Invoice
  - [ ] Print PDF
  
- [ ] Invoice (ใบแจ้งหนี้/ใบกำกับภาษี)
  - [ ] Create from Quotation
  - [ ] Create direct
  - [ ] Full/Abbreviated Tax Invoice
  - [ ] Auto AR Journal
  - [ ] Track payment status
  - [ ] Overdue alerts
  
- [ ] Receipt (ใบเสร็จรับเงิน)
  - [ ] Create from Invoice
  - [ ] Partial payment
  - [ ] Multiple payment methods
  - [ ] Auto Payment Journal
  
- [ ] Credit Note (ใบลดหนี้)
  - [ ] Create from Invoice
  - [ ] Reduce AR
  - [ ] VAT adjustment
  
- [ ] AR Aging Report
  - [ ] Current / 30 / 60 / 90 / 120+ days
  - [ ] By customer
  - [ ] Collection tracking

---

## 🔷 Phase 3: Purchase Module

> **Goal:** ครบวงจรฝั่งซื้อ ตั้งแต่สั่งซื้อถึงจ่ายเงิน  
> **Duration:** 3-4 สัปดาห์  
> **Priority:** 🟠 High

### 3.1 Database Schema

```prisma
// =============================================================================
// Purchase Documents (เอกสารซื้อ)
// =============================================================================

model PurchaseDocument {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Document Type & Number
  docType      PurchaseDocType
  docNo        String        // PO2026-0001, GR2026-0001
  docDate      DateTime
  
  // Vendor
  contactId    String
  contact      Contact  @relation(fields: [contactId], references: [id])
  
  // Reference
  refDocId     String?
  refDoc       PurchaseDocument? @relation("PurchaseDocRef", fields: [refDocId], references: [id])
  linkedDocs   PurchaseDocument[] @relation("PurchaseDocRef")
  
  // Vendor invoice info
  vendorInvoiceNo   String?
  vendorInvoiceDate DateTime?
  
  // Terms
  dueDate      DateTime?
  creditDays   Int?
  
  // Amounts (similar structure to SalesDocument)
  subtotal     Decimal  @db.Decimal(14, 2)
  discountAmount Decimal? @db.Decimal(14, 2)
  amountBeforeVat Decimal @db.Decimal(14, 2)
  vatRate      Int       @default(7)
  vatAmount    Decimal   @db.Decimal(14, 2)
  
  // WHT (เราหักเขา)
  isWht        Boolean   @default(false)
  whtRate      Decimal?  @db.Decimal(5, 2)
  whtAmount    Decimal?  @db.Decimal(14, 2)
  
  grandTotal   Decimal   @db.Decimal(14, 2)
  
  // Payment tracking
  paidAmount   Decimal   @default(0) @db.Decimal(14, 2)
  balanceDue   Decimal   @db.Decimal(14, 2)
  
  // Lines
  lines        PurchaseLine[]
  
  // Payments
  payments     Payment[]
  
  // Status
  status       PurchaseDocStatus @default(DRAFT)
  
  // Accounting
  journalId    String?   @unique
  journal      JournalEntry? @relation(fields: [journalId], references: [id])
  
  notes        String?   @db.Text
  attachments  Json      @default("[]")
  
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@unique([companyId, docType, docNo])
  @@index([companyId, docType, status])
  @@index([contactId])
  @@index([dueDate])
}

model PurchaseLine {
  id           String           @id @default(cuid())
  documentId   String
  document     PurchaseDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  lineNo       Int
  
  productId    String?
  product      Product?         @relation(fields: [productId], references: [id])
  
  description  String
  quantity     Decimal          @db.Decimal(14, 4)
  unit         String?
  unitPrice    Decimal          @db.Decimal(14, 2)
  discountAmount Decimal?       @db.Decimal(14, 2)
  amount       Decimal          @db.Decimal(14, 2)
  
  accountId    String?
  account      Account?         @relation(fields: [accountId], references: [id])
  
  // For inventory
  receivedQty  Decimal          @default(0) @db.Decimal(14, 4)
  
  @@index([documentId])
}

enum PurchaseDocType {
  PURCHASE_REQUEST   // PR - ใบขอซื้อ
  PURCHASE_ORDER     // PO - ใบสั่งซื้อ
  GOODS_RECEIPT      // GR - ใบรับสินค้า
  PURCHASE_INVOICE   // PI - บันทึกใบกำกับซื้อ
  PAYMENT_VOUCHER    // PV - ใบสำคัญจ่าย
  DEBIT_NOTE         // DN - ใบเพิ่มหนี้
  CREDIT_NOTE        // CN - ใบลดหนี้ (จากผู้ขาย)
}

enum PurchaseDocStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PARTIAL_RECEIVED
  RECEIVED
  PARTIAL_PAID
  PAID
  CANCELLED
}
```

### 3.2 Features Checklist

- [ ] Purchase Order (ใบสั่งซื้อ)
  - [ ] Create/Edit
  - [ ] Approval workflow
  - [ ] Track delivery status
  
- [ ] Goods Receipt (ใบรับสินค้า)
  - [ ] Create from PO
  - [ ] Partial receipt
  - [ ] Update inventory
  
- [ ] Purchase Invoice (บันทึกใบกำกับซื้อ)
  - [ ] Create from GR or direct
  - [ ] Auto AP Journal
  - [ ] VAT input tracking
  
- [ ] Payment Voucher (ใบสำคัญจ่าย)
  - [ ] Create from Invoice
  - [ ] WHT calculation
  - [ ] Print ภ.ง.ด.53/54
  
- [ ] AP Aging Report
  - [ ] Outstanding payables
  - [ ] Payment schedule

---

## 🔷 Phase 4: Inventory Module

> **Goal:** จัดการสินค้าคงคลัง  
> **Duration:** 4-6 สัปดาห์  
> **Priority:** 🟡 Medium

### 4.1 Database Schema

```prisma
// =============================================================================
// Products & Services
// =============================================================================

model Product {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Basic Info
  code         String        // SKU / รหัสสินค้า
  barcode      String?
  name         String
  description  String?
  
  type         ProductType   @default(GOODS)
  category     String?       // หมวดหมู่
  
  // Pricing
  salePrice    Decimal       @db.Decimal(14, 2)
  costPrice    Decimal?      @db.Decimal(14, 2)
  
  // Tax
  vatRate      Int           @default(7)
  
  // Accounts
  salesAccountId    String?
  salesAccount      Account?  @relation("ProductSalesAccount", fields: [salesAccountId], references: [id])
  purchaseAccountId String?
  purchaseAccount   Account?  @relation("ProductPurchaseAccount", fields: [purchaseAccountId], references: [id])
  inventoryAccountId String?
  inventoryAccount  Account?  @relation("ProductInventoryAccount", fields: [inventoryAccountId], references: [id])
  
  // Inventory Settings
  isTracked    Boolean       @default(true)
  unit         String?       // หน่วย: ชิ้น, กล่อง, kg
  
  // Stock Levels
  minStock     Decimal?      @db.Decimal(14, 4)  // จุดสั่งซื้อ
  maxStock     Decimal?      @db.Decimal(14, 4)
  
  // Costing Method (per product or company-wide)
  costingMethod CostingMethod @default(WEIGHTED_AVERAGE)
  
  // Current Stock (denormalized for performance)
  currentStock Decimal       @default(0) @db.Decimal(14, 4)
  currentValue Decimal       @default(0) @db.Decimal(14, 2)
  
  // Relations
  stockMovements StockMovement[]
  salesLines     SalesLine[]
  purchaseLines  PurchaseLine[]
  
  isActive     Boolean       @default(true)
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@unique([companyId, code])
  @@index([companyId, type])
  @@index([companyId, category])
  @@index([barcode])
}

enum ProductType {
  GOODS         // สินค้า (track stock)
  SERVICE       // บริการ (ไม่ track stock)
  NON_STOCK     // สินค้าไม่นับสต็อก
  BUNDLE        // ชุดสินค้า
}

enum CostingMethod {
  FIFO              // First In First Out
  WEIGHTED_AVERAGE  // ถัวเฉลี่ยถ่วงน้ำหนัก
  SPECIFIC          // เฉพาะเจาะจง
}

// =============================================================================
// Stock Movement (การเคลื่อนไหวสินค้า)
// =============================================================================

model StockMovement {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Product
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  
  // Warehouse (if multi-warehouse)
  warehouseId  String?
  warehouse    Warehouse? @relation(fields: [warehouseId], references: [id])
  
  // Movement
  movementDate DateTime
  movementType StockMoveType
  
  // Quantity & Value
  quantity     Decimal       @db.Decimal(14, 4)  // + for in, - for out
  unitCost     Decimal       @db.Decimal(14, 2)
  totalValue   Decimal       @db.Decimal(14, 2)
  
  // Running balance
  balanceQty   Decimal       @db.Decimal(14, 4)
  balanceValue Decimal       @db.Decimal(14, 2)
  
  // Source Document
  sourceType   String?       // SALES, PURCHASE, ADJUST, TRANSFER
  sourceId     String?
  
  reference    String?
  notes        String?
  
  createdBy    String
  createdAt    DateTime      @default(now())
  
  @@index([companyId, productId])
  @@index([companyId, movementDate])
  @@index([warehouseId])
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
// Warehouse (คลังสินค้า)
// =============================================================================

model Warehouse {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  code         String
  name         String
  address      String?
  
  isDefault    Boolean       @default(false)
  isActive     Boolean       @default(true)
  
  stockMovements StockMovement[]
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@unique([companyId, code])
}
```

### 4.2 Features Checklist

- [ ] Product Master
  - [ ] Create/Edit products
  - [ ] Categories
  - [ ] Pricing tiers
  - [ ] Unit conversion
  
- [ ] Stock Card
  - [ ] View movements
  - [ ] Running balance
  - [ ] Valuation
  
- [ ] Stock Adjustments
  - [ ] Count & adjust
  - [ ] Auto journal
  
- [ ] Stock Reports
  - [ ] Current stock
  - [ ] Valuation report
  - [ ] Movement history
  - [ ] Low stock alert

---

## 🔷 Phase 5: Banking & Cash

> **Goal:** จัดการเงินสดและธนาคาร  
> **Duration:** 3-4 สัปดาห์  
> **Priority:** 🟡 Medium

### 5.1 Database Schema

```prisma
// =============================================================================
// Bank Accounts
// =============================================================================

model BankAccount {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Bank Info
  bankCode     String        // BBL, KBANK, SCB
  bankName     String
  accountNo    String
  accountName  String
  branch       String?
  
  accountType  BankAccountType @default(SAVINGS)
  
  // Linked GL Account
  accountId    String
  account      Account  @relation(fields: [accountId], references: [id])
  
  // Balance
  openingBalance Decimal   @default(0) @db.Decimal(14, 2)
  currentBalance Decimal   @default(0) @db.Decimal(14, 2)
  
  // Status
  isDefault    Boolean       @default(false)
  isActive     Boolean       @default(true)
  
  // Relations
  transactions BankTransaction[]
  payments     Payment[]
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@unique([companyId, accountNo])
}

enum BankAccountType {
  SAVINGS       // ออมทรัพย์
  CURRENT       // กระแสรายวัน
  FIXED         // ฝากประจำ
}

// =============================================================================
// Bank Transactions
// =============================================================================

model BankTransaction {
  id             String      @id @default(cuid())
  bankAccountId  String
  bankAccount    BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  
  transactionDate DateTime
  valueDate      DateTime?
  
  type           BankTxType
  amount         Decimal     @db.Decimal(14, 2)
  runningBalance Decimal     @db.Decimal(14, 2)
  
  description    String?
  reference      String?     // เลขที่รายการจากธนาคาร
  
  // Reconciliation
  status         BankTxStatus @default(UNRECONCILED)
  reconciledAt   DateTime?
  
  // Linked Journal
  journalLineId  String?
  
  // Import source
  importBatchId  String?
  
  createdAt      DateTime    @default(now())
  
  @@index([bankAccountId, transactionDate])
  @@index([status])
}

enum BankTxType {
  DEPOSIT       // ฝาก/โอนเข้า
  WITHDRAWAL    // ถอน/โอนออก
  TRANSFER      // โอนระหว่างบัญชี
  FEE           // ค่าธรรมเนียม
  INTEREST      // ดอกเบี้ย
  CHEQUE_IN     // เช็ครับ
  CHEQUE_OUT    // เช็คจ่าย
}

enum BankTxStatus {
  UNRECONCILED  // ยังไม่กระทบยอด
  RECONCILED    // กระทบยอดแล้ว
  VOIDED        // ยกเลิก
}

// =============================================================================
// Petty Cash
// =============================================================================

model PettyCash {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name         String        // "เงินสดย่อยสำนักงาน"
  
  // Linked GL Account
  accountId    String
  account      Account  @relation(fields: [accountId], references: [id])
  
  // Fund
  fundLimit    Decimal       @db.Decimal(14, 2)  // วงเงิน
  currentBalance Decimal     @db.Decimal(14, 2)
  
  custodian    String?       // ผู้รับผิดชอบ
  
  transactions PettyCashTransaction[]
  
  isActive     Boolean       @default(true)
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model PettyCashTransaction {
  id           String    @id @default(cuid())
  pettyCashId  String
  pettyCash    PettyCash @relation(fields: [pettyCashId], references: [id], onDelete: Cascade)
  
  transactionDate DateTime
  type         PettyCashTxType
  amount       Decimal       @db.Decimal(14, 2)
  
  description  String
  
  // Linked expense
  expenseId    String?
  
  // Reimburse
  reimbursementDate DateTime?
  
  createdBy    String
  createdAt    DateTime      @default(now())
}

enum PettyCashTxType {
  REPLENISH     // เติมเงิน
  EXPENSE       // จ่ายเงิน
  REIMBURSE     // เบิกชดเชย
}
```

### 5.2 Features Checklist

- [ ] Bank Account Setup
  - [ ] Multiple accounts
  - [ ] Link to GL account
  
- [ ] Bank Reconciliation
  - [ ] Import statement (CSV/Excel)
  - [ ] Match transactions
  - [ ] Reconciliation report
  
- [ ] Petty Cash
  - [ ] Fund management
  - [ ] Expense tracking
  - [ ] Reimbursement
  
- [ ] Cash Flow Report
  - [ ] By bank account
  - [ ] By period

---

## 🔷 Phase 6: Asset Management

> **Goal:** จัดการทรัพย์สินถาวรและค่าเสื่อมราคา  
> **Duration:** 2-3 สัปดาห์  
> **Priority:** 🟢 Low

### 6.1 Database Schema

```prisma
model FixedAsset {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Basic Info
  assetNo      String        // รหัสทรัพย์สิน
  name         String
  description  String?
  
  category     AssetCategory
  location     String?
  
  // Acquisition
  purchaseDate DateTime
  purchasePrice Decimal      @db.Decimal(14, 2)
  purchaseDocId String?      // Link to purchase document
  
  // Depreciation
  depreciationMethod DepreciationMethod @default(STRAIGHT_LINE)
  usefulLife   Int           // ปี
  residualValue Decimal      @db.Decimal(14, 2)
  
  // Current Values
  accumulatedDepreciation Decimal @db.Decimal(14, 2)
  bookValue    Decimal       @db.Decimal(14, 2)
  
  // Accounts
  assetAccountId       String
  depreciationAccountId String
  accumulatedDepAccountId String
  
  // Status
  status       AssetStatus   @default(ACTIVE)
  disposalDate DateTime?
  disposalPrice Decimal?     @db.Decimal(14, 2)
  
  depreciationSchedule AssetDepreciation[]
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  @@unique([companyId, assetNo])
}

model AssetDepreciation {
  id           String     @id @default(cuid())
  assetId      String
  asset        FixedAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  periodDate   DateTime      // เดือน/ปี
  amount       Decimal       @db.Decimal(14, 2)
  
  journalId    String?
  
  isPosted     Boolean       @default(false)
  postedAt     DateTime?
  
  createdAt    DateTime      @default(now())
}

enum AssetCategory {
  LAND              // ที่ดิน
  BUILDING          // อาคาร
  EQUIPMENT         // เครื่องจักร/อุปกรณ์
  VEHICLE           // ยานพาหนะ
  FURNITURE         // เครื่องตกแต่ง
  COMPUTER          // คอมพิวเตอร์
  SOFTWARE          // ซอฟต์แวร์
  OTHER             // อื่นๆ
}

enum DepreciationMethod {
  STRAIGHT_LINE     // เส้นตรง
  DECLINING_BALANCE // ยอดลดลง
  UNITS_OF_PRODUCTION // ตามหน่วยผลิต
}

enum AssetStatus {
  ACTIVE            // ใช้งานอยู่
  DISPOSED          // จำหน่ายแล้ว
  WRITTEN_OFF       // ตัดจำหน่าย
}
```

### 6.2 Features Checklist

- [ ] Asset Register
- [ ] Depreciation Calculation
- [ ] Monthly Depreciation Journal
- [ ] Asset Disposal
- [ ] Asset Reports

---

## 🔷 Phase 7: Advanced Reports

> **Goal:** รายงานขั้นสูงและ Dashboard  
> **Duration:** 2-4 สัปดาห์  
> **Priority:** 🟢 Low

### 7.1 Reports Checklist

- [ ] Cash Flow Statement (งบกระแสเงินสด)
- [ ] Budget vs Actual
- [ ] Comparative Statements
- [ ] Custom Report Builder
- [ ] Dashboard Widgets
- [ ] Scheduled Reports (Email)
- [ ] Export to various formats

---

## 📋 Technical Considerations

### Performance Optimization

```typescript
// Index recommendations
@@index([companyId, docDate])
@@index([companyId, status])
@@index([contactId])

// Denormalization for reports
- currentStock in Product
- balanceDue in SalesDocument
- currentBalance in BankAccount
```

### Audit & Compliance

```typescript
// All financial documents must have:
- createdBy / createdAt
- approvedBy / approvedAt (if requires approval)
- Soft delete (deletedAt / deletedBy)
- Cannot delete posted journals
- Void instead of delete
```

### Multi-Currency (Future)

```prisma
model Currency {
  code         String   @id  // THB, USD, EUR
  name         String
  symbol       String
  decimalPlaces Int     @default(2)
}

// Add to documents:
currencyCode String @default("THB")
exchangeRate Decimal @default(1)
amountInCurrency Decimal
amountInBase Decimal  // Always in THB
```

---

## 🎯 Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 1 | Journal accuracy | Debit = Credit 100% |
| Phase 1 | Trial Balance | Zero difference |
| Phase 2 | Invoice to Cash cycle | Trackable |
| Phase 3 | AP Aging accuracy | 100% |
| Phase 4 | Stock accuracy | 99%+ |
| Phase 5 | Bank reconciliation | Monthly complete |
| Overall | User satisfaction | > PEAK experience |

---

## 🚀 Getting Started

### Immediate Next Steps

1. **Review this document** with team
2. **Prioritize phases** based on business needs
3. **Start Phase 1** - Core Accounting
   - Run migration for Journal models
   - Implement auto-journal generator
   - Build General Ledger view

### Commands to Start

```bash
# After schema changes
npm run db:generate
npm run db:push

# Seed system accounts
npx ts-node prisma/seed-accounts.ts

# Run backfill for existing data
npx ts-node scripts/backfill-journals.ts
```

---

## 🔀 Hybrid Approach: Quick Entry vs Document Flow

### ทำไมต้อง Hybrid?

SME ไทยมีรายการหลากหลายประเภท:
- **80%** เป็นรายการเล็กๆ จ่ายเงินทันที → ไม่ต้องการเอกสารซับซ้อน
- **20%** เป็นรายการใหญ่ ซื้อเครดิต → ต้องการ track AP/AR

### เปรียบเทียบ Approach

| Approach | ข้อดี | ข้อเสีย |
|----------|------|--------|
| **Document-only (PEAK)** | ครบถ้วนตามหลักบัญชี | ยุ่งยาก ต้องสร้างเอกสารทุกรายการ |
| **Quick Entry only** | ง่าย รวดเร็ว | ไม่มี AP/AR tracking |
| **Hybrid (แนะนำ)** | ยืดหยุ่น เลือกใช้ตามสถานการณ์ | ต้องมี validation ป้องกันซ้ำซ้อน |

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  QUICK MODE   │     │  SALES MODE   │     │ PURCHASE MODE │
│  (รายการด่วน)  │     │  (ขายครบวงจร)  │     │ (ซื้อครบวงจร)  │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ Quick Expense │     │ Quotation     │     │ Purchase Order│
│ Quick Income  │     │ Invoice       │     │ Goods Receipt │
│ Reimbursement │     │ Receipt       │     │ AP Invoice    │
│               │     │ Credit Note   │     │ Payment       │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │    AUTO JOURNAL GENERATOR    │
               │   ทุกอย่างลงบัญชีอัตโนมัติ      │
               └──────────────────────────────┘
```

### เมื่อไหร่ใช้อะไร

| สถานการณ์ | ใช้ | เหตุผล |
|-----------|-----|--------|
| ซื้อกาแฟ 7-11 จ่ายสด | Quick Expense | จ่ายเงินทันที ไม่มีเจ้าหนี้ |
| ค่าเช่า/ค่าน้ำ/ค่าไฟ | Quick Expense | จ่ายเงินทันที + หัก WHT |
| สั่งผ้า 100,000 เครดิต 30 วัน | Purchase Flow | ต้อง track AP |
| รับเงินสดหน้าร้าน | Quick Income | รับเงินทันที ไม่มีลูกหนี้ |
| ขายให้บริษัท ขอใบกำกับ | Sales Flow | ต้องมี Invoice + track AR |
| พนักงานเบิกค่าเดินทาง | Reimbursement | มี workflow อนุมัติ |

### Journal Entry เปรียบเทียบ

#### Quick Expense (จ่ายเงินทันที)
```
ซื้อของ 1,070 บาท (รวม VAT 7%)

Dr. ค่าใช้จ่าย (530xxx)     1,000.00
Dr. ภาษีซื้อ (110501)          70.00
    Cr. เงินฝากธนาคาร (110201)     1,070.00
```

#### Purchase Flow (ซื้อเครดิต)
```
สั่งซื้อวัตถุดิบ 10,700 บาท (รวม VAT) เครดิต 30 วัน

Step 1: บันทึกบิลซื้อ (AP Invoice)
Dr. วัตถุดิบ (510101)      10,000.00
Dr. ภาษีซื้อ (110501)         700.00
    Cr. เจ้าหนี้การค้า (210101)    10,700.00

Step 2: จ่ายเงิน (30 วันถัดมา)
Dr. เจ้าหนี้การค้า (210101) 10,700.00
    Cr. เงินฝากธนาคาร (110201)    10,700.00
```

**ทั้งสองแบบถูกต้องตามหลักบัญชี Double-entry!**

---

## 🛡️ Data Integrity & Duplicate Prevention

### ปัญหาที่ต้องป้องกัน

1. **Duplicate Entry** - ลงรายการซ้ำจากเอกสารเดียวกัน
2. **Double Journal** - สร้าง Journal ซ้ำจาก Source Document เดียว
3. **Inconsistent Data** - Debit ≠ Credit
4. **Orphan Records** - เอกสารที่ไม่มี Journal

### Solution 1: Source Document Tracking

```prisma
model JournalEntry {
  id          String   @id @default(cuid())
  // ...
  
  // Track source document
  sourceType  JournalSourceType?
  sourceId    String?
  
  // ป้องกัน duplicate: 1 เอกสาร = 1 Journal
  @@unique([sourceType, sourceId])
}

enum JournalSourceType {
  MANUAL          // บันทึกด้วยมือ
  EXPENSE         // จาก Quick Expense
  INCOME          // จาก Quick Income
  INVOICE         // จาก Sales Invoice
  RECEIPT         // จาก Receipt
  AP_INVOICE      // จาก Purchase Invoice
  PAYMENT         // จาก Payment
  REIMBURSEMENT   // จาก ReimbursementRequest
}
```

### Solution 2: Invoice Number Uniqueness

```prisma
model Expense {
  // ...
  invoiceNumber String?
  
  // ป้องกันลงเลขใบกำกับซ้ำ
  @@unique([companyId, invoiceNumber])
}

model PurchaseDocument {
  // ...
  vendorInvoiceNo String?
  
  // ป้องกันลงเลขบิลซื้อซ้ำ
  @@unique([companyId, contactId, vendorInvoiceNo])
}
```

### Solution 3: Validation Rules

```typescript
// src/lib/validations/duplicate-check.ts

export async function checkDuplicateInvoice(
  companyId: string,
  invoiceNumber: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.expense.findFirst({
    where: {
      companyId,
      invoiceNumber,
      id: excludeId ? { not: excludeId } : undefined,
      deletedAt: null,
    },
  });
  return !!existing;
}

export async function checkDuplicateJournal(
  sourceType: JournalSourceType,
  sourceId: string
): Promise<boolean> {
  const existing = await prisma.journalEntry.findFirst({
    where: { sourceType, sourceId },
  });
  return !!existing;
}

export function validateJournalBalance(
  lines: { debit: Decimal; credit: Decimal }[]
): { isValid: boolean; difference: Decimal } {
  const totalDebit = lines.reduce((sum, l) => sum.plus(l.debit), new Decimal(0));
  const totalCredit = lines.reduce((sum, l) => sum.plus(l.credit), new Decimal(0));
  const difference = totalDebit.minus(totalCredit).abs();
  
  return {
    isValid: difference.equals(0),
    difference,
  };
}
```

### Solution 4: Transaction Wrapper

```typescript
// src/lib/accounting/transaction-wrapper.ts

export async function createExpenseWithJournal(
  data: ExpenseInput
): Promise<{ expense: Expense; journal: JournalEntry }> {
  return prisma.$transaction(async (tx) => {
    // 1. Check duplicate invoice
    if (data.invoiceNumber) {
      const isDuplicate = await checkDuplicateInvoice(
        data.companyId,
        data.invoiceNumber
      );
      if (isDuplicate) {
        throw new Error(`เลขที่ใบกำกับ ${data.invoiceNumber} ถูกบันทึกแล้ว`);
      }
    }
    
    // 2. Create Expense
    const expense = await tx.expense.create({ data });
    
    // 3. Generate Journal (atomic - ถ้า fail จะ rollback ทั้งหมด)
    const journal = await createJournalFromExpense(expense, tx);
    
    // 4. Link back
    await tx.expense.update({
      where: { id: expense.id },
      data: { journalId: journal.id },
    });
    
    return { expense, journal };
  });
}
```

### Solution 5: Audit Trail

```typescript
// ทุกการเปลี่ยนแปลงต้องมี Audit Log
async function logChange(
  action: AuditAction,
  entityType: string,
  entityId: string,
  changes: object,
  userId: string
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      changes,
      userId,
      createdAt: new Date(),
    },
  });
}

// ห้ามลบ Journal ที่ Posted แล้ว - ต้อง Void แทน
async function deleteJournal(journalId: string) {
  const journal = await prisma.journalEntry.findUnique({
    where: { id: journalId },
  });
  
  if (journal?.status === 'POSTED') {
    throw new Error('ไม่สามารถลบ Journal ที่ผ่านรายการแล้ว กรุณา Void แทน');
  }
  
  // Only DRAFT can be deleted
  await prisma.journalEntry.delete({ where: { id: journalId } });
}
```

### Validation Checklist

| Check | เมื่อไหร่ | Action |
|-------|---------|--------|
| Duplicate Invoice Number | Before save | Block + Show error |
| Duplicate Journal | Before create | Skip if exists |
| Debit ≠ Credit | Before post | Block + Show error |
| Missing Account | Before save | Block + Show error |
| Future Date | Before save | Warning (allow) |
| Negative Amount | Before save | Block + Show error |

### Error Messages (Thai)

```typescript
const ERROR_MESSAGES = {
  DUPLICATE_INVOICE: 'เลขที่ใบกำกับนี้ถูกบันทึกแล้ว',
  DUPLICATE_JOURNAL: 'รายการนี้ถูกลงบัญชีแล้ว',
  UNBALANCED_JOURNAL: 'ยอด Debit และ Credit ไม่เท่ากัน',
  MISSING_ACCOUNT: 'กรุณาเลือกบัญชี',
  NEGATIVE_AMOUNT: 'จำนวนเงินต้องมากกว่า 0',
  CANNOT_DELETE_POSTED: 'ไม่สามารถลบรายการที่ผ่านแล้ว กรุณา Void แทน',
  CANNOT_EDIT_POSTED: 'ไม่สามารถแก้ไขรายการที่ผ่านแล้ว',
};
```

---

## 🔄 Migration Strategy for Existing Data

### Current State Analysis

```
ข้อมูลที่มีอยู่:
├── Expense records (มี accountId)
├── Income records (มี accountId)
├── ReimbursementRequest records
└── ❌ ไม่มี JournalEntry

เป้าหมาย:
├── ทุก Expense → มี Journal
├── ทุก Income → มี Journal
└── ทุก Reimbursement (PAID) → มี Journal
```

### Migration Script

```typescript
// scripts/backfill-journals.ts

async function backfillJournals() {
  console.log('🚀 Starting journal backfill...');
  
  // 1. Backfill Expenses
  const expenses = await prisma.expense.findMany({
    where: { journalId: null, deletedAt: null },
    include: { account: true, contact: true, company: true },
  });
  
  console.log(`📦 Found ${expenses.length} expenses without journals`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const expense of expenses) {
    try {
      await prisma.$transaction(async (tx) => {
        const journal = await createJournalFromExpense(expense, tx);
        await tx.expense.update({
          where: { id: expense.id },
          data: { journalId: journal.id },
        });
      });
      successCount++;
      console.log(`✅ Expense ${expense.id}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Expense ${expense.id}:`, error.message);
    }
  }
  
  // 2. Backfill Incomes (similar logic)
  // ...
  
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Backfill Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Success: ${successCount}
❌ Errors:  ${errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
```

### Rollback Plan

```typescript
// scripts/rollback-journals.ts
// ใช้ในกรณีที่ migration มีปัญหา

async function rollbackJournals() {
  // 1. Find all auto-generated journals
  const journals = await prisma.journalEntry.findMany({
    where: {
      sourceType: { in: ['EXPENSE', 'INCOME'] },
    },
  });
  
  // 2. Unlink from source documents
  for (const journal of journals) {
    if (journal.sourceType === 'EXPENSE') {
      await prisma.expense.updateMany({
        where: { journalId: journal.id },
        data: { journalId: null },
      });
    }
    // ...
  }
  
  // 3. Delete journals
  await prisma.journalEntry.deleteMany({
    where: {
      sourceType: { in: ['EXPENSE', 'INCOME'] },
    },
  });
}
```

---

## 👥 Contact Management: Unified Approach

### ทำไมรวม Vendor/Customer เป็น Contact เดียว?

#### เปรียบเทียบ 2 แนวทาง

| Approach | ข้อดี | ข้อเสีย |
|----------|------|--------|
| **แยก Table (Vendor/Customer)** | แยกข้อมูลชัดเจน | ข้อมูลซ้ำซ้อน, บริษัทที่เป็นทั้งคู่ต้องสร้าง 2 records |
| **รวม Table (Contact)** ⭐ | ไม่ซ้ำซ้อน, 1 บริษัท = 1 record | ต้องมี flag แยกประเภท |

#### ปัญหาถ้าแยก Table

```
❌ แยก Vendor / Customer

บริษัท ผ้าไทย จำกัด:
├── Vendor record: ซื้อผ้าจากเขา
└── Customer record: ขายผ้าให้เขา

ปัญหา:
1. เปลี่ยนที่อยู่ → ต้องแก้ 2 ที่
2. ดู Tax ID ซ้ำ → query 2 tables
3. ดูยอดรวม AR-AP → ยุ่งมาก
```

#### ข้อดีของ Unified Contact

```
✅ รวมเป็น Contact เดียว

บริษัท ผ้าไทย จำกัด:
└── Contact (category: BOTH)
    ├── AR Balance: 50,000 (เขาติดเรา)
    └── AP Balance: 30,000 (เราติดเขา)
    → Net: +20,000 (เขาติดเรา)

ข้อดี:
1. เปลี่ยนที่อยู่ → แก้ที่เดียว
2. Tax ID unique → check ง่าย
3. ดู Net Position → query เดียว
```

### Current Schema (ดีอยู่แล้ว!)

```prisma
enum ContactCategory {
  CUSTOMER  // ลูกค้า
  VENDOR    // ผู้จำหน่าย/ร้านค้า
  BOTH      // ทั้งลูกค้าและผู้จำหน่าย ← KEY!
  OTHER     // อื่นๆ
}

enum EntityType {
  INDIVIDUAL  // บุคคลธรรมดา → ภ.ง.ด.3
  COMPANY     // นิติบุคคล → ภ.ง.ด.53
}

model Contact {
  id              String  @id @default(cuid())
  companyId       String
  
  // Classification
  contactCategory ContactCategory @default(VENDOR)
  entityType      EntityType @default(COMPANY)
  
  // Basic Info
  name            String
  taxId           String?
  branchCode      String? @default("00000")
  
  // Address
  address         String?
  subDistrict     String?
  district        String?
  province        String?
  postalCode      String?
  
  // Contact
  contactPerson   String?
  phone           String?
  email           String?
  
  // Banking
  bankAccount     String?
  bankName        String?
  
  // Credit Terms
  creditLimit     Decimal?
  paymentTerms    Int?
  
  // Relations
  expenses        Expense[]
  incomes         Income[]
  salesDocuments  SalesDocument[]
  purchaseDocuments PurchaseDocument[]
  
  @@unique([companyId, taxId])  // ป้องกัน Tax ID ซ้ำ
}
```

### Enhanced Schema (Optional)

```prisma
model Contact {
  // ... existing fields ...
  
  // 🆕 แยก Credit Terms ตาม Role
  // เมื่อเป็นลูกค้า
  customerCreditDays   Int?      // วันเครดิตให้ลูกค้า
  customerCreditLimit  Decimal?  // วงเงินเครดิตให้ลูกค้า
  customerPriceLevel   String?   // ระดับราคา (A, B, C)
  
  // เมื่อเป็น Vendor
  vendorCreditDays     Int?      // วันเครดิตจาก Vendor
  vendorPaymentMethod  PaymentMethod? // วิธีจ่ายเงินให้ Vendor
  vendorLeadTime       Int?      // Lead time (วัน)
  
  // 🆕 Default Accounts
  arAccountId          String?   // บัญชีลูกหนี้ default
  apAccountId          String?   // บัญชีเจ้าหนี้ default
  salesAccountId       String?   // บัญชีรายได้ default
  purchaseAccountId    String?   // บัญชีซื้อ default
}
```

### UI Filtering by Category

```typescript
// src/lib/contacts/queries.ts

// หน้า Sales: แสดงเฉพาะ CUSTOMER หรือ BOTH
export async function getCustomers(companyId: string) {
  return prisma.contact.findMany({
    where: {
      companyId,
      contactCategory: { in: ['CUSTOMER', 'BOTH'] },
      // ไม่แสดง VENDOR-only
    },
    orderBy: { name: 'asc' },
  });
}

// หน้า Purchase: แสดงเฉพาะ VENDOR หรือ BOTH
export async function getVendors(companyId: string) {
  return prisma.contact.findMany({
    where: {
      companyId,
      contactCategory: { in: ['VENDOR', 'BOTH'] },
      // ไม่แสดง CUSTOMER-only
    },
    orderBy: { name: 'asc' },
  });
}

// ดูทั้งหมด
export async function getAllContacts(companyId: string) {
  return prisma.contact.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });
}
```

### AR/AP Balance Queries

```typescript
// src/lib/contacts/balance.ts

// ดูยอดลูกหนี้ (AR) - เมื่อเขาเป็นลูกค้า
export async function getARBalance(contactId: string): Promise<Decimal> {
  const result = await prisma.salesDocument.aggregate({
    where: {
      contactId,
      docType: 'INVOICE',
      status: { in: ['APPROVED', 'PARTIAL'] },
    },
    _sum: { balanceDue: true },
  });
  return result._sum.balanceDue || new Decimal(0);
}

// ดูยอดเจ้าหนี้ (AP) - เมื่อเขาเป็น Vendor
export async function getAPBalance(contactId: string): Promise<Decimal> {
  const result = await prisma.purchaseDocument.aggregate({
    where: {
      contactId,
      docType: 'PURCHASE_INVOICE',
      status: { in: ['APPROVED', 'PARTIAL_PAID'] },
    },
    _sum: { balanceDue: true },
  });
  return result._sum.balanceDue || new Decimal(0);
}

// Net Position
export async function getNetPosition(contactId: string) {
  const arBalance = await getARBalance(contactId);
  const apBalance = await getAPBalance(contactId);
  const netPosition = arBalance.minus(apBalance);
  
  return {
    arBalance,      // เขาติดเรา
    apBalance,      // เราติดเขา
    netPosition,    // + = เขาติดเรา, - = เราติดเขา
  };
}
```

### Auto-upgrade Category

```typescript
// src/lib/contacts/category-manager.ts

// อัพเกรด category อัตโนมัติเมื่อใช้งาน
export async function ensureContactCategory(
  contactId: string,
  usedAs: 'CUSTOMER' | 'VENDOR'
) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });
  
  if (!contact) return;
  
  // ถ้าใช้เป็น Customer แต่ตอนนี้เป็น VENDOR → เปลี่ยนเป็น BOTH
  if (usedAs === 'CUSTOMER' && contact.contactCategory === 'VENDOR') {
    await prisma.contact.update({
      where: { id: contactId },
      data: { contactCategory: 'BOTH' },
    });
  }
  
  // ถ้าใช้เป็น Vendor แต่ตอนนี้เป็น CUSTOMER → เปลี่ยนเป็น BOTH
  if (usedAs === 'VENDOR' && contact.contactCategory === 'CUSTOMER') {
    await prisma.contact.update({
      where: { id: contactId },
      data: { contactCategory: 'BOTH' },
    });
  }
}

// เรียกใช้เมื่อสร้าง Invoice
async function createInvoice(data: InvoiceInput) {
  // Auto-upgrade ถ้าจำเป็น
  await ensureContactCategory(data.contactId, 'CUSTOMER');
  
  // สร้าง Invoice...
}

// เรียกใช้เมื่อสร้าง PO
async function createPurchaseOrder(data: POInput) {
  // Auto-upgrade ถ้าจำเป็น
  await ensureContactCategory(data.contactId, 'VENDOR');
  
  // สร้าง PO...
}
```

### Contact Card UI

```typescript
// src/components/contacts/contact-card.tsx

interface ContactCardProps {
  contact: Contact;
  showBalances?: boolean;
}

export function ContactCard({ contact, showBalances }: ContactCardProps) {
  const { arBalance, apBalance, netPosition } = useContactBalance(contact.id);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ContactCategoryBadge category={contact.contactCategory} />
          <h3>{contact.name}</h3>
        </div>
      </CardHeader>
      
      <CardContent>
        <div>Tax ID: {contact.taxId || '-'}</div>
        <div>Tel: {contact.phone || '-'}</div>
        
        {showBalances && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div>
              <div className="text-sm text-muted-foreground">ลูกหนี้ (AR)</div>
              <div className="text-green-600">{formatCurrency(arBalance)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">เจ้าหนี้ (AP)</div>
              <div className="text-red-600">{formatCurrency(apBalance)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Net</div>
              <div className={netPosition >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(netPosition)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContactCategoryBadge({ category }: { category: ContactCategory }) {
  const config = {
    CUSTOMER: { label: 'ลูกค้า', color: 'bg-blue-100 text-blue-800' },
    VENDOR: { label: 'ผู้จำหน่าย', color: 'bg-orange-100 text-orange-800' },
    BOTH: { label: 'ลูกค้า+ผู้จำหน่าย', color: 'bg-purple-100 text-purple-800' },
    OTHER: { label: 'อื่นๆ', color: 'bg-gray-100 text-gray-800' },
  };
  
  const { label, color } = config[category];
  
  return <Badge className={color}>{label}</Badge>;
}
```

### PEAK Compatibility

```typescript
// ระบบ Contact ของเราเข้ากันได้กับ PEAK

// PEAK Contact Format:
// C00001 - บริษัท ABC (ลูกค้า)
// C00002 - บริษัท XYZ (ผู้จำหน่าย)
// C00003 - บริษัท 123 (ทั้งคู่)

// Export to PEAK
function exportContactToPeak(contact: Contact) {
  return {
    code: contact.peakCode,           // C00001
    name: contact.name,               // บริษัท ABC จำกัด
    taxId: contact.taxId,             // 0123456789012
    branchCode: contact.branchCode,   // 00000
    type: contact.entityType === 'COMPANY' ? 'นิติบุคคล' : 'บุคคลธรรมดา',
    // PEAK ก็ใช้ Contact เดียวเหมือนกัน!
  };
}
```

### Summary

| คำถาม | คำตอบ |
|-------|-------|
| แยก Vendor/Customer table? | ❌ **ไม่แยก** |
| ใช้ Contact เดียว? | ✅ **ใช่** |
| แยกประเภทยังไง? | ใช้ `contactCategory` enum |
| บริษัทเป็นทั้งคู่? | ✅ ใช้ `BOTH` |
| PEAK เข้ากันได้? | ✅ **เข้ากันได้** |
| ดู AR/AP แยก? | ✅ Query แยกตาม document type |

---

## 📚 References

- [PEAK API Documentation](https://peakaccount.com)
- [Thai Accounting Standards](https://www.tfac.or.th)
- [Double-entry Bookkeeping](https://en.wikipedia.org/wiki/Double-entry_bookkeeping)
- [ภ.พ.30 / ภ.ง.ด.53 Forms](https://www.rd.go.th)

---

**Document Version:** 1.2  
**Last Updated:** January 12, 2026  
**Author:** AI Assistant  
**Status:** Ready for Review ✅

---

## 📝 Changelog

### v1.2 (January 12, 2026)
- Added Contact Management: Unified Approach section
- Added AR/AP Balance queries
- Added Auto-upgrade category logic
- Added Contact Card UI component
- Added PEAK compatibility notes

### v1.1 (January 12, 2026)
- Added Hybrid Approach section
- Added Data Integrity & Duplicate Prevention
- Added Migration Strategy for existing data
- Added validation rules and error messages

### v1.0 (January 12, 2026)
- Initial document
- Complete 7-phase roadmap
- Database schema for all phases
