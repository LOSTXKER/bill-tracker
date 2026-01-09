# 📋 FlowDoc - Complete Implementation Plan

**Version:** 3.0 (Complete Edition)  
**Date:** 9 มกราคม 2569  
**Status:** Ready for Development 🚀

---

## 📊 สารบัญ

1. [Executive Summary](#1-executive-summary)
2. [Problem & Solution](#2-problem--solution)
3. [Target Market Analysis](#3-target-market-analysis)
4. [Product Features](#4-product-features)
5. [Tech Stack & Architecture](#5-tech-stack--architecture)
6. [UI/UX Design Guide](#6-uiux-design-guide)
7. [Database Schema](#7-database-schema)
8. [API Integrations](#8-api-integrations)
9. [Development Sprints](#9-development-sprints)
10. [Business Model](#10-business-model)
11. [Financial Projections](#11-financial-projections)
12. [Go-to-Market Strategy](#12-go-to-market-strategy)
13. [Risk Assessment](#13-risk-assessment)
14. [Success Metrics](#14-success-metrics)
15. [Getting Started](#15-getting-started)

---

## 1. Executive Summary

### 🎯 What is FlowDoc?

**FlowDoc** คือระบบจัดการลำเลียงเอกสารและกระทบยอดอัตโนมัติ สำหรับธุรกิจ SME และสำนักงานบัญชี

**Slogan:** *"เลิกตามเอกสารผ่านไลน์ เลิกคีย์ข้อมูลซ้ำซ้อน Sync ตรงเข้า PEAK/FlowAccount ได้ในคลิกเดียว"*

### 🎪 Value Proposition

| สำหรับ | Pain Point | FlowDoc Solution |
|--------|------------|------------------|
| **เจ้าของธุรกิจ** | ส่งบิลผ่าน LINE แล้วหาย | ระบบเก็บอัตโนมัติ ไม่หาย |
| **เจ้าของธุรกิจ** | ขี้เกียจคีย์ข้อมูล | AI อ่านบิลให้ ไม่ต้องคีย์ |
| **นักบัญชี** | เสียเวลาทวงเอกสาร | แจ้งเตือนอัตโนมัติ |
| **นักบัญชี** | คีย์ข้อมูลซ้ำๆ | Sync ตรงเข้า PEAK/FlowAccount |
| **สำนักงานบัญชี** | จัดการลูกค้าหลายราย | Multi-tenant, แยกบริษัท |

### 🔌 Platform Support

| Platform | Integration | Status |
|----------|-------------|--------|
| **PEAK Account** | Real-time API | Primary (P0) |
| **FlowAccount** | Real-time API | Secondary (P1) |
| **Express** | File Export | Fallback (P2) |

### ⏱️ Timeline & Investment

| Metric | Value |
|--------|-------|
| **Development Time** | 8 สัปดาห์ |
| **Total Hours** | ~200 hours |
| **Team Size** | 1-2 developers |
| **Estimated Dev Cost** | ฿200,000 - ฿300,000 |

---

## 2. Problem & Solution

### 😫 ปัญหาที่เราจะแก้ (The Pain Points)

#### ฝั่งเจ้าของธุรกิจ (SME/Client)

| ปัญหา | ความถี่ | ความรุนแรง |
|-------|---------|------------|
| ส่งเอกสารผ่าน LINE แล้วไฟล์หมดอายุ | ทุกวัน | 🔴 สูง |
| รูปไม่ชัด ต้องถ่ายใหม่ | 3-4 ครั้ง/สัปดาห์ | 🟡 กลาง |
| ขี้เกียจคีย์ข้อมูลลง Excel/โปรแกรมบัญชี | ทุกวัน | 🔴 สูง |
| เอกสารหาย ลืมขอใบกำกับภาษี | 2-3 ครั้ง/เดือน | 🔴 สูง |
| ไม่รู้ว่าส่งบัญชีครบหรือยัง | สิ้นเดือน | 🟡 กลาง |

#### ฝั่งนักบัญชี (Accountant)

| ปัญหา | เวลาที่เสีย | ความรุนแรง |
|-------|-------------|------------|
| ทวงเอกสารจากลูกค้า | 2-3 ชม./วัน | 🔴 สูง |
| จัดเรียงบิล แยกประเภท | 1-2 ชม./วัน | 🟡 กลาง |
| คีย์ข้อมูลจากรูปภาพลง Express | 3-4 ชม./วัน | 🔴 สูง |
| เทียบ Statement กับบิล | 2-3 ชม./สัปดาห์ | 🟡 กลาง |
| ไม่รู้ว่าลูกค้าส่งครบหรือยัง | สิ้นเดือน | 🔴 สูง |

**📊 สรุป: นักบัญชีเสียเวลา ~70% ไปกับงาน "ไม่ใช่บัญชี"**

---

### 💡 โซลูชันของเรา (The FlowDoc Solution)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FlowDoc Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ลูกค้า SME                        นักบัญชี                     │
│       │                                 │                        │
│       ▼                                 │                        │
│   ┌──────────┐     AI OCR          ┌────▼─────┐                 │
│   │ ถ่ายรูป  │────────────────────►│ Document │                 │
│   │ อัปโหลด  │     Auto-Sort       │ Inbox    │                 │
│   │ (Web/LINE)│                     └────┬─────┘                 │
│   └──────────┘                          │                        │
│                                         ▼                        │
│                                    ┌──────────┐                  │
│   ┌──────────┐    Auto-Match       │Reconcile │                 │
│   │ Statement│────────────────────►│ Center   │                 │
│   │ (CSV)    │                     └────┬─────┘                 │
│   └──────────┘                          │                        │
│                                         ▼                        │
│                                    ┌──────────┐                  │
│                                    │Accounting│                 │
│                                    │ Bridge   │                 │
│                                    └────┬─────┘                  │
│                                         │                        │
│                    ┌────────────────────┼────────────────────┐   │
│                    ▼                    ▼                    ▼   │
│               ┌────────┐          ┌──────────┐         ┌──────┐ │
│               │  PEAK  │          │FlowAccount│         │Express│ │
│               │  API   │          │   API    │         │ File │ │
│               └────────┘          └──────────┘         └──────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Target Market Analysis

### 🎯 Primary Target: สำนักงานบัญชี

**Profile:**
- จำนวนในไทย: ~15,000 สำนักงาน
- ขนาด: 2-20 คน
- ลูกค้าที่ดูแล: 20-200 บริษัท
- ค่าบริการ: ฿2,000-20,000/บริษัท/เดือน

**Pain Points:**
- เสียเวลาทวงเอกสาร
- คีย์ข้อมูลซ้ำ
- ลูกค้าส่งไม่ครบ

**Buying Criteria:**
- ประหยัดเวลา
- ใช้ง่าย
- เชื่อมกับโปรแกรมบัญชีที่ใช้อยู่

### 🎯 Secondary Target: SME ที่มีบิลเยอะ

**Profile:**
- ธุรกิจ e-commerce
- ธุรกิจขายส่ง
- ธุรกิจบริการ
- รายรับ: ฿1-50 ล้าน/ปี

**Pain Points:**
- จัดการสลิป/บิลไม่ไหว
- หาเอกสารไม่เจอ
- ส่งบัญชีช้า

### 📊 Market Size (Thailand)

| Segment | จำนวน | Addressable |
|---------|-------|-------------|
| สำนักงานบัญชี | 15,000 | 5,000 (33%) |
| SME (บิลเยอะ) | 100,000 | 20,000 (20%) |
| **Total TAM** | 115,000 | **25,000** |

**ถ้าได้ 1% = 250 customers → MRR ฿400K+**

---

## 4. Product Features

### 📦 Module 1: Smart Inbox

**คำอธิบาย:** หน้าจอที่ง่ายที่สุด มีแค่ปุ่มถ่ายรูป/อัปโหลด

| Feature | Description | Priority |
|---------|-------------|----------|
| **Quick Upload** | ลากไฟล์/ถ่ายรูป อัปโหลดทีละหลายไฟล์ | P0 |
| **AI Classification** | แยกประเภทอัตโนมัติ (ซื้อ/ขาย/สลิป/50ทวิ) | P0 |
| **AI OCR** | อ่านข้อมูลจากบิล (ชื่อร้าน, ยอด, วันที่) | P0 |
| **Document Review** | ตรวจสอบ/แก้ไขข้อมูลที่ AI อ่าน | P0 |
| **LINE Connect** | ส่งรูปผ่าน LINE OA เข้าระบบ | P1 |
| **Batch Edit** | แก้ไขหลายรายการพร้อมกัน | P2 |

**User Flow:**
```
Upload → AI Classify → AI OCR → Review → Save
  ↑                                        ↓
  └──────── Edit if needed ───────────────┘
```

### 📦 Module 2: Auto-Reconcile Center

**คำอธิบาย:** อัปโหลด Statement แล้วระบบจับคู่กับบิลให้อัตโนมัติ

| Feature | Description | Priority |
|---------|-------------|----------|
| **Statement Import** | อัปโหลด CSV/Excel จากธนาคาร | P0 |
| **Multi-Bank Support** | SCB, KBANK, BBL, KTB, BAY | P0 |
| **Auto-Match** | จับคู่ยอด+วันที่อัตโนมัติ | P0 |
| **Manual Match** | จับคู่ด้วยตัวเองถ้า AI พลาด | P0 |
| **Missing Alert** | ไฮไลท์รายการที่ยังไม่มีบิล | P1 |
| **LINE Notify** | แจ้งลูกค้าให้ส่งบิลเพิ่ม | P1 |

**Matching Algorithm:**
```
Strategy 1: Exact Amount (±0.5 บาท) + Date (±3 วัน) → 50% weight
Strategy 2: Invoice/Reference Number Match → 30% weight
Strategy 3: Vendor Pattern Match → 20% weight

Confidence Score:
  90-100%: Auto-match ✓
  70-89%:  Suggested (need review)
  50-69%:  Possible (manual review)
  <50%:    No match found
```

### 📦 Module 3: Accounting Bridge

**คำอธิบาย:** Sync ข้อมูลเข้าโปรแกรมบัญชีแบบ Real-time

| Feature | Description | Priority |
|---------|-------------|----------|
| **PEAK Sync** | Push Expense/Receipt เข้า PEAK | P0 |
| **FlowAccount Sync** | Push Expense/Document เข้า FlowAccount | P1 |
| **Express Export** | Export CSV + ZIP รูปสำหรับ Express | P2 |
| **Attach Files** | แนบรูปบิลเข้าเอกสารใน PEAK | P0 |
| **Sync Status** | ดูสถานะการ Sync แต่ละรายการ | P0 |
| **Retry Failed** | Retry รายการที่ Sync ไม่สำเร็จ | P1 |

---

## 5. Tech Stack & Architecture

### 🛠️ Core Technologies

| Layer | Technology | Reason |
|-------|------------|--------|
| **Framework** | Next.js 15 (App Router) | Full-stack, SSR, API routes |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + Shadcn UI | Rapid development |
| **Database** | PostgreSQL (Supabase) | Reliable, free tier |
| **ORM** | Prisma 6 | Type-safe queries |
| **Storage** | Supabase Storage | Free 1GB, easy integration |
| **Auth** | NextAuth.js v5 | Secure, flexible |
| **AI** | Google Gemini 2.0 Flash | Fast, accurate, affordable |

### 📦 Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "next-auth": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@google/generative-ai": "^0.21.0",
    "zod": "^3.23.0",
    "date-fns": "^3.0.0",
    "xlsx": "^0.18.0",
    "jszip": "^3.10.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0"
  }
}
```

### 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │   Web App   │    │  LINE OA    │    │   Mobile    │         │
│   │  (Next.js)  │    │  (Webhook)  │    │ (Responsive)│         │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│          │                  │                  │                 │
└──────────┼──────────────────┼──────────────────┼─────────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   /api/auth/*           - Authentication                         │
│   /api/documents/*      - Document CRUD                          │
│   /api/statements/*     - Bank Statement Import                  │
│   /api/reconcile/*      - Matching Engine                        │
│   /api/sync/peak/*      - PEAK API Integration                   │
│   /api/sync/flowaccount/* - FlowAccount Integration              │
│   /api/export/*         - Express Export                         │
│   /api/webhooks/line/*  - LINE Messaging                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CORE SERVICES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐   ┌─────────────────┐                     │
│   │   AI Service    │   │  Reconcile      │                     │
│   │   ├── OCR       │   │  Engine         │                     │
│   │   ├── Classify  │   │  ├── Matcher    │                     │
│   │   └── Extract   │   │  └── Scorer     │                     │
│   └─────────────────┘   └─────────────────┘                     │
│                                                                  │
│   ┌─────────────────┐   ┌─────────────────┐                     │
│   │ Statement       │   │  Accounting     │                     │
│   │ Parser          │   │  Bridge         │                     │
│   │ ├── SCB         │   │  ├── PEAK       │                     │
│   │ ├── KBANK       │   │  ├── FlowAccount│                     │
│   │ └── BBL         │   │  └── Express    │                     │
│   └─────────────────┘   └─────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │    Supabase     │  │  External APIs  │
│   (Prisma)      │  │    Storage      │  │  ├── PEAK       │
│                 │  │                 │  │  ├── FlowAccount│
│                 │  │                 │  │  └── Gemini     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 📁 Project Structure

```
flowdoc/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration files
│
├── public/                        # Static assets
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Auth pages
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (dashboard)/           # Protected pages
│   │   │   ├── [company]/         # Multi-tenant
│   │   │   │   ├── inbox/         # Smart Inbox
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reconcile/     # Reconciliation
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── sync/          # Platform Sync
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── peak/page.tsx
│   │   │   │   │   └── flowaccount/page.tsx
│   │   │   │   ├── export/        # Export Center
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/      # Settings
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/                   # API Routes
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── documents/
│   │   │   │   ├── route.ts       # GET, POST
│   │   │   │   └── [id]/route.ts  # GET, PUT, DELETE
│   │   │   ├── statements/
│   │   │   │   ├── route.ts
│   │   │   │   └── import/route.ts
│   │   │   ├── reconcile/
│   │   │   │   ├── auto/route.ts
│   │   │   │   └── manual/route.ts
│   │   │   ├── sync/
│   │   │   │   ├── peak/route.ts
│   │   │   │   └── flowaccount/route.ts
│   │   │   ├── export/
│   │   │   │   └── express/route.ts
│   │   │   └── webhooks/
│   │   │       └── line/route.ts
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Landing page
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                    # Shadcn UI
│   │   ├── inbox/
│   │   │   ├── quick-upload.tsx
│   │   │   ├── document-card.tsx
│   │   │   ├── document-list.tsx
│   │   │   └── document-review-modal.tsx
│   │   ├── reconcile/
│   │   │   ├── statement-upload.tsx
│   │   │   ├── match-table.tsx
│   │   │   ├── unmatched-list.tsx
│   │   │   └── manual-matcher.tsx
│   │   ├── sync/
│   │   │   ├── platform-card.tsx
│   │   │   ├── sync-status.tsx
│   │   │   └── sync-log.tsx
│   │   ├── export/
│   │   │   └── express-export.tsx
│   │   └── shared/
│   │       ├── navbar.tsx
│   │       ├── sidebar.tsx
│   │       ├── company-switcher.tsx
│   │       └── loading.tsx
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini.ts          # Gemini client
│   │   │   ├── classifier.ts      # Document classification
│   │   │   └── ocr.ts             # OCR extraction
│   │   ├── integrations/
│   │   │   ├── peak/
│   │   │   │   ├── client.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── expenses.ts
│   │   │   │   ├── receipts.ts
│   │   │   │   └── contacts.ts
│   │   │   ├── flowaccount/
│   │   │   │   ├── client.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── sync.ts
│   │   │   └── express/
│   │   │       ├── exporter.ts
│   │   │       └── zip.ts
│   │   ├── parsers/
│   │   │   ├── index.ts
│   │   │   ├── scb.ts
│   │   │   ├── kbank.ts
│   │   │   └── bbl.ts
│   │   ├── reconcile/
│   │   │   ├── engine.ts
│   │   │   ├── matcher.ts
│   │   │   └── scorer.ts
│   │   ├── storage/
│   │   │   └── supabase.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── use-documents.ts
│   │   ├── use-reconcile.ts
│   │   ├── use-sync.ts
│   │   └── use-company.ts
│   │
│   └── types/
│       └── index.ts
│
├── .env.example
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 6. UI/UX Design Guide

### 🎨 Design System (Based on Bill Tracker)

FlowDoc จะใช้ Design System เดียวกับ Bill Tracker เพื่อความ consistent และประหยัดเวลาพัฒนา

#### Theme Configuration

| Property | Light Mode | Dark Mode |
|----------|------------|-----------|
| **Primary** | Emerald `oklch(0.596 0.145 163.225)` | Emerald Bright `oklch(0.696 0.17 162.48)` |
| **Background** | Near White `oklch(0.985 0 0)` | Deep Dark `oklch(0.12 0 0)` |
| **Card** | Pure White `oklch(1 0 0)` | Dark Gray `oklch(0.16 0 0)` |
| **Border** | Subtle Gray `oklch(0.915 0 0)` | Dark Border `oklch(0.25 0 0)` |
| **Destructive** | Vibrant Red `oklch(0.596 0.18 25)` | Bright Red `oklch(0.696 0.20 25)` |

#### Typography

```css
/* Font Family */
--font-sans: var(--font-noto-sans-thai), system-ui, sans-serif;
--font-mono: ui-monospace, monospace;

/* Border Radius */
--radius: 0.75rem;
--radius-sm: calc(var(--radius) - 4px);  /* 0.5rem */
--radius-md: calc(var(--radius) - 2px);  /* 0.625rem */
--radius-lg: var(--radius);               /* 0.75rem */
--radius-xl: calc(var(--radius) + 4px);  /* 1rem */
```

### 📐 Layout Structure

#### Desktop Layout (lg+)

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────────────┐   │
│ │          │ │  Header (h-16)                           │   │
│ │          │ │  ├── Company Name (mobile)               │   │
│ │  Sidebar │ │  ├── Theme Toggle                        │   │
│ │  (w-60)  │ │  └── User Menu (Avatar + Dropdown)       │   │
│ │          │ ├──────────────────────────────────────────┤   │
│ │  ├─Logo  │ │                                          │   │
│ │  ├─Nav   │ │           Main Content                   │   │
│ │  │ Items │ │           (p-4 sm:p-6 lg:p-8)            │   │
│ │  │       │ │                                          │   │
│ │  └─Back  │ │                                          │   │
│ │   Link   │ │                                          │   │
│ └──────────┘ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Mobile Layout

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │  Header (h-16)                      │ │
│ │  ├── Logo + Company Name            │ │
│ │  └── Theme + User Menu              │ │
│ ├─────────────────────────────────────┤ │
│ │                                     │ │
│ │         Main Content                │ │
│ │         (p-4, pb-20)                │ │
│ │                                     │ │
│ │                                     │ │
│ │                                     │ │
│ ├─────────────────────────────────────┤ │
│ │  Bottom Nav (h-16)                  │ │
│ │  ├── หน้าหลัก                        │ │
│ │  ├── บันทึก                         │ │
│ │  ├── รายจ่าย                         │ │
│ │  ├── รายรับ                          │ │
│ │  └── อื่นๆ (Sheet Menu)             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 🧩 Shadcn UI Components

#### Required Components (from Bill Tracker)

```bash
# Core UI Components (29 total)
npx shadcn@latest add \
  accordion alert alert-dialog avatar badge button \
  calendar card checkbox command dialog dropdown-menu \
  form input label popover progress radio-group \
  scroll-area select separator sheet skeleton \
  sonner switch table tabs textarea tooltip
```

#### Component Configuration

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 🎭 Custom Utility Classes

```css
/* globals.css - Custom utilities */

/* Card Shadow */
.shadow-card {
  box-shadow: 
    0 1px 3px 0 rgb(0 0 0 / 0.04),
    0 1px 2px -1px rgb(0 0 0 / 0.04);
}

.dark .shadow-card {
  box-shadow: 
    0 1px 3px 0 rgb(0 0 0 / 0.2),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
}

/* Hover Lift Effect */
.hover-lift {
  @apply transition-all duration-200 ease-out;
}

.hover-lift:hover {
  @apply -translate-y-0.5;
  box-shadow: 
    0 10px 15px -3px rgb(0 0 0 / 0.05),
    0 4px 6px -4px rgb(0 0 0 / 0.05);
}

/* Glass Effect */
.glass {
  @apply backdrop-blur-md bg-white/80 dark:bg-neutral-900/80;
}

/* Stagger Animation for Lists */
.stagger-children > * {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
.stagger-children > *:nth-child(4) { animation-delay: 150ms; }
/* ... up to 8 children */

/* Animations */
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
.animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }

/* iOS Safe Area */
.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

### 📱 Page Templates

#### Dashboard Page

```tsx
// src/app/(dashboard)/[company]/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          ภาพรวมธุรกิจของคุณ
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <StatsCard 
          title="รายรับเดือนนี้"
          value="฿125,000"
          icon={ArrowDownCircle}
          iconColor="text-primary"
        />
        {/* ... more cards */}
      </div>
      
      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-card">
          {/* Chart or content */}
        </Card>
      </div>
    </div>
  );
}
```

#### Smart Inbox Page

```tsx
// src/app/(dashboard)/[company]/inbox/page.tsx
export default function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Inbox</h1>
          <p className="text-muted-foreground">
            อัปโหลดเอกสาร AI จัดการให้
          </p>
        </div>
      </div>
      
      {/* Quick Upload Zone */}
      <Card className="border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">ลากไฟล์มาวางที่นี่</p>
          <p className="text-sm text-muted-foreground">
            หรือ คลิกเพื่อเลือกไฟล์
          </p>
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            เลือกไฟล์
          </Button>
        </CardContent>
      </Card>
      
      {/* Document List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  );
}
```

### 🖼️ Component Examples

#### Stats Card

```tsx
// src/components/shared/stats-card.tsx
interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: "positive" | "negative" | "neutral";
}

export function StatsCard({ title, value, icon: Icon, iconColor, trend }: StatsCardProps) {
  return (
    <Card className="border-border/50 shadow-card hover-lift">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Document Card

```tsx
// src/components/inbox/document-card.tsx
interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const statusColors = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    EXTRACTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    VERIFIED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    SYNCED: "bg-primary/10 text-primary",
  };

  return (
    <Card 
      className="border-border/50 shadow-card hover-lift cursor-pointer group"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
        <Image
          src={document.fileUrl}
          alt={document.fileName}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        <Badge 
          className={cn(
            "absolute top-2 right-2",
            statusColors[document.docStatus]
          )}
        >
          {document.docStatus}
        </Badge>
      </div>
      
      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">
              {document.vendorName || "ไม่ระบุชื่อ"}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(document.documentDate, "d MMM yyyy", { locale: th })}
            </p>
          </div>
          <p className="font-semibold text-right whitespace-nowrap">
            ฿{document.totalAmount?.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Reconcile Match Row

```tsx
// src/components/reconcile/match-row.tsx
interface MatchRowProps {
  match: Match & { document: Document; transaction: BankTransaction };
  onVerify: () => void;
}

export function MatchRow({ match, onVerify }: MatchRowProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors">
      {/* Document Side */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate">
            {match.document.vendorName}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          ฿{match.document.totalAmount?.toLocaleString()}
        </p>
      </div>
      
      {/* Match Indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          match.confidence >= 90 ? "bg-green-100 dark:bg-green-900/30" :
          match.confidence >= 70 ? "bg-amber-100 dark:bg-amber-900/30" :
          "bg-red-100 dark:bg-red-900/30"
        )}>
          <ArrowLeftRight className={cn(
            "h-5 w-5",
            match.confidence >= 90 ? "text-green-600 dark:text-green-400" :
            match.confidence >= 70 ? "text-amber-600 dark:text-amber-400" :
            "text-red-600 dark:text-red-400"
          )} />
        </div>
        <span className="text-xs text-muted-foreground">
          {match.confidence}%
        </span>
      </div>
      
      {/* Transaction Side */}
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="font-medium truncate">
            {match.transaction.description}
          </span>
          <Building className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          ฿{Math.abs(Number(match.transaction.amount)).toLocaleString()}
        </p>
      </div>
      
      {/* Actions */}
      <Button 
        size="sm" 
        variant={match.isVerified ? "secondary" : "default"}
        onClick={onVerify}
      >
        {match.isVerified ? (
          <Check className="h-4 w-4" />
        ) : (
          "ยืนยัน"
        )}
      </Button>
    </div>
  );
}
```

### 🎨 Color Palette Reference

```
Primary (Emerald)
├── Light: oklch(0.596 0.145 163.225) → #10B981
└── Dark:  oklch(0.696 0.17 162.48)  → #34D399

Success (Green)
├── bg-green-100 / dark:bg-green-900/30
└── text-green-700 / dark:text-green-400

Warning (Amber)
├── bg-amber-100 / dark:bg-amber-900/30
└── text-amber-700 / dark:text-amber-400

Error (Red)
├── bg-red-100 / dark:bg-red-900/30
└── text-red-700 / dark:text-red-400

Info (Blue)
├── bg-blue-100 / dark:bg-blue-900/30
└── text-blue-700 / dark:text-blue-400

Neutral
├── text-foreground      → Main text
├── text-muted-foreground → Secondary text
├── bg-background        → Page background
├── bg-card              → Card background
└── border-border/50     → Subtle borders
```

### 📲 Responsive Breakpoints

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| `sm` | 640px | Small tablets, large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop (sidebar appears) |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large screens |

### 🖼️ Page Wireframes

#### Inbox Page

```
┌─────────────────────────────────────────────────────────────┐
│  Smart Inbox                                    [+ อัปโหลด] │
│  อัปโหลดเอกสาร AI จัดการให้                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │           📁 ลากไฟล์มาวางที่นี่                      │   │
│  │              หรือ คลิกเพื่อเลือก                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [ทั้งหมด] [รอตรวจ] [ตรวจแล้ว] [Sync แล้ว]            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🖼️       │ │ 🖼️       │ │ 🖼️       │ │ 🖼️       │       │
│  │ [PENDING]│ │[EXTRACTED│ │[VERIFIED]│ │ [SYNCED] │       │
│  │──────────│ │──────────│ │──────────│ │──────────│       │
│  │ ร้าน ABC │ │ บ.XYZ    │ │ ร้านDEF  │ │ บ.GHI    │       │
│  │ ฿1,500   │ │ ฿3,200   │ │ ฿850     │ │ ฿12,000  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

#### Reconcile Page

```
┌─────────────────────────────────────────────────────────────┐
│  กระทบยอด                           [Import Statement ↓]    │
│  จับคู่เอกสารกับรายการธนาคาร                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ รอจับคู่       │ │ จับคู่แล้ว     │ │ ไม่มีเอกสาร   │     │
│  │     45        │ │     128       │ │      8        │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [รอจับคู่] [จับคู่แล้ว] [ไม่มีเอกสาร]                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📄 ร้าน ABC        ⟷ 95%    🏦 โอนเงิน-ABC      [✓]│   │
│  │     ฿1,500              ←→         ฿1,500           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📄 บ.XYZ           ⟷ 78%    🏦 โอน-XYZ LTD    [ยืนยัน]│ │
│  │     ฿3,200              ←→         ฿3,200           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Sync Hub Page

```
┌─────────────────────────────────────────────────────────────┐
│  Sync Hub                                                   │
│  เชื่อมต่อกับโปรแกรมบัญชี                                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔷 PEAK Account                         [เชื่อมต่อแล้ว]│  │
│  │     Last sync: 5 นาทีที่แล้ว                          │   │
│  │     Documents synced: 45                             │   │
│  │     [ตั้งค่า] [Sync Now]                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📘 FlowAccount                          [เชื่อมต่อ]   │   │
│  │     ยังไม่ได้เชื่อมต่อ                                  │   │
│  │     [เชื่อมต่อ FlowAccount]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💾 Express                              [Export]     │   │
│  │     Export ไฟล์สำหรับ Import เข้า Express            │   │
│  │     [Export CSV + รูป]                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Database Schema

### 📊 ER Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │───────│CompanyAccess │───────│   Company    │
│              │  1:N  │              │  N:1  │              │
│ - id         │       │ - role       │       │ - id         │
│ - email      │       │              │       │ - name       │
│ - password   │       │              │       │ - code       │
│ - name       │       │              │       │ - lineConfig │
└──────────────┘       └──────────────┘       └──────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────┐
                    │                                │                │
                    ▼                                ▼                ▼
           ┌──────────────┐                 ┌──────────────┐  ┌──────────────┐
           │   Document   │                 │BankStatement │  │  Platform    │
           │              │                 │              │  │  Connection  │
           │ - docType    │                 │ - bankCode   │  │              │
           │ - amount     │                 │ - account    │  │ - platform   │
           │ - vendorName │                 │ - period     │  │ - credentials│
           │ - fileUrl    │                 │              │  │ - lastSync   │
           │ - aiData     │                 │              │  │              │
           └──────┬───────┘                 └──────┬───────┘  └──────────────┘
                  │                                │
                  │                                ▼
                  │                        ┌──────────────┐
                  └───────────────────────►│    Match     │◄──────────────┐
                                           │              │               │
                                           │ - matchType  │               │
                                           │ - confidence │               │
                                           └──────────────┘               │
                                                                          │
                                                                  ┌───────┴──────┐
                                                                  │ Bank         │
                                                                  │ Transaction  │
                                                                  │              │
                                                                  │ - amount     │
                                                                  │ - date       │
                                                                  │ - txType     │
                                                                  └──────────────┘
```

### 📝 Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════
// AUTH & MULTI-TENANCY
// ═══════════════════════════════════════════════════════════════

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String    // bcrypt hashed
  avatarUrl     String?
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  
  // Relations
  companies     CompanyAccess[]
  documents     Document[]      @relation("DocumentUploader")
  statements    BankStatement[] @relation("StatementUploader")
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
}

model Company {
  id          String   @id @default(cuid())
  name        String   // "บริษัท ABC จำกัด"
  code        String   @unique // "ABC"
  taxId       String?  // เลขผู้เสียภาษี 13 หลัก
  address     String?
  phone       String?
  logoUrl     String?
  
  // LINE Bot Configuration
  lineChannelSecret      String?
  lineChannelAccessToken String?
  lineGroupId            String?
  lineNotifyEnabled      Boolean @default(false)
  
  // Relations
  users           CompanyAccess[]
  documents       Document[]
  bankStatements  BankStatement[]
  matches         Match[]
  connections     PlatformConnection[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([code])
}

model CompanyAccess {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  role      Role    @default(MEMBER)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
}

enum Role {
  OWNER    // เจ้าของ - ทำได้ทุกอย่าง
  ADMIN    // แอดมิน - จัดการได้ทุกอย่างยกเว้นลบบริษัท
  MEMBER   // สมาชิก - อัปโหลด, ดู, แก้ไขเอกสาร
  VIEWER   // ผู้ชม - ดูอย่างเดียว
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════

model Document {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // === Classification ===
  docType   DocType
  docStatus DocStatus @default(PENDING)
  
  // === AI Extracted Data ===
  vendorName      String?
  vendorTaxId     String?
  amount          Decimal?  @db.Decimal(14, 2)  // ยอดก่อน VAT
  vatRate         Int?      // 0 หรือ 7
  vatAmount       Decimal?  @db.Decimal(14, 2)
  totalAmount     Decimal?  @db.Decimal(14, 2)  // ยอดรวม VAT
  documentDate    DateTime?
  invoiceNumber   String?
  description     String?
  paymentMethod   PaymentMethod?
  
  // Raw AI response
  extractedData   Json?     // Full AI response for debugging
  aiConfidence    Int?      // 0-100
  
  // === File Storage ===
  fileUrl         String
  fileName        String
  fileSize        Int?      // bytes
  mimeType        String?
  
  // === Source Tracking ===
  source          UploadSource @default(WEB)
  
  // === Reconciliation ===
  matchId         String?
  match           Match?    @relation(fields: [matchId], references: [id])
  isReconciled    Boolean   @default(false)
  
  // === Platform Sync Status ===
  peakSyncId          String?    // Document ID in PEAK
  peakSyncedAt        DateTime?
  peakSyncError       String?
  
  flowaccountSyncId   String?    // Document ID in FlowAccount
  flowaccountSyncedAt DateTime?
  flowaccountSyncError String?
  
  expressSyncedAt     DateTime?  // Last export date
  
  // === Tracking ===
  uploadedBy String
  uploader   User     @relation("DocumentUploader", fields: [uploadedBy], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Soft delete
  deletedAt DateTime?
  
  @@index([companyId, docType])
  @@index([companyId, docStatus])
  @@index([companyId, isReconciled])
  @@index([documentDate])
  @@index([matchId])
  @@index([deletedAt])
}

enum DocType {
  EXPENSE         // ใบเสร็จซื้อของ (รายจ่าย)
  INCOME          // สลิปรับเงิน (รายรับ)
  TAX_INVOICE     // ใบกำกับภาษี
  BANK_SLIP       // สลิปโอนเงิน
  WHT_CERT        // ใบ 50 ทวิ
  OTHER           // อื่นๆ
}

enum DocStatus {
  PENDING         // รอ AI วิเคราะห์
  PROCESSING      // กำลังประมวลผล
  EXTRACTED       // AI อ่านแล้ว
  VERIFIED        // ตรวจสอบแล้ว ข้อมูลถูกต้อง
  NEED_REVIEW     // ต้องตรวจสอบ (confidence ต่ำ)
  SYNCED          // Sync เข้าโปรแกรมบัญชีแล้ว
  ERROR           // เกิดข้อผิดพลาด
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CREDIT_CARD
  PROMPTPAY
  CHEQUE
}

enum UploadSource {
  WEB       // อัปโหลดผ่านเว็บ
  LINE      // ส่งผ่าน LINE OA
  API       // ผ่าน API
  IMPORT    // Import จากไฟล์
}

// ═══════════════════════════════════════════════════════════════
// BANK STATEMENTS & TRANSACTIONS
// ═══════════════════════════════════════════════════════════════

model BankStatement {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // === Bank Info ===
  bankCode      BankCode
  accountNumber String
  accountName   String?
  
  // === Period ===
  statementDate DateTime   // วันที่ของ Statement
  periodStart   DateTime?  // เริ่มต้น
  periodEnd     DateTime?  // สิ้นสุด
  
  // === Balances ===
  openingBalance Decimal? @db.Decimal(14, 2)
  closingBalance Decimal? @db.Decimal(14, 2)
  
  // === File ===
  fileUrl  String?
  fileName String?
  
  // === Transactions ===
  transactions BankTransaction[]
  
  // === Import Status ===
  importStatus  ImportStatus @default(PENDING)
  importError   String?
  totalRows     Int?
  importedRows  Int?
  
  // === Tracking ===
  uploadedBy String
  uploader   User     @relation("StatementUploader", fields: [uploadedBy], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([companyId, statementDate])
  @@index([bankCode])
}

enum BankCode {
  SCB     // ไทยพาณิชย์
  KBANK   // กสิกร
  BBL     // กรุงเทพ
  KTB     // กรุงไทย
  BAY     // กรุงศรี
  TMB     // ทหารไทยธนชาต (ttb)
  CIMB    // ซีไอเอ็มบี
  UOB     // ยูโอบี
  OTHER   // อื่นๆ
}

enum ImportStatus {
  PENDING     // รอประมวลผล
  PROCESSING  // กำลังประมวลผล
  COMPLETED   // เสร็จสมบูรณ์
  PARTIAL     // เสร็จบางส่วน
  FAILED      // ล้มเหลว
}

model BankTransaction {
  id          String        @id @default(cuid())
  statementId String
  statement   BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  
  // === Transaction Data ===
  transactionDate DateTime
  description     String?
  amount          Decimal   @db.Decimal(14, 2)
  txType          TxType
  balance         Decimal?  @db.Decimal(14, 2)  // ยอดคงเหลือหลังรายการ
  reference       String?   // เลขอ้างอิง
  channel         String?   // ช่องทาง (ATM, Mobile, etc.)
  
  // === Reconciliation ===
  matchId      String?
  match        Match?   @relation(fields: [matchId], references: [id])
  isReconciled Boolean  @default(false)
  
  // === Metadata ===
  rawData Json?  // Original row data
  
  createdAt DateTime @default(now())
  
  @@index([statementId, transactionDate])
  @@index([matchId])
  @@index([isReconciled])
  @@index([amount])
}

enum TxType {
  CREDIT  // เงินเข้า
  DEBIT   // เงินออก
}

// ═══════════════════════════════════════════════════════════════
// RECONCILIATION / MATCHING
// ═══════════════════════════════════════════════════════════════

model Match {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  matchType   MatchType @default(AUTO)
  confidence  Int?      // 0-100 (for AUTO matches)
  
  // === Relations ===
  documents        Document[]
  bankTransactions BankTransaction[]
  
  // === Match Details ===
  matchedAmount Decimal? @db.Decimal(14, 2)
  dateDiff      Int?     // วันห่างกันกี่วัน
  
  // === Verification ===
  isVerified  Boolean   @default(false)
  verifiedAt  DateTime?
  verifiedBy  String?
  notes       String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([companyId, matchType])
  @@index([isVerified])
}

enum MatchType {
  AUTO      // ระบบจับคู่ (Confidence >= 90%)
  SUGGESTED // แนะนำ (Confidence 70-89%)
  MANUAL    // คนจับคู่เอง
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM CONNECTIONS & SYNC
// ═══════════════════════════════════════════════════════════════

model PlatformConnection {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  platform  Platform
  isActive  Boolean  @default(true)
  
  // === Credentials (Encrypted) ===
  credentials Json  // { accessToken, refreshToken, expiresAt, clientId, etc. }
  
  // === Settings ===
  settings Json @default("{}")  // { autoSync, syncInterval, defaultAccountCode, etc. }
  
  // === Sync Status ===
  lastSyncAt     DateTime?
  lastSyncStatus SyncStatus?
  lastSyncError  String?
  
  // === Logs ===
  syncLogs SyncLog[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([companyId, platform])
  @@index([platform, isActive])
}

enum Platform {
  PEAK
  FLOWACCOUNT
  EXPRESS
}

enum SyncStatus {
  SUCCESS
  PARTIAL
  FAILED
}

model SyncLog {
  id           String             @id @default(cuid())
  connectionId String
  connection   PlatformConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  
  // === Action ===
  action     SyncAction
  status     SyncStatus
  
  // === What was synced ===
  entityType String   // Document, BankTransaction
  entityId   String
  
  // === Result ===
  platformId String?  // ID from platform
  response   Json?    // Full response
  error      String?
  
  // === Performance ===
  durationMs Int?     // How long it took
  
  createdAt DateTime @default(now())
  
  @@index([connectionId, createdAt])
  @@index([entityType, entityId])
  @@index([status])
}

enum SyncAction {
  PUSH_EXPENSE
  PUSH_RECEIPT
  PUSH_INVOICE
  PUSH_CONTACT
  PUSH_FILE
  PULL_ACCOUNTS
  PULL_CONTACTS
}
```

---

## 8. API Integrations

### 🏆 PEAK Account API

**Documentation:** [developers.peakaccount.com](https://developers.peakaccount.com/reference/peak-open-api)

#### Authentication Flow

```typescript
// lib/integrations/peak/auth.ts

interface PeakCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  expiresAt?: Date;
}

async function getAccessToken(credentials: PeakCredentials): Promise<string> {
  // 1. Check if token is still valid
  if (credentials.accessToken && credentials.expiresAt > new Date()) {
    return credentials.accessToken;
  }
  
  // 2. Get new token
  const response = await fetch('https://api.peakaccount.com/ClientToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret
    })
  });
  
  const data = await response.json();
  return data.accessToken;
}
```

#### API Endpoints Used

| Endpoint | Method | Use Case |
|----------|--------|----------|
| `/ClientToken` | POST | Get access token |
| `/Contacts` | POST | Create vendor/customer |
| `/Contacts` | GET | Get contact by ID |
| `/Contacts/List` | GET | List all contacts |
| `/Expenses` | POST | Create expense |
| `/Expenses/{id}` | GET | Get expense |
| `/Expenses/InsertFile` | POST | Attach image |
| `/Receipts` | POST | Create receipt |
| `/Receipts/{id}` | GET | Get receipt |
| `/Receipts/InsertFile` | POST | Attach image |
| `/Webhook` | - | Receive updates |

#### Sample: Push Expense

```typescript
// lib/integrations/peak/expenses.ts

interface PeakExpenseData {
  contactId: string;
  documentDate: string;  // "YYYY-MM-DD"
  dueDate?: string;
  items: Array<{
    name: string;
    quantity: number;
    pricePerUnit: number;
    vatType: 'VAT7' | 'VAT0' | 'NOVAT';
  }>;
  paymentMethod?: 'Cash' | 'BankTransfer' | 'CreditCard';
  note?: string;
}

async function createExpense(
  connection: PlatformConnection,
  data: PeakExpenseData
): Promise<{ id: string; documentNumber: string }> {
  const token = await getAccessToken(connection.credentials);
  
  const response = await fetch('https://api.peakaccount.com/Expenses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`PEAK API Error: ${response.statusText}`);
  }
  
  return response.json();
}

async function attachFile(
  connection: PlatformConnection,
  expenseId: string,
  fileUrl: string
): Promise<void> {
  const token = await getAccessToken(connection.credentials);
  
  // Download file
  const fileResponse = await fetch(fileUrl);
  const fileBuffer = await fileResponse.arrayBuffer();
  
  // Upload to PEAK
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), 'document.jpg');
  
  await fetch(`https://api.peakaccount.com/Expenses/${expenseId}/InsertFile`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
}
```

---

### 📘 FlowAccount API

**Documentation:** [developers.flowaccount.com](https://developers.flowaccount.com/tutorial/)

#### OAuth Flow

```typescript
// lib/integrations/flowaccount/auth.ts

const FLOWACCOUNT_AUTH_URL = 'https://openapi.flowaccount.com/oauth';
const FLOWACCOUNT_API_URL = 'https://openapi.flowaccount.com/v1';

interface FlowAccountCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

function getAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.FLOWACCOUNT_CLIENT_ID!,
    redirect_uri: redirectUri,
    state: state
  });
  
  return `${FLOWACCOUNT_AUTH_URL}/authorize?${params}`;
}

async function exchangeCode(code: string, redirectUri: string): Promise<FlowAccountCredentials> {
  const response = await fetch(`${FLOWACCOUNT_AUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.FLOWACCOUNT_CLIENT_ID!,
      client_secret: process.env.FLOWACCOUNT_CLIENT_SECRET!
    })
  });
  
  const data = await response.json();
  
  return {
    clientId: process.env.FLOWACCOUNT_CLIENT_ID!,
    clientSecret: process.env.FLOWACCOUNT_CLIENT_SECRET!,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000)
  };
}
```

---

### 💾 Express Export

```typescript
// lib/integrations/express/exporter.ts

interface ExpressExportData {
  documents: Document[];
  period: { start: Date; end: Date };
  companyName: string;
}

async function exportForExpress(data: ExpressExportData): Promise<Blob> {
  const zip = new JSZip();
  
  // 1. Create transactions CSV
  const csv = generateCSV(data.documents);
  zip.file('transactions.csv', csv);
  
  // 2. Create folders for images
  const expenseFolder = zip.folder('expenses');
  const incomeFolder = zip.folder('incomes');
  
  // 3. Download and add images
  for (const doc of data.documents) {
    const imageBuffer = await downloadFile(doc.fileUrl);
    const folder = doc.docType === 'EXPENSE' ? expenseFolder : incomeFolder;
    folder?.file(`${doc.invoiceNumber || doc.id}.jpg`, imageBuffer);
  }
  
  // 4. Generate ZIP
  return zip.generateAsync({ type: 'blob' });
}

function generateCSV(documents: Document[]): string {
  const headers = [
    'วันที่',
    'เลขที่เอกสาร',
    'ผู้ติดต่อ',
    'รายละเอียด',
    'ยอดก่อน VAT',
    'VAT',
    'ยอดรวม',
    'ประเภท'
  ];
  
  const rows = documents.map(doc => [
    format(doc.documentDate!, 'dd/MM/yyyy'),
    doc.invoiceNumber || '-',
    doc.vendorName || '-',
    doc.description || '-',
    doc.amount?.toString() || '0',
    doc.vatAmount?.toString() || '0',
    doc.totalAmount?.toString() || '0',
    doc.docType
  ]);
  
  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
}
```

---

## 9. Development Sprints

### 📅 Overview

| Sprint | Week | Focus | Hours |
|--------|------|-------|-------|
| **Sprint 1** | 1-2 | Foundation + Smart Inbox | 48h |
| **Sprint 2** | 3-4 | Bank Statement + Reconcile | 56h |
| **Sprint 3** | 5-6 | PEAK Integration | 48h |
| **Sprint 4** | 7-8 | FlowAccount + Express + Polish | 48h |
| **Total** | 8 weeks | | **200h** |

---

### 📅 Sprint 1: Foundation + Smart Inbox

**Week 1-2 | 48 hours**

#### Goals
- [x] Project setup
- [x] Auth system
- [x] Multi-tenancy
- [x] Smart Inbox (Upload + AI)

#### Tasks

| ID | Task | Hours | Priority | Status |
|----|------|-------|----------|--------|
| 1.1 | Create Next.js project with TypeScript | 2h | P0 | ⬜ |
| 1.2 | Setup Prisma + Database schema | 4h | P0 | ⬜ |
| 1.3 | Configure Supabase (DB + Storage) | 2h | P0 | ⬜ |
| 1.4 | Setup NextAuth.js (login, register) | 6h | P0 | ⬜ |
| 1.5 | Implement multi-tenancy (Company, Access) | 4h | P0 | ⬜ |
| 1.6 | Setup Shadcn UI + base components | 3h | P0 | ⬜ |
| 1.7 | Create layout (navbar, sidebar) | 3h | P0 | ⬜ |
| 1.8 | Landing page | 3h | P1 | ⬜ |
| 1.9 | Quick Upload UI (drag & drop) | 5h | P0 | ⬜ |
| 1.10 | Document Upload API | 3h | P0 | ⬜ |
| 1.11 | AI Document Classifier (Gemini) | 4h | P0 | ⬜ |
| 1.12 | AI OCR Extraction (Gemini) | 4h | P0 | ⬜ |
| 1.13 | Document List UI | 3h | P0 | ⬜ |
| 1.14 | Document Review Modal | 2h | P0 | ⬜ |

#### Deliverables
- [ ] User can register/login
- [ ] User can create company
- [ ] User can upload documents
- [ ] AI classifies documents
- [ ] AI extracts data from documents
- [ ] User can review/edit extracted data

#### Tech Notes

**AI Classification Prompt:**
```
คุณเป็นผู้เชี่ยวชาญในการจำแนกประเภทเอกสารทางการเงิน
ดูภาพนี้และบอกว่าเป็นเอกสารประเภทใด:

- EXPENSE: ใบเสร็จรับเงิน, ใบกำกับภาษีซื้อ (รายจ่าย)
- INCOME: สลิปโอนเงินที่รับ, ใบเสร็จที่ออกให้ลูกค้า (รายรับ)
- TAX_INVOICE: ใบกำกับภาษีเต็มรูปแบบ
- BANK_SLIP: สลิปโอนเงิน/หลักฐานการโอน
- WHT_CERT: ใบ 50 ทวิ (หนังสือรับรองหัก ณ ที่จ่าย)
- OTHER: ไม่ใช่เอกสารทางการเงิน

ตอบเป็น JSON: { "type": "EXPENSE", "confidence": 95 }
```

---

### 📅 Sprint 2: Bank Statement + Reconcile

**Week 3-4 | 56 hours**

#### Goals
- [ ] Import bank statements
- [ ] Parse multiple bank formats
- [ ] Auto-reconcile algorithm
- [ ] Reconcile dashboard

#### Tasks

| ID | Task | Hours | Priority | Status |
|----|------|-------|----------|--------|
| 2.1 | Research bank statement formats | 4h | P0 | ⬜ |
| 2.2 | Statement Parser - Generic (CSV) | 4h | P0 | ⬜ |
| 2.3 | Statement Parser - SCB | 4h | P0 | ⬜ |
| 2.4 | Statement Parser - KBANK | 4h | P0 | ⬜ |
| 2.5 | Statement Parser - BBL | 4h | P1 | ⬜ |
| 2.6 | Statement Import API | 4h | P0 | ⬜ |
| 2.7 | Statement Import UI | 5h | P0 | ⬜ |
| 2.8 | Reconcile Engine - Matcher | 8h | P0 | ⬜ |
| 2.9 | Reconcile Engine - Scorer | 4h | P0 | ⬜ |
| 2.10 | Auto-Reconcile API | 3h | P0 | ⬜ |
| 2.11 | Reconcile Dashboard | 6h | P0 | ⬜ |
| 2.12 | Match Table UI | 3h | P0 | ⬜ |
| 2.13 | Unmatched List UI | 2h | P0 | ⬜ |
| 2.14 | Manual Match UI | 3h | P1 | ⬜ |

#### Deliverables
- [ ] Import statements from SCB, KBANK, BBL
- [ ] View imported transactions
- [ ] Auto-match documents with transactions
- [ ] View matched/unmatched items
- [ ] Manual match capability

#### Matching Algorithm

```typescript
// lib/reconcile/matcher.ts

interface MatchResult {
  documentId: string;
  transactionId: string;
  confidence: number;
  reasons: string[];
}

function findMatches(
  documents: Document[],
  transactions: BankTransaction[]
): MatchResult[] {
  const results: MatchResult[] = [];
  
  for (const doc of documents) {
    if (doc.isReconciled) continue;
    
    for (const tx of transactions) {
      if (tx.isReconciled) continue;
      
      const score = calculateMatchScore(doc, tx);
      
      if (score.confidence >= 50) {
        results.push({
          documentId: doc.id,
          transactionId: tx.id,
          confidence: score.confidence,
          reasons: score.reasons
        });
      }
    }
  }
  
  // Sort by confidence, highest first
  return results.sort((a, b) => b.confidence - a.confidence);
}

function calculateMatchScore(
  doc: Document,
  tx: BankTransaction
): { confidence: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Amount match (50% weight)
  const amountDiff = Math.abs(
    Number(doc.totalAmount) - Math.abs(Number(tx.amount))
  );
  if (amountDiff <= 0.5) {
    score += 50;
    reasons.push('ยอดเงินตรงกัน');
  } else if (amountDiff <= 10) {
    score += 30;
    reasons.push('ยอดเงินใกล้เคียง');
  }
  
  // 2. Date match (30% weight)
  const dateDiff = differenceInDays(
    doc.documentDate!,
    tx.transactionDate
  );
  if (Math.abs(dateDiff) <= 1) {
    score += 30;
    reasons.push('วันที่ตรงกัน');
  } else if (Math.abs(dateDiff) <= 3) {
    score += 20;
    reasons.push('วันที่ใกล้เคียง');
  } else if (Math.abs(dateDiff) <= 7) {
    score += 10;
    reasons.push('วันที่ห่างไม่เกิน 7 วัน');
  }
  
  // 3. Reference match (20% weight)
  if (doc.invoiceNumber && tx.reference) {
    if (tx.reference.includes(doc.invoiceNumber)) {
      score += 20;
      reasons.push('เลขอ้างอิงตรงกัน');
    }
  }
  
  return { confidence: Math.min(score, 100), reasons };
}
```

---

### 📅 Sprint 3: PEAK Integration

**Week 5-6 | 48 hours**

#### Goals
- [ ] Connect PEAK Account
- [ ] Sync expenses/receipts
- [ ] Attach document images
- [ ] Handle webhooks

#### Tasks

| ID | Task | Hours | Priority | Status |
|----|------|-------|----------|--------|
| 3.1 | Contact PEAK, request UAT access | 2h | P0 | ⬜ |
| 3.2 | PEAK API Client setup | 4h | P0 | ⬜ |
| 3.3 | PEAK Authentication (ClientToken) | 4h | P0 | ⬜ |
| 3.4 | PEAK Contacts sync | 4h | P0 | ⬜ |
| 3.5 | PEAK Expenses create | 5h | P0 | ⬜ |
| 3.6 | PEAK Receipts create | 5h | P0 | ⬜ |
| 3.7 | PEAK Insert File (attach images) | 4h | P0 | ⬜ |
| 3.8 | PEAK Webhook receiver | 4h | P1 | ⬜ |
| 3.9 | Platform Connection UI | 4h | P0 | ⬜ |
| 3.10 | Sync Settings UI | 4h | P0 | ⬜ |
| 3.11 | Sync Status Dashboard | 4h | P0 | ⬜ |
| 3.12 | Error handling & retry | 4h | P0 | ⬜ |

#### Deliverables
- [ ] User can connect PEAK account
- [ ] Documents sync to PEAK as Expenses/Receipts
- [ ] Document images attached to PEAK records
- [ ] View sync status and errors
- [ ] Retry failed syncs

---

### 📅 Sprint 4: FlowAccount + Express + Polish

**Week 7-8 | 48 hours**

#### Goals
- [ ] Connect FlowAccount
- [ ] Express export
- [ ] LINE integration
- [ ] Polish & testing

#### Tasks

| ID | Task | Hours | Priority | Status |
|----|------|-------|----------|--------|
| 4.1 | FlowAccount OAuth flow | 4h | P1 | ⬜ |
| 4.2 | FlowAccount API Client | 4h | P1 | ⬜ |
| 4.3 | FlowAccount Expenses sync | 4h | P1 | ⬜ |
| 4.4 | FlowAccount Documents sync | 4h | P1 | ⬜ |
| 4.5 | Express CSV generator | 4h | P2 | ⬜ |
| 4.6 | Express ZIP (images) | 3h | P2 | ⬜ |
| 4.7 | Export Hub UI | 4h | P1 | ⬜ |
| 4.8 | LINE Webhook (receive images) | 4h | P1 | ⬜ |
| 4.9 | Missing Document Alert | 3h | P1 | ⬜ |
| 4.10 | Mobile Responsive | 4h | P1 | ⬜ |
| 4.11 | End-to-end Testing | 4h | P0 | ⬜ |
| 4.12 | Bug fixes | 4h | P0 | ⬜ |
| 4.13 | Documentation | 2h | P2 | ⬜ |

#### Deliverables
- [ ] FlowAccount integration working
- [ ] Express export with images
- [ ] LINE image upload working
- [ ] Missing document alerts
- [ ] Mobile-friendly UI
- [ ] Production-ready app

---

## 10. Business Model

### 💳 Pricing Strategy

เราเลือก **Per-Seat Pricing สำหรับสำนักงานบัญชี** เพราะ:
1. ตรงกับ Target Market หลัก
2. Revenue scales กับขนาดลูกค้า
3. เข้าใจง่าย ไม่ซับซ้อน
4. สามารถ Upsell ได้

### 📊 Pricing Plans

| Plan | Users | Clients | Platforms | Documents/mo | Price/mo |
|------|-------|---------|-----------|--------------|----------|
| **Free Trial** | 1 | 1 | 1 | 50 | ฿0 (14 วัน) |
| **Solo** | 1 | 5 | 1 | 200 | **฿799** |
| **Team** | 5 | 20 | 2 | 1,000 | **฿2,499** |
| **Agency** | 15 | 50 | All | 3,000 | **฿5,999** |
| **Enterprise** | ∞ | ∞ | All + API | ∞ | **฿14,999** |

### 💡 Features by Plan

| Feature | Solo | Team | Agency | Enterprise |
|---------|------|------|--------|------------|
| Smart Inbox | ✅ | ✅ | ✅ | ✅ |
| AI OCR | ✅ | ✅ | ✅ | ✅ |
| Bank Reconcile | ✅ | ✅ | ✅ | ✅ |
| PEAK Sync | ✅ | ✅ | ✅ | ✅ |
| FlowAccount Sync | ❌ | ✅ | ✅ | ✅ |
| Express Export | ❌ | ✅ | ✅ | ✅ |
| LINE Connect | ❌ | ✅ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |
| Dedicated Account | ❌ | ❌ | ❌ | ✅ |

### 🎯 Target Customer Mix

| Plan | % of Customers | Avg Revenue |
|------|----------------|-------------|
| Solo | 60% | ฿799 |
| Team | 25% | ฿2,499 |
| Agency | 12% | ฿5,999 |
| Enterprise | 3% | ฿14,999 |
| **Blended ARPU** | 100% | **~฿1,700** |

---

## 11. Financial Projections

### 📈 Year 1 Customer Growth

**Assumptions:**
- Launch: Month 3 (after development)
- Initial customers from network: 10-15
- Monthly growth: 20% (M3-M6), 10% (M7-M12)
- Churn rate: 5%/month

| Month | New | Churned | Total | Solo | Team | Agency |
|-------|-----|---------|-------|------|------|--------|
| M3 | 12 | 0 | 12 | 8 | 3 | 1 |
| M4 | 10 | 1 | 21 | 13 | 6 | 2 |
| M5 | 12 | 1 | 32 | 20 | 9 | 3 |
| M6 | 14 | 2 | 44 | 27 | 13 | 4 |
| M7 | 10 | 2 | 52 | 32 | 15 | 5 |
| M8 | 11 | 3 | 60 | 37 | 17 | 6 |
| M9 | 10 | 3 | 67 | 41 | 19 | 7 |
| M10 | 11 | 3 | 75 | 46 | 21 | 8 |
| M11 | 10 | 4 | 81 | 50 | 23 | 8 |
| M12 | 12 | 4 | 89 | 55 | 25 | 9 |

### 💰 Monthly Recurring Revenue (MRR)

| Month | Solo MRR | Team MRR | Agency MRR | **Total MRR** |
|-------|----------|----------|------------|---------------|
| M3 | ฿6,392 | ฿7,497 | ฿5,999 | **฿19,888** |
| M4 | ฿10,387 | ฿14,994 | ฿11,998 | **฿37,379** |
| M5 | ฿15,980 | ฿22,491 | ฿17,997 | **฿56,468** |
| M6 | ฿21,573 | ฿32,487 | ฿23,996 | **฿78,056** |
| M7 | ฿25,568 | ฿37,485 | ฿29,995 | **฿93,048** |
| M8 | ฿29,563 | ฿42,483 | ฿35,994 | **฿108,040** |
| M9 | ฿32,759 | ฿47,481 | ฿41,993 | **฿122,233** |
| M10 | ฿36,754 | ฿52,479 | ฿47,992 | **฿137,225** |
| M11 | ฿39,950 | ฿57,477 | ฿47,992 | **฿145,419** |
| M12 | ฿43,945 | ฿62,475 | ฿53,991 | **฿160,411** |

### 📊 MRR Growth Chart

```
MRR (฿)
175K ┤                                         ╭────
     │                                    ╭────╯
150K ┤                               ╭────╯
     │                          ╭────╯
125K ┤                     ╭────╯
     │                ╭────╯
100K ┤           ╭────╯
     │      ╭────╯
 75K ┤ ╭────╯
     │ │
 50K ┼─╯
     │
 25K ┤
     │
   0 ┼────────────────────────────────────────────
     M1  M2  M3  M4  M5  M6  M7  M8  M9  M10 M11 M12
     └─Dev─┘  └─────────── Live ─────────────────┘
```

### 💵 Annual Summary (Year 1)

| Metric | Value |
|--------|-------|
| **Ending Customers** | 89 |
| **Ending MRR** | ฿160,411 |
| **ARR (Ending)** | ฿1,924,932 |
| **Total Revenue Y1** | **฿958,167** |

### 💸 Cost Structure (Year 1)

| Category | Monthly | Annual | Notes |
|----------|---------|--------|-------|
| **Infrastructure** | | | |
| Vercel Pro | ฿700 | ฿8,400 | Hosting |
| Supabase Pro | ฿850 | ฿10,200 | DB + Storage |
| Gemini API | ฿3,500 | ฿42,000 | ~฿0.50/doc |
| Domain + SSL | ฿50 | ฿600 | |
| **Subtotal** | ฿5,100 | ฿61,200 | |
| **Marketing** | | | |
| Google Ads | ฿8,000 | ฿96,000 | |
| Facebook Ads | ฿5,000 | ฿60,000 | |
| Content/SEO | ฿3,000 | ฿36,000 | |
| **Subtotal** | ฿16,000 | ฿192,000 | |
| **Operations** | | | |
| Customer Support (part-time) | ฿12,000 | ฿144,000 | |
| Tools (Slack, Notion, etc.) | ฿1,500 | ฿18,000 | |
| Misc | ฿3,000 | ฿36,000 | |
| **Subtotal** | ฿16,500 | ฿198,000 | |
| **Total Monthly** | **฿37,600** | | |
| **Total Annual** | | **฿451,200** | |

### 📈 Profitability Analysis

| Metric | Year 1 |
|--------|--------|
| Total Revenue | ฿958,167 |
| Total Costs | ฿451,200 |
| **Gross Profit** | **฿506,967** |
| **Gross Margin** | **52.9%** |
| **Break-even Month** | M6-M7 |

### 🚀 3-Year Projection

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Customers | 89 | 280 | 600 |
| MRR (End) | ฿160K | ฿500K | ฿1.2M |
| ARR | ฿1.9M | ฿6M | ฿14.4M |
| Revenue | ฿958K | ฿4M | ฿10M |
| Gross Margin | 53% | 60% | 68% |

---

## 12. Go-to-Market Strategy

### 🎯 Phase 1: Launch (Month 3-6)

**Target:** สำนักงานบัญชีขนาดเล็ก-กลาง (2-10 คน)

**Channels:**
| Channel | Budget/mo | Expected Leads | CAC |
|---------|-----------|----------------|-----|
| Facebook Groups (นักบัญชี) | ฿0 | 10 | ฿0 |
| LinkedIn (targeted) | ฿3,000 | 8 | ฿375 |
| Referral (existing network) | ฿0 | 5 | ฿0 |
| Content Marketing | ฿2,000 | 5 | ฿400 |

**Tactics:**
1. **Free Trial Campaign** - 14 วันทดลองใช้ฟรี
2. **Demo Webinars** - สาธิตทุกสัปดาห์
3. **Case Study** - จากลูกค้า early adopter
4. **Referral Program** - ฿500 credit ต่อ referral

**Messaging:**
> "เลิกเสียเวลาทวงบิล ให้ FlowDoc จัดการให้"
> "ลดงานคีย์ข้อมูล Sync ตรงเข้า PEAK ใน 1 คลิก"

### 🎯 Phase 2: Scale (Month 7-12)

**Target:** SME ที่มีบิลเยอะ + สำนักงานบัญชีขนาดกลาง

**Channels:**
| Channel | Budget/mo | Expected Leads | CAC |
|---------|-----------|----------------|-----|
| Google Ads | ฿8,000 | 20 | ฿400 |
| Facebook Ads | ฿5,000 | 15 | ฿333 |
| Partner Program | ฿0 | 10 | ฿0 |
| Content/SEO | ฿3,000 | 10 | ฿300 |

**Tactics:**
1. **Partnership กับ PEAK/FlowAccount** - Co-marketing
2. **Accounting Firm Program** - ส่วนลดพิเศษสำหรับสำนักงานบัญชี
3. **Integration Marketplace** - อยู่ใน PEAK App Store
4. **Video Tutorials** - YouTube channel

### 🎯 Phase 3: Expand (Year 2+)

**Target:** Enterprise, Franchise, Multi-branch

**Strategies:**
1. **White-label** - สำนักงานบัญชีใหญ่ใช้ภายใต้แบรนด์ตัวเอง
2. **API Licensing** - สำหรับ Software Partners
3. **Vertical Solutions** - ปรับให้เฉพาะอุตสาหกรรม (ร้านอาหาร, Retail)
4. **Regional Expansion** - รองรับภาษาอื่น (EN, Myanmar, Cambodia)

---

## 13. Risk Assessment

### 🔴 High Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **PEAK API access denied** | ❌ Cannot launch primary feature | Low (20%) | Apply early, maintain FlowAccount as backup |
| **AI OCR < 80% accuracy** | 😤 Poor UX, manual work | Medium (40%) | Human review flow, improve prompts, feedback loop |
| **Low adoption rate** | 💸 Revenue miss | Medium (30%) | Strong onboarding, free trial, product-market fit testing |
| **Founder burnout** | ⏸️ Project stops | Medium (35%) | Realistic timeline, automation, outsource non-core |

### 🟡 Medium Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Bank statement format changes** | 🔧 Parser breaks | Medium (40%) | Generic parser fallback, monitor actively |
| **PEAK/FlowAccount API changes** | 🔧 Integration breaks | Low (20%) | Version monitoring, test regularly |
| **Competitor launches** | 📉 Market share loss | Medium (40%) | Fast iteration, focus on UX |
| **Customer churn > 8%** | 📉 Growth slows | Medium (30%) | Improve onboarding, customer success |

### 🟢 Low Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Supabase downtime** | ⏸️ Service disruption | Very Low (5%) | Monitoring, backup plan |
| **Data breach** | 😱 Trust loss | Very Low (5%) | Encryption, security audit |
| **Gemini API pricing increase** | 💸 Margin squeeze | Low (15%) | Monitor, alternative AI options |

### 📋 Contingency Plans

1. **If PEAK denies access:**
   - Focus on FlowAccount first
   - Add more bank statement features
   - Offer Express export as primary

2. **If AI accuracy is low:**
   - Add mandatory review step
   - Improve training with user feedback
   - Consider hybrid (AI + human) approach

3. **If customer acquisition is slow:**
   - Extend free trial
   - Lower pricing temporarily
   - Focus on referral program

---

## 14. Success Metrics

### 📊 Key Performance Indicators (KPIs)

| Metric | M3 | M6 | M12 | How to Measure |
|--------|-----|-----|------|----------------|
| **MRR** | ฿20K | ฿80K | ฿160K | Stripe/Payment |
| **Customers** | 12 | 44 | 89 | Database |
| **Churn Rate** | < 10% | < 7% | < 5% | Monthly calculation |
| **NPS Score** | > 20 | > 35 | > 50 | Survey |
| **Doc Accuracy** | > 80% | > 88% | > 92% | AI validation |
| **Sync Success** | > 90% | > 95% | > 99% | Error logs |
| **Time to Value** | < 10 min | < 7 min | < 5 min | First sync |

### 🎯 Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| **MVP Launch** | Week 8 | First paying customer |
| **Product-Market Fit** | Month 4 | 40% would be "very disappointed" if no FlowDoc |
| **Ramen Profitable** | Month 7 | MRR covers costs |
| **100 Customers** | Month 14 | Sustainable growth |

### 📈 Weekly Dashboard

```
┌────────────────────────────────────────────────────────────┐
│                    FlowDoc Dashboard                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  MRR: ฿45,234        Customers: 28       Churn: 4.2%      │
│  ═══════════════     ═══════════════     ═══════════════  │
│                                                            │
│  This Week:                                                │
│  ├── New Signups: 8                                       │
│  ├── Trials Started: 12                                   │
│  ├── Converted: 4 (33%)                                   │
│  └── Documents Processed: 1,247                           │
│                                                            │
│  AI Performance:                                           │
│  ├── Classification Accuracy: 94%                         │
│  ├── OCR Accuracy: 87%                                    │
│  └── Auto-Match Rate: 78%                                 │
│                                                            │
│  Platform Sync:                                            │
│  ├── PEAK: 342 synced, 2 failed                           │
│  └── FlowAccount: 156 synced, 0 failed                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Getting Started

### 🚀 Quick Start Commands

```bash
# 1. Create Next.js project
npx create-next-app@latest flowdoc \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# 2. Navigate to project
cd flowdoc

# 3. Install core dependencies
npm install @prisma/client @supabase/supabase-js next-auth@beta \
  @google/generative-ai zod date-fns xlsx jszip bcryptjs

# 4. Install dev dependencies
npm install -D prisma @types/bcryptjs

# 5. Initialize Prisma
npx prisma init

# 6. Install Shadcn UI
npx shadcn@latest init

# 7. Add Shadcn components
npx shadcn@latest add button card dialog dropdown-menu \
  form input label select table tabs toast

# 8. Copy the schema.prisma from this document

# 9. Create database and run migrations
npx prisma migrate dev --name init

# 10. Start development
npm run dev
```

### 📋 Environment Variables

```env
# .env

# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"

# NextAuth
NEXTAUTH_SECRET="[GENERATE: openssl rand -base64 32]"
NEXTAUTH_URL="http://localhost:3000"

# Google Gemini AI
GOOGLE_GEMINI_API_KEY="[YOUR_API_KEY]"

# PEAK API (add after approval)
PEAK_API_URL="https://api.peakaccount.com"
PEAK_CLIENT_ID=""
PEAK_CLIENT_SECRET=""

# FlowAccount API (add after approval)
FLOWACCOUNT_CLIENT_ID=""
FLOWACCOUNT_CLIENT_SECRET=""
FLOWACCOUNT_REDIRECT_URI="http://localhost:3000/api/auth/flowaccount/callback"

# LINE Messaging (optional)
LINE_CHANNEL_SECRET=""
LINE_CHANNEL_ACCESS_TOKEN=""
```

### ✅ Pre-Launch Checklist

#### Week 1
- [ ] Project created
- [ ] Supabase project created
- [ ] Database connected
- [ ] Prisma schema defined
- [ ] Auth working (register/login)

#### Week 2
- [ ] UI components set up
- [ ] Document upload working
- [ ] AI classification working
- [ ] AI OCR working
- [ ] Document review UI done

#### Week 4
- [ ] Bank statement import working
- [ ] Auto-reconcile working
- [ ] Reconcile dashboard done

#### Week 6
- [ ] PEAK UAT access obtained
- [ ] PEAK integration working
- [ ] Documents syncing to PEAK

#### Week 8
- [ ] FlowAccount integration working
- [ ] Express export working
- [ ] All features tested
- [ ] Production deployed
- [ ] First customer onboarded! 🎉

---

## 📞 Support & Resources

### Documentation
- **PEAK API:** [developers.peakaccount.com](https://developers.peakaccount.com/reference/peak-open-api)
- **FlowAccount API:** [developers.flowaccount.com](https://developers.flowaccount.com/tutorial/)
- **Next.js:** [nextjs.org/docs](https://nextjs.org/docs)
- **Prisma:** [prisma.io/docs](https://www.prisma.io/docs)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)

### Contact
- **PEAK Support:** Chat ในโปรแกรม
- **FlowAccount Support:** 02-026-8989, support@flowaccount.com

---

**Ready to build! 🚀**

---

*Document Version: 3.0*  
*Last Updated: 9 มกราคม 2569*  
*Project: FlowDoc*
