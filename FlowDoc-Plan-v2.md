# 📋 FlowDoc - Document Management System

**Version:** 3.0 (Full Features)  
**Date:** 9 มกราคม 2569  
**Status:** Ready for Development 🚀

---

## 📊 สารบัญ

1. [Vision & Concept](#1-vision--concept)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Roles & Flows](#4-user-roles--flows)
5. [Target Market](#5-target-market)
6. [Core Features](#6-core-features)
7. [Tech Stack](#7-tech-stack)
8. [UI/UX Design](#8-uiux-design)
9. [Database Schema](#9-database-schema)
10. [PEAK API Integration](#10-peak-api-integration)
11. [Development Plan](#11-development-plan)
12. [Business Model](#12-business-model)
13. [Security & Privacy](#13-security--privacy)
14. [Error Handling Strategy](#14-error-handling-strategy)
15. [Testing Strategy](#15-testing-strategy)
16. [Onboarding Flow](#16-onboarding-flow)
17. [Payment & Subscription](#17-payment--subscription)
18. [Backup & Recovery](#18-backup--recovery)
19. [Categories Mapping](#19-categories-mapping)
20. [Deployment Guide](#20-deployment-guide)
21. [Getting Started](#21-getting-started)

---

## 1. Vision & Concept

### 🎯 What is FlowDoc?

**FlowDoc** คือระบบจัดการเอกสารทางบัญชีแบบดิจิทัล ที่แทนการเก็บในโฟลเดอร์

### 💬 One-Liner

> *"อัปโหลด → AI อ่าน → ค้นหาได้ → Push เข้า PEAK"*

### 🏷️ Tagline

> **"เลิกเก็บบิลในโฟลเดอร์ ให้ FlowDoc จัดการให้"**

### 🎪 Value Proposition

| For | Pain | FlowDoc Solution |
|-----|------|------------------|
| **นักบัญชี** | เก็บเอกสารในโฟลเดอร์ หายาก | ค้นหาได้ทันที |
| **นักบัญชี** | เปิดไฟล์ทีละใบ ดูข้อมูล | AI อ่านให้ เห็นทุกอย่าง |
| **นักบัญชี** | ไม่รู้ว่าเอกสารครบไหม | Dashboard สรุปให้ |
| **นักบัญชี** | คีย์เข้า PEAK ทีละรายการ | Bulk Push ทีเดียว |
| **ลูกค้า** | ส่งบิลทาง LINE แล้วหาย | เข้าระบบอัตโนมัติ |

---

## 2. Problem Statement

### 😫 สถานการณ์ปัจจุบัน

```
📁 Google Drive / Local Folder
├── 📁 2569
│   ├── 📁 01-มกราคม
│   │   ├── 📁 รายจ่าย
│   │   │   ├── 📄 IMG_001.jpg      ← ชื่อไฟล์ไม่บอกอะไร
│   │   │   ├── 📄 บิล-7eleven.pdf
│   │   │   ├── 📄 receipt_123.jpg
│   │   │   └── 📄 ...
│   │   ├── 📁 รายรับ
│   │   │   └── 📄 ...
│   │   └── 📁 สลิป
│   │       └── 📄 ...
│   ├── 📁 02-กุมภาพันธ์
│   └── 📁 ...
```

### ❌ ปัญหาที่เจอ

| ปัญหา | ความถี่ | ผลกระทบ |
|-------|---------|---------|
| **หาเอกสารไม่เจอ** | ทุกวัน | เสียเวลา 30+ นาที/วัน |
| **เปิดไฟล์ทีละใบ** | ทุกครั้ง | ไม่เห็นภาพรวม |
| **ไม่รู้ว่าครบไหม** | สิ้นเดือน | ปิดงบช้า |
| **คีย์ซ้ำ** | บ่อย | เสียเวลา + ผิดพลาด |
| **LINE หมดอายุ** | สัปดาห์ละ 2-3 ครั้ง | เอกสารหาย |
| **ไฟล์ซ้ำ** | บ่อย | สับสน |

### 📊 เวลาที่เสียไป (ต่อเดือน)

| งาน | ชั่วโมง/เดือน |
|-----|---------------|
| หาเอกสาร | 10 ชม. |
| เปิดไฟล์ดูข้อมูล | 15 ชม. |
| จัดเรียง/ตั้งชื่อไฟล์ | 5 ชม. |
| คีย์เข้า PEAK | 20 ชม. |
| **รวม** | **50 ชม./เดือน** |

---

## 3. Solution Overview

### ✅ FlowDoc = Document Hub

```
┌─────────────────────────────────────────────────────────────┐
│                       FlowDoc                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 📤 UPLOAD                            │   │
│  │   ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐        │   │
│  │   │ Drag  │  │ LINE  │  │ Scan  │  │ Email │        │   │
│  │   │ Drop  │  │ OA    │  │ 📷    │  │ 📧    │        │   │
│  │   └───────┘  └───────┘  └───────┘  └───────┘        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 🤖 AI PROCESS                        │   │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│  │   │ Classify  │  │   OCR     │  │ Duplicate │       │   │
│  │   │ ประเภท    │  │  อ่านข้อมูล │  │  Check    │       │   │
│  │   └───────────┘  └───────────┘  └───────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              📚 DOCUMENT LIBRARY                     │   │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│  │   │  Search   │  │  Filter   │  │   Sort    │       │   │
│  │   │  🔍       │  │  📊       │  │   ↕️       │       │   │
│  │   └───────────┘  └───────────┘  └───────────┘       │   │
│  │                                                     │   │
│  │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │   │
│  │   │ 🧾  │ │ 🧾  │ │ 🧾  │ │ 🧾  │ │ 🧾  │  ...     │   │
│  │   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 🚀 SYNC TO PEAK                      │   │
│  │   Select documents → Push → Done!                   │   │
│  │   (รูปภาพแนบไปด้วย)                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🎯 Key Differentiators

| Feature | โฟลเดอร์ | FlowDoc |
|---------|----------|---------|
| ค้นหา | ❌ ชื่อไฟล์เท่านั้น | ✅ ชื่อร้าน, ยอด, วันที่ |
| ดูข้อมูล | ❌ เปิดไฟล์ | ✅ เห็นทันที |
| จัดหมวดหมู่ | ❌ ทำเอง | ✅ AI ทำให้ |
| ตรวจซ้ำ | ❌ ไม่มี | ✅ Auto-detect |
| Push to PEAK | ❌ คีย์ทีละอัน | ✅ Bulk push |
| Mobile | ❌ ไม่สะดวก | ✅ รองรับ |

---

## 4. User Roles & Flows

### 👥 User Roles

| Role | คือใคร | เห็นอะไร | ทำอะไรได้ |
|------|--------|---------|----------|
| **Owner** | เจ้าของสำนักงานบัญชี | ทุกอย่าง | ทุกอย่าง |
| **Accountant** | นักบัญชี | ทุก Client ที่ดูแล | Review, Approve, Sync |
| **Client** | ลูกค้า (เจ้าของบิล) | เฉพาะบริษัทตัวเอง | ส่งเอกสาร, ดู Dashboard |

---

### 🔄 Main Flow (ปรับใหม่)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   📤 STEP 1: ลูกค้าส่งเอกสาร                                            │
│   ─────────────────────────                                             │
│   • ส่งรูปผ่าน LINE OA                                                  │
│   • อัปโหลดผ่าน Client Portal                                          │
│   • ถ่ายรูปจากมือถือ                                                     │
│                                                                         │
│   → 💬 LINE ตอบกลับอัตโนมัติ: "ได้รับบิลแล้วค่ะ ✅"                       │
│                                                                         │
│                         ▼                                               │
│                                                                         │
│   🤖 STEP 2: AI ประมวลผล (อัตโนมัติ)                                    │
│   ──────────────────────────────                                        │
│   • จำแนกประเภท (รายจ่าย/รายรับ/สลิป/50ทวิ)                              │
│   • อ่านข้อมูล (ชื่อร้าน, วันที่, ยอดเงิน)                                 │
│   • ตรวจเอกสารซ้ำ                                                       │
│   • Status: "รอตรวจสอบ" 🟡                                              │
│                                                                         │
│   → 👀 ลูกค้าเห็นใน Dashboard: "รอนักบัญชีตรวจสอบ"                       │
│                                                                         │
│                         ▼                                               │
│                                                                         │
│   ✅ STEP 3: นักบัญชี Review & Approve                                  │
│   ────────────────────────────────────                                  │
│   • ดูข้อมูลที่ AI อ่าน vs รูปต้นฉบับ                                    │
│   • แก้ไขถ้าผิด (ชื่อร้าน, ยอด, วันที่)                                   │
│   • กด Approve → Status: "พร้อม Sync" ✅                                │
│                                                                         │
│   → 👀 ลูกค้าเห็น: "ตรวจสอบแล้ว ✅"                                      │
│                                                                         │
│                         ▼                                               │
│                                                                         │
│   🚀 STEP 4: Sync to PEAK                                               │
│   ───────────────────────                                               │
│   • นักบัญชีเลือกเอกสารที่ Approved                                      │
│   • กด "Sync to PEAK"                                                   │
│   • เอกสาร + รูปภาพ ถูกส่งเข้า PEAK                                      │
│   • Status: "Sync แล้ว" 🟢                                              │
│                                                                         │
│   → 👀 ลูกค้าเห็น: "ส่งเข้าระบบบัญชีแล้ว 🟢"                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 📱 Client Portal (ลูกค้าเห็นอะไรบ้าง)

```
┌─────────────────────────────────────────────────────────────┐
│  🏢 บริษัท ABC จำกัด                         [ส่งเอกสาร]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 สรุปเดือน มกราคม 2569                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📄 ส่งแล้ว     🟡 รอตรวจ    ✅ ผ่านแล้ว    🟢 Sync   │   │
│  │     47           5            38           4        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📋 เอกสารล่าสุด                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️  ร้าน ABC        ฿1,500   5 ม.ค.    ✅ ผ่านแล้ว   │   │
│  │ 🖼️  บ.XYZ          ฿3,200   6 ม.ค.    🟡 รอตรวจ     │   │
│  │ 🖼️  ร้านกาแฟ        ฿120    7 ม.ค.    🟡 รอตรวจ     │   │
│  │ 🖼️  ค่าน้ำมัน        ฿1,800  8 ม.ค.    🟢 Sync แล้ว  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ แจ้งเตือน                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 2 รายการ รูปไม่ชัด - กรุณาส่งใหม่                   │   │
│  │ 📅 เหลือ 5 วัน ปิดงบเดือน ม.ค.                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 📊 Document Status Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ UPLOADED │ → │ REVIEWED │ → │ APPROVED │ → │  SYNCED  │
│   📤     │    │   🤖     │    │    ✅    │    │   🟢     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
    ↓              ↓               ↓               ↓
 "ได้รับแล้ว"    "รอตรวจ"      "ผ่านแล้ว"     "Sync แล้ว"

                    ↓
             ┌──────────┐
             │  REVIEW  │ ← AI ไม่มั่นใจ / รูปไม่ชัด
             │   🟡     │
             └──────────┘
                  ↓
            "ต้องตรวจสอบ"
```

---

### 💬 LINE Notification

| Event | ส่งถึง | ข้อความ |
|-------|--------|---------|
| ได้รับเอกสาร | ลูกค้า | "ได้รับบิลแล้วค่ะ ✅ รอนักบัญชีตรวจสอบ" |
| รูปไม่ชัด | ลูกค้า | "รูปไม่ชัด กรุณาส่งใหม่ค่ะ 📷" |
| เอกสารซ้ำ | ลูกค้า | "บิลนี้ส่งไปแล้วค่ะ (5 ม.ค.) ✅" |
| Approved | ลูกค้า | "ตรวจสอบเรียบร้อย ✅ รอส่งเข้าระบบ" |
| Synced | ลูกค้า | "ส่งเข้าระบบบัญชีแล้ว 🟢" |
| มีเอกสารใหม่ | นักบัญชี | "บ.ABC มีเอกสารใหม่ 3 รายการ" |
| ใกล้ปิดงบ | ลูกค้า | "⏰ เหลือ 5 วัน ปิดงบเดือน ม.ค." |

---

## 5. Target Market

### 🎯 Primary: สำนักงานบัญชี

| Segment | จำนวน | ลักษณะ |
|---------|-------|--------|
| สำนักงานเล็ก | 10,000+ | 1-3 คน, ลูกค้า 10-30 ราย |
| สำนักงานกลาง | 3,000+ | 4-10 คน, ลูกค้า 30-100 ราย |
| สำนักงานใหญ่ | 500+ | 10+ คน, ลูกค้า 100+ ราย |

### 🎯 Secondary: SME ที่มีนักบัญชี

| Segment | จำนวน | ลักษณะ |
|---------|-------|--------|
| SME ขนาดเล็ก | 50,000+ | บิล 50-200 ใบ/เดือน |
| SME ขนาดกลาง | 20,000+ | บิล 200-500 ใบ/เดือน |

### 📊 TAM (Total Addressable Market)

- สำนักงานบัญชี: 15,000 × ฿1,500 = ฿22.5M/เดือน
- SME: 70,000 × ฿500 = ฿35M/เดือน
- **Total TAM: ~฿57M/เดือน = ฿684M/ปี**

---

## 6. Core Features

### 📦 Module 1: Smart Upload

| Feature | Description | Priority |
|---------|-------------|----------|
| **Drag & Drop** | ลากไฟล์หลายไฟล์พร้อมกัน | P0 |
| **LINE Connect** | ส่งรูปผ่าน LINE OA เข้าระบบ | P0 |
| **LINE Auto-Reply** | ตอบกลับอัตโนมัติ (ได้รับ/ซ้ำ/ไม่ชัด) | P0 |
| **Camera Scan** | ถ่ายรูปจากมือถือ | P1 |
| **Bulk Import** | Import จาก ZIP/Folder | P2 |

### 📦 Module 2: AI Processing

| Feature | Description | Priority |
|---------|-------------|----------|
| **Auto-Classify** | แยกประเภท (รายจ่าย/รายรับ/สลิป/50ทวิ) | P0 |
| **OCR Extract** | อ่านชื่อร้าน, วันที่, ยอดเงิน | P0 |
| **Duplicate Check** | ตรวจเอกสารซ้ำ | P0 |
| **Confidence Score** | บอกความมั่นใจ | P0 |
| **Image Quality Check** | ตรวจว่ารูปชัดพอไหม | P1 |

### 📦 Module 3: Document Library (Accountant)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Grid/List View** | ดูแบบ Grid หรือ List | P0 |
| **Quick Search** | ค้นหาทันที (ชื่อ, ยอด, วันที่) | P0 |
| **Smart Filters** | Filter ตาม ประเภท/เดือน/สถานะ/ร้าน/ลูกค้า | P0 |
| **Sort Options** | เรียงตาม วันที่/ยอด/ชื่อ | P0 |
| **Preview Panel** | ดูรูป + ข้อมูลในหน้าเดียว | P0 |
| **Bulk Select** | เลือกหลายรายการ | P0 |
| **Client Switcher** | สลับดูลูกค้าแต่ละราย | P0 |

### 📦 Module 4: Review & Approve (NEW!)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Review Queue** | ดูรายการที่รอตรวจ | P0 |
| **Compare View** | ดูรูป + ข้อมูล AI เทียบกัน | P0 |
| **Edit Fields** | แก้ไขข้อมูลที่ AI อ่านผิด | P0 |
| **Approve Single** | Approve ทีละรายการ | P0 |
| **Bulk Approve** | Approve หลายรายการพร้อมกัน | P0 |
| **Reject + Comment** | ปฏิเสธ + ใส่เหตุผล | P1 |
| **Request Re-upload** | ขอให้ลูกค้าส่งใหม่ | P0 |
| **Quick Edit Mode** | แก้ไขเร็วๆ หลายรายการ | P1 |

### 📦 Module 5: Client Portal (NEW!)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Client Dashboard** | Dashboard สำหรับลูกค้า | P0 |
| **Document Status** | เห็นสถานะเอกสารทั้งหมด | P0 |
| **Monthly Summary** | สรุปยอดรายเดือน | P0 |
| **Upload Documents** | อัปโหลดเอกสารเอง | P0 |
| **Alerts** | แจ้งเตือน (รูปไม่ชัด/ใกล้ปิดงบ) | P0 |
| **Pending Alerts** | แจ้งเตือนเอกสารที่ยังไม่ครบ | P0 |
| **History** | ประวัติเอกสารย้อนหลัง | P1 |
| **Download Report** | ดาวน์โหลดสรุป | P2 |

### 📦 Module 6: Pending Documents (NEW!)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Pending Status** | ติดสถานะ "รอใบเสร็จ/รอ 50 ทวิ" | P0 |
| **Pending Dashboard** | Dashboard รวมเอกสารที่รอ | P0 |
| **Days Waiting** | แสดงจำนวนวันที่รอ | P0 |
| **Auto-Alert** | แจ้งเตือนเมื่อรอนาน (7+ วัน) | P0 |
| **Link Documents** | จับคู่เอกสารที่เกี่ยวข้อง | P0 |
| **AI Suggest Link** | AI แนะนำเอกสารที่อาจเกี่ยวข้อง | P1 |
| **Auto-Resolve** | เมื่อได้เอกสาร → status เปลี่ยนอัตโนมัติ | P1 |
| **LINE Remind** | ส่ง LINE เตือนลูกค้าให้ตามเอกสาร | P1 |

### 📦 Module 7: Notifications

| Feature | Description | Priority |
|---------|-------------|----------|
| **LINE Notify** | แจ้งเตือนผ่าน LINE | P0 |
| **Status Updates** | แจ้งเมื่อสถานะเปลี่ยน | P0 |
| **Pending Reminder** | แจ้งเตือนเอกสารที่รอนาน | P0 |
| **Deadline Reminder** | แจ้งเตือนใกล้ปิดงบ | P1 |
| **New Document Alert** | แจ้งนักบัญชีเมื่อมีเอกสารใหม่ | P1 |

### 📦 Module 8: PEAK Sync

| Feature | Description | Priority |
|---------|-------------|----------|
| **Connect PEAK** | เชื่อมต่อบัญชี PEAK | P0 |
| **Push Expense** | ส่งรายจ่ายเข้า PEAK | P0 |
| **Push Receipt** | ส่งรายรับเข้า PEAK | P0 |
| **Attach Image** | แนบรูปไปด้วย | P0 |
| **Sync Status** | เห็นสถานะ Sync | P0 |
| **Bulk Sync** | Sync หลายรายการพร้อมกัน | P0 |
| **Retry Failed** | Retry ที่ล้มเหลว | P1 |

### 📦 Module 9: FlowAccount Sync (Phase 2)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Connect FlowAccount** | เชื่อมต่อ FlowAccount | P2 |
| **Push Documents** | ส่งเอกสารเข้า FlowAccount | P2 |
| **Map Categories** | Map หมวดหมู่กับ FlowAccount | P2 |

### 📦 Module 10: Express Export

| Feature | Description | Priority |
|---------|-------------|----------|
| **Export CSV** | Export รายการเป็น CSV สำหรับ Express | P2 |
| **Export ZIP** | Export รูปเอกสารเป็น ZIP | P2 |
| **Filename Format** | ตั้งชื่อไฟล์ตาม Express format | P2 |
| **Batch Export** | Export ทีละเดือน/ทั้งหมด | P2 |

### 📦 Module 11: Admin Dashboard (Owner)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Overview Stats** | สรุปทุก Client (เอกสาร, Pending, Sync) | P0 |
| **Client List** | รายชื่อ Client ทั้งหมด | P0 |
| **User Management** | เพิ่ม/ลบ/แก้ไข User | P0 |
| **Team Members** | จัดการนักบัญชีในทีม | P0 |
| **Assign Clients** | มอบหมาย Client ให้นักบัญชี | P1 |
| **Usage Report** | รายงานการใช้งาน (เอกสาร/เดือน) | P1 |
| **Billing Dashboard** | ดู Plan + Usage + Invoice | P1 |

### 📦 Module 12: Client Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Add Client** | เพิ่ม Client (Company) ใหม่ | P0 |
| **Invite Client** | ส่ง Email/LINE เชิญ Client | P0 |
| **Client Profile** | ข้อมูลบริษัท + ผู้ติดต่อ | P0 |
| **LINE OA Setup** | ตั้งค่า LINE OA สำหรับ Client | P0 |
| **Deadline Config** | ตั้งวันปิดงบแต่ละ Client | P1 |
| **Archive Client** | Archive Client ที่ไม่ใช้แล้ว | P2 |

### 📦 Module 13: Settings

| Feature | Description | Priority |
|---------|-------------|----------|
| **Profile Settings** | แก้ไขข้อมูลส่วนตัว | P0 |
| **Company Settings** | ข้อมูลสำนักงานบัญชี | P0 |
| **Notification Settings** | ตั้งค่าการแจ้งเตือน | P0 |
| **PEAK Connection** | ตั้งค่า PEAK API | P0 |
| **FlowAccount Connection** | ตั้งค่า FlowAccount API | P2 |
| **LINE Bot Settings** | ตั้งค่า LINE OA | P0 |
| **Categories Mapping** | Map หมวดหมู่กับระบบบัญชี | P1 |
| **Export Settings** | ตั้งค่า format export | P2 |
| **Team Settings** | จัดการสมาชิกทีม | P0 |
| **Billing Settings** | จัดการ subscription | P1 |

### 📦 Module 14: Audit Log

| Feature | Description | Priority |
|---------|-------------|----------|
| **Activity Log** | บันทึกการกระทำทั้งหมด | P1 |
| **User Actions** | ใครทำอะไรเมื่อไหร่ | P1 |
| **Document History** | ประวัติการเปลี่ยนแปลงเอกสาร | P1 |
| **Login History** | ประวัติการ login | P2 |
| **Export Log** | Export log เป็น CSV | P2 |

---

## 7. Tech Stack

### 🛠️ Core Technologies

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | Next.js 15 (App Router) | Full-stack, Fast |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + Shadcn UI | Bill Tracker style |
| **Database** | PostgreSQL (Supabase) | Free tier, Reliable |
| **ORM** | Prisma 6 | Type-safe queries |
| **Storage** | Supabase Storage | 1GB free, Easy |
| **Auth** | NextAuth.js v5 | Secure |
| **AI** | Google Gemini 2.0 Flash | Fast OCR, Thai support |

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
    "bcryptjs": "^2.4.3"
  }
}
```

### 📁 Project Structure

```
flowdoc/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (accountant)/              # นักบัญชี
│   │   │   └── [company]/
│   │   │       ├── dashboard/         # Overview ทุก Client
│   │   │       │   └── page.tsx
│   │   │       ├── documents/         # Document Library
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/          # Document Detail
│   │   │       │       └── page.tsx
│   │   │       ├── review/            # Review Queue
│   │   │       │   └── page.tsx
│   │   │       ├── pending/           # Pending Dashboard (NEW!)
│   │   │       │   └── page.tsx
│   │   │       ├── clients/           # จัดการลูกค้า
│   │   │       │   ├── page.tsx
│   │   │       │   └── [clientId]/
│   │   │       │       └── page.tsx
│   │   │       ├── sync/              # PEAK/FlowAccount Sync
│   │   │       │   └── page.tsx
│   │   │       ├── admin/             # Admin Dashboard (NEW!)
│   │   │       │   └── page.tsx
│   │   │       ├── team/              # Team Management (NEW!)
│   │   │       │   └── page.tsx
│   │   │       ├── settings/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── profile/page.tsx
│   │   │       │   ├── company/page.tsx
│   │   │       │   ├── notifications/page.tsx
│   │   │       │   ├── integrations/page.tsx
│   │   │       │   ├── categories/page.tsx
│   │   │       │   └── billing/page.tsx
│   │   │       └── layout.tsx
│   │   │
│   │   ├── (client)/                  # ลูกค้า (NEW!)
│   │   │   └── [company]/
│   │   │       ├── dashboard/         # Client Dashboard
│   │   │       │   └── page.tsx
│   │   │       ├── documents/         # เอกสารของฉัน
│   │   │       │   └── page.tsx
│   │   │       ├── upload/            # อัปโหลดเอกสาร
│   │   │       │   └── page.tsx
│   │   │       └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── documents/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── pending/route.ts   # NEW!
│   │   │   │   │   └── link/route.ts      # NEW!
│   │   │   │   ├── approve/route.ts
│   │   │   │   └── reject/route.ts
│   │   │   ├── pending/               # NEW!
│   │   │   │   ├── route.ts           # Get all pending
│   │   │   │   └── remind/route.ts    # Send reminder
│   │   │   ├── links/                 # NEW!
│   │   │   │   ├── route.ts
│   │   │   │   └── suggest/route.ts   # AI suggest
│   │   │   ├── ai/
│   │   │   ├── sync/
│   │   │   ├── notifications/
│   │   │   │   └── line/route.ts
│   │   │   ├── admin/                 # NEW!
│   │   │   │   ├── stats/route.ts
│   │   │   │   └── usage/route.ts
│   │   │   ├── users/                 # NEW!
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── invite/route.ts
│   │   │   ├── clients/               # NEW!
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── invite/route.ts
│   │   │   ├── settings/              # NEW!
│   │   │   │   ├── profile/route.ts
│   │   │   │   ├── company/route.ts
│   │   │   │   └── notifications/route.ts
│   │   │   ├── categories/            # NEW!
│   │   │   │   ├── route.ts
│   │   │   │   └── mapping/route.ts
│   │   │   ├── subscription/          # NEW!
│   │   │   │   ├── route.ts
│   │   │   │   ├── upgrade/route.ts
│   │   │   │   └── cancel/route.ts
│   │   │   ├── audit/                 # NEW!
│   │   │   │   └── route.ts
│   │   │   └── webhooks/
│   │   │       ├── line/route.ts
│   │   │       └── omise/route.ts     # Payment webhook
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # Shadcn
│   │   ├── documents/
│   │   │   ├── document-grid.tsx
│   │   │   ├── document-card.tsx
│   │   │   ├── document-list.tsx
│   │   │   ├── document-preview.tsx
│   │   │   ├── document-filters.tsx
│   │   │   ├── document-detail.tsx
│   │   │   └── upload-zone.tsx
│   │   ├── review/
│   │   │   ├── review-queue.tsx
│   │   │   ├── compare-view.tsx
│   │   │   ├── approve-button.tsx
│   │   │   └── reject-dialog.tsx
│   │   ├── pending/                   # NEW!
│   │   │   ├── pending-dashboard.tsx
│   │   │   ├── pending-list.tsx
│   │   │   ├── pending-card.tsx
│   │   │   ├── pending-status.tsx
│   │   │   ├── link-documents-dialog.tsx
│   │   │   └── ai-suggest-links.tsx
│   │   ├── client/
│   │   │   ├── client-dashboard.tsx
│   │   │   ├── client-stats.tsx
│   │   │   ├── client-alerts.tsx
│   │   │   ├── client-pending-alerts.tsx  # NEW!
│   │   │   └── client-doc-list.tsx
│   │   ├── sync/
│   │   │   ├── peak-connect.tsx
│   │   │   └── sync-status.tsx
│   │   ├── admin/                     # NEW!
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── client-list.tsx
│   │   │   ├── user-management.tsx
│   │   │   ├── team-management.tsx
│   │   │   └── usage-stats.tsx
│   │   ├── settings/                  # NEW!
│   │   │   ├── profile-form.tsx
│   │   │   ├── company-form.tsx
│   │   │   ├── notification-settings.tsx
│   │   │   ├── integration-card.tsx
│   │   │   ├── categories-mapping.tsx
│   │   │   └── billing-info.tsx
│   │   ├── onboarding/                # NEW!
│   │   │   ├── onboarding-wizard.tsx
│   │   │   ├── step-company.tsx
│   │   │   ├── step-integration.tsx
│   │   │   ├── step-client.tsx
│   │   │   └── step-line.tsx
│   │   ├── subscription/              # NEW!
│   │   │   ├── pricing-table.tsx
│   │   │   ├── plan-card.tsx
│   │   │   ├── payment-form.tsx
│   │   │   └── usage-meter.tsx
│   │   └── shared/
│   │       ├── navbar.tsx
│   │       ├── sidebar.tsx
│   │       ├── bottom-nav.tsx
│   │       └── role-guard.tsx
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini.ts
│   │   │   ├── classifier.ts
│   │   │   ├── ocr.ts
│   │   │   └── duplicate-check.ts
│   │   ├── peak/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── expenses.ts
│   │   │   └── receipts.ts
│   │   ├── flowaccount/               # NEW!
│   │   │   ├── client.ts
│   │   │   └── sync.ts
│   │   ├── notifications/
│   │   │   ├── line.ts
│   │   │   ├── email.ts               # NEW!
│   │   │   └── templates.ts
│   │   ├── payment/                   # NEW!
│   │   │   ├── omise.ts
│   │   │   └── subscription.ts
│   │   ├── export/                    # NEW!
│   │   │   ├── csv.ts
│   │   │   └── express.ts
│   │   ├── audit/                     # NEW!
│   │   │   └── logger.ts
│   │   ├── security/                  # NEW!
│   │   │   ├── encryption.ts
│   │   │   └── rate-limit.ts
│   │   ├── storage/
│   │   │   └── supabase.ts
│   │   ├── auth.ts
│   │   └── db.ts
│   │
│   ├── hooks/
│   │   ├── use-documents.ts
│   │   ├── use-review.ts
│   │   ├── use-sync.ts
│   │   ├── use-role.ts
│   │   ├── use-subscription.ts        # NEW!
│   │   ├── use-audit-log.ts           # NEW!
│   │   └── use-categories.ts          # NEW!
│   │
│   └── types/
│       └── index.ts
│
├── .env.example
├── package.json
└── README.md
```

---

## 7. UI/UX Design

### 🎨 Design System (Based on Bill Tracker)

| Property | Value |
|----------|-------|
| **Primary Color** | Emerald (`oklch(0.596 0.145 163.225)`) |
| **Style** | Shadcn "new-york" |
| **Font** | Noto Sans Thai |
| **Border Radius** | 0.75rem |
| **Mode** | Light + Dark |

### 📐 Layout

```
Desktop (lg+):
┌──────────┬────────────────────────────────────────┐
│          │  Header (h-16)                         │
│  Sidebar │  └── Company | Theme | User            │
│  (w-60)  ├────────────────────────────────────────┤
│          │                                        │
│  ├─ 📄   │           Main Content                 │
│  ├─ 📤   │           (p-6)                        │
│  ├─ 🔄   │                                        │
│  └─ ⚙️   │                                        │
│          │                                        │
└──────────┴────────────────────────────────────────┘

Mobile:
┌────────────────────────────────────────┐
│  Header                                │
├────────────────────────────────────────┤
│                                        │
│           Main Content                 │
│           (p-4, pb-20)                 │
│                                        │
├────────────────────────────────────────┤
│  Bottom Nav                            │
│  [เอกสาร] [อัปโหลด] [Sync] [ตั้งค่า]     │
└────────────────────────────────────────┘
```

### 📱 Page: Documents (Accountant View)

```
┌─────────────────────────────────────────────────────────────┐
│  เอกสารทั้งหมด                           [+ อัปโหลด]        │
├─────────────────────────────────────────────────────────────┤
│  🔍 [ค้นหาเอกสาร...                                    ]    │
│                                                             │
│  [ลูกค้าทั้งหมด ▼] [ทุกประเภท ▼] [ม.ค. 2569 ▼] [ทุกสถานะ ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 เดือนนี้                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 📤 12   │ │ 🟡 8    │ │ ✅ 25   │ │ 🟢 10   │           │
│  │ รอตรวจ  │ │ ต้องแก้  │ │ Approved│ │ Synced  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☑️ เลือก 3 รายการ      [Approve] [Sync to PEAK] [ลบ]      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🖼️       │ │ 🖼️       │ │ 🖼️       │ │ 🖼️       │       │
│  │ ☑️       │ │ ☑️       │ │ ☑️       │ │ ☐        │       │
│  │ [รายจ่าย]│ │ [รายจ่าย]│ │ [รายรับ] │ │ [รอตรวจ] │       │
│  │──────────│ │──────────│ │──────────│ │──────────│       │
│  │ ร้าน ABC │ │ บ.XYZ    │ │ นาย ก    │ │ ???      │       │
│  │ ฿1,500   │ │ ฿3,200   │ │ ฿25,000  │ │ ฿???     │       │
│  │ 5 ม.ค.   │ │ 6 ม.ค.   │ │ 7 ม.ค.   │ │ 8 ม.ค.   │       │
│  │ บ.ABC    │ │ บ.ABC    │ │ บ.XYZ    │ │ บ.DEF    │       │
│  │ [SYNCED] │ │[APPROVED]│ │[APPROVED]│ │ [REVIEW] │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Review Queue (Accountant)

```
┌─────────────────────────────────────────────────────────────┐
│  รอตรวจสอบ (12 รายการ)                [Approve ทั้งหมด]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  ┌────────────────┐    📋 ข้อมูลที่ AI อ่าน          │  │
│  │  │                │                                  │  │
│  │  │   🖼️ รูปบิล     │    ประเภท: รายจ่าย               │  │
│  │  │                │    ชื่อร้าน: [ร้าน ABC      ]     │  │
│  │  │                │    วันที่: [5 ม.ค. 2569    ]     │  │
│  │  │                │    ยอดเงิน: [฿1,500       ]      │  │
│  │  │                │    VAT: [7%               ]      │  │
│  │  │                │                                  │  │
│  │  │                │    Confidence: 95% ✅             │  │
│  │  │                │                                  │  │
│  │  └────────────────┘    [✅ Approve] [❌ ขอส่งใหม่]     │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ◀ 1 / 12 ▶                              [Skip] [Approve]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Client Dashboard (NEW!)

```
┌─────────────────────────────────────────────────────────────┐
│  🏢 บริษัท ABC จำกัด                     [📤 ส่งเอกสาร]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👋 สวัสดีคุณสมชาย                                          │
│  นักบัญชีของคุณ: คุณสมหญิง                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 สรุปเดือน มกราคม 2569                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📤 ส่งแล้ว     🟡 รอตรวจ    ✅ ผ่านแล้ว    🟢 Sync   │   │
│  │     47           5            38           4        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💰 ยอดรวมเดือนนี้                                          │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │  📉 รายจ่าย        │  │  📈 รายรับ         │            │
│  │  ฿45,320          │  │  ฿125,000         │            │
│  └────────────────────┘  └────────────────────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ ต้องดำเนินการ                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📷 2 รายการ รูปไม่ชัด - กรุณาส่งใหม่         [ส่งใหม่]│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⏰ เหลือ 5 วัน ปิดงบเดือน ม.ค.                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 เอกสารล่าสุด                               [ดูทั้งหมด] │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️  ร้าน ABC        ฿1,500   5 ม.ค.    ✅ ผ่านแล้ว   │   │
│  │ 🖼️  บ.XYZ          ฿3,200   6 ม.ค.    🟡 รอตรวจ     │   │
│  │ 🖼️  ร้านกาแฟ        ฿120    7 ม.ค.    🟡 รอตรวจ     │   │
│  │ 🖼️  ค่าน้ำมัน        ฿1,800  8 ม.ค.    🟢 Sync แล้ว  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Pending Dashboard (Accountant)

```
┌─────────────────────────────────────────────────────────────┐
│  ⏳ รอเอกสารเพิ่มเติม                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 สรุป                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🧾 12   │ │ 📄 5    │ │ 📋 3    │ │ ⚠️ 8    │           │
│  │รอใบเสร็จ│ │รอ TAX INV│ │ รอ 50ทวิ│ │ รอ>7วัน │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ รอนานเกิน 7 วัน (8 รายการ)                  [LINE เตือน]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 ABC Co.        ฿10,000   รอใบเสร็จ    12 วันแล้ว │   │
│  │    สลิปโอนเงิน 5 ม.ค.               [ตามเอกสาร]     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 XYZ Service    ฿20,000   รอ 50 ทวิ   10 วันแล้ว  │   │
│  │    ใบเสร็จ 7 ม.ค.                   [ตามเอกสาร]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟡 รอใบเสร็จ (12 รายการ)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DEF Inc.         ฿5,000    3 วัน    บ.ABC           │   │
│  │ GHI Ltd.         ฿8,500    2 วัน    บ.XYZ           │   │
│  │ JKL Co.          ฿3,200    1 วัน    บ.ABC           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Document Detail with Pending

```
┌─────────────────────────────────────────────────────────────┐
│  เอกสาร: สลิปโอนเงิน                              [แก้ไข]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │                    │  │ 📋 ข้อมูลเอกสาร             │    │
│  │                    │  │                            │    │
│  │     🖼️ รูปสลิป      │  │ ประเภท: สลิปโอนเงิน        │    │
│  │                    │  │ ร้าน: ABC Co., Ltd.        │    │
│  │                    │  │ ยอด: ฿10,000               │    │
│  │                    │  │ วันที่: 5 ม.ค. 2569        │    │
│  │                    │  │                            │    │
│  │                    │  │ Status: ✅ Approved        │    │
│  │                    │  │                            │    │
│  └────────────────────┘  │ ─────────────────────────  │    │
│                          │                            │    │
│                          │ ⏳ Pending Items:          │    │
│                          │ ┌────────────────────────┐ │    │
│                          │ │ ☐ รอใบเสร็จ            │ │    │
│                          │ │   รอมา 12 วันแล้ว ⚠️   │ │    │
│                          │ │   [ตามเอกสาร] [ได้แล้ว] │ │    │
│                          │ └────────────────────────┘ │    │
│                          │                            │    │
│                          │ 📎 เอกสารที่เกี่ยวข้อง:     │    │
│                          │ (ยังไม่มี)                 │    │
│                          │ [+ Link เอกสาร]            │    │
│                          │                            │    │
│                          └────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Dialog: Link Documents

```
┌─────────────────────────────────────────────────────────────┐
│  🔗 เชื่อมโยงเอกสาร                                   [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  เอกสารหลัก: สลิปโอนเงิน ABC Co. ฿10,000 (5 ม.ค.)          │
│                                                             │
│  🔍 [ค้นหาเอกสารที่เกี่ยวข้อง...                       ]    │
│                                                             │
│  💡 AI แนะนำ:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ ใบเสร็จ ABC Co. ฿10,000 (7 ม.ค.)                  │   │
│  │    ตรงกัน: ชื่อร้าน, ยอดเงิน               [เลือก]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📋 เอกสารอื่น (ABC Co.):                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ใบแจ้งหนี้ ABC Co. ฿10,000 (3 ม.ค.)       [เลือก]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ประเภทความสัมพันธ์:                                        │
│  [สลิป → ใบเสร็จ ▼]                                        │
│                                                             │
│                              [ยกเลิก]  [เชื่อมโยง]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Client Documents List

```
┌─────────────────────────────────────────────────────────────┐
│  📋 เอกสารของฉัน                          [📤 ส่งเอกสาร]    │
├─────────────────────────────────────────────────────────────┤
│  🔍 [ค้นหา...                        ]                     │
│                                                             │
│  [ทุกประเภท ▼] [ม.ค. 2569 ▼] [ทุกสถานะ ▼]                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️                                                  │   │
│  │     ร้าน ABC                                        │   │
│  │     ฿1,500 • รายจ่าย • 5 ม.ค. 2569                  │   │
│  │     ✅ ตรวจสอบแล้ว                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️                                                  │   │
│  │     บ.XYZ                                           │   │
│  │     ฿3,200 • รายจ่าย • 6 ม.ค. 2569                  │   │
│  │     🟡 รอนักบัญชีตรวจสอบ                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️                                         [ส่งใหม่]│   │
│  │     ???                                             │   │
│  │     ฿??? • ??? • 7 ม.ค. 2569                        │   │
│  │     ⚠️ รูปไม่ชัด - กรุณาส่งใหม่                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️                                                  │   │
│  │     ค่าน้ำมัน                                        │   │
│  │     ฿1,800 • รายจ่าย • 8 ม.ค. 2569                  │   │
│  │     🟢 ส่งเข้าระบบบัญชีแล้ว                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Upload

```
┌─────────────────────────────────────────────────────────────┐
│  อัปโหลดเอกสาร                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │             📁 ลากไฟล์มาวางที่นี่                    │   │
│  │                                                     │   │
│  │           หรือ คลิกเพื่อเลือกไฟล์                     │   │
│  │                                                     │   │
│  │              [เลือกไฟล์]  [ถ่ายรูป]                   │   │
│  │                                                     │   │
│  │          รองรับ: JPG, PNG, PDF (สูงสุด 10MB)         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  อัปโหลดล่าสุด (5 รายการ)                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️ IMG_001.jpg    ✓ อัปโหลดแล้ว    🔄 กำลังประมวลผล  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️ receipt.pdf    ✓ อัปโหลดแล้ว    ✓ AI อ่านแล้ว     │   │
│  │    → ร้าน ABC, ฿1,500, รายจ่าย                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🖼️ บิล-123.jpg    ✓ อัปโหลดแล้ว    ⚠️ ซ้ำกับเอกสารเดิม│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Page: Sync

```
┌─────────────────────────────────────────────────────────────┐
│  Sync to Accounting                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔷 PEAK Account                      [เชื่อมต่อแล้ว] │   │
│  │                                                     │   │
│  │  บริษัท: ABC Co., Ltd.                              │   │
│  │  Last sync: 5 นาทีที่แล้ว                            │   │
│  │  Synced this month: 45 documents                    │   │
│  │                                                     │   │
│  │  [ตั้งค่า]  [ยกเลิกการเชื่อมต่อ]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📘 FlowAccount                       [เชื่อมต่อ]    │   │
│  │                                                     │   │
│  │  ยังไม่ได้เชื่อมต่อ                                   │   │
│  │                                                     │   │
│  │  [เชื่อมต่อ FlowAccount]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📋 รอ Sync (38 รายการ)                    [Sync ทั้งหมด]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️  ร้าน ABC           ฿1,500   รายจ่าย   5 ม.ค.    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️  บ.XYZ              ฿3,200   รายจ่าย   6 ม.ค.    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️  นาย ก              ฿25,000  รายรับ    7 ม.ค.    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🖼️ Document Preview Modal

```
┌─────────────────────────────────────────────────────────────┐
│  เอกสาร #12345                              [แก้ไข] [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │                    │  │ 📋 ข้อมูลเอกสาร             │    │
│  │                    │  │                            │    │
│  │     🖼️ รูปบิล       │  │ ประเภท: รายจ่าย            │    │
│  │                    │  │ ชื่อร้าน: ร้าน ABC          │    │
│  │                    │  │ เลขผู้เสียภาษี: 1234567890123│    │
│  │                    │  │ วันที่: 5 มกราคม 2569       │    │
│  │                    │  │ ยอดก่อน VAT: ฿1,401.87     │    │
│  │                    │  │ VAT 7%: ฿98.13             │    │
│  │                    │  │ ยอดรวม: ฿1,500.00          │    │
│  │                    │  │                            │    │
│  │                    │  │ สถานะ: พร้อม Sync          │    │
│  │                    │  │ AI Confidence: 95%         │    │
│  │                    │  │                            │    │
│  └────────────────────┘  │ ───────────────────────    │    │
│                          │                            │    │
│                          │ [Sync to PEAK]             │    │
│                          │                            │    │
│                          └────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// AUTH & COMPANY
// =============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String
  avatarUrl     String?
  phone         String?           // สำหรับ LINE notification
  lineUserId    String?           // LINE User ID
  isActive      Boolean   @default(true)
  
  companies         CompanyAccess[]
  uploadedDocs      Document[]    @relation("UploadedDocs")
  reviewedDocs      Document[]    @relation("ReviewedDocs")
  approvedDocs      Document[]    @relation("ApprovedDocs")
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Company {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  taxId       String?
  logoUrl     String?
  
  // Deadline
  closingDay  Int?     @default(25)  // วันปิดงบแต่ละเดือน
  
  // LINE Bot
  lineChannelSecret      String?
  lineChannelAccessToken String?
  
  // Relations
  users         CompanyAccess[]
  documents     Document[]
  connections   PlatformConnection[]
  subscription  Subscription?
  categories    Category[]
  auditLogs     AuditLog[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CompanyAccess {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  role      Role    @default(MEMBER)
  
  createdAt DateTime @default(now())
  
  @@unique([userId, companyId])
}

enum Role {
  OWNER       // เจ้าของสำนักงาน
  ADMIN       // แอดมิน
  ACCOUNTANT  // นักบัญชี (Review, Approve, Sync)
  CLIENT      // ลูกค้า (Upload, View Dashboard)
  VIEWER      // ดูอย่างเดียว
}

// =============================================================================
// DOCUMENTS
// =============================================================================

model Document {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Classification
  docType   DocType
  status    DocStatus @default(PROCESSING)
  
  // AI Extracted Data
  vendorName      String?
  vendorTaxId     String?
  amount          Decimal?  @db.Decimal(14, 2)
  vatRate         Int?
  vatAmount       Decimal?  @db.Decimal(14, 2)
  totalAmount     Decimal?  @db.Decimal(14, 2)
  documentDate    DateTime?
  invoiceNumber   String?
  description     String?
  paymentMethod   PaymentMethod?
  
  // AI Metadata
  extractedData   Json?
  aiConfidence    Int?
  
  // Category (for mapping to accounting system)
  categoryId      String?
  category        Category? @relation(fields: [categoryId], references: [id])
  
  // File
  fileUrl         String
  fileName        String
  fileSize        Int?
  mimeType        String?
  
  // Source
  source          UploadSource @default(WEB)
  
  // Duplicate Detection
  isDuplicate     Boolean   @default(false)
  duplicateOfId   String?
  duplicateOf     Document? @relation("DuplicateOf", fields: [duplicateOfId], references: [id])
  duplicates      Document[] @relation("DuplicateOf")
  
  // Review & Approve (NEW!)
  reviewedBy      String?
  reviewer        User?     @relation("ReviewedDocs", fields: [reviewedBy], references: [id])
  reviewedAt      DateTime?
  reviewNote      String?
  
  approvedBy      String?
  approver        User?     @relation("ApprovedDocs", fields: [approvedBy], references: [id])
  approvedAt      DateTime?
  
  rejectedReason  String?
  
  // Sync Status
  peakSyncId      String?
  peakSyncedAt    DateTime?
  peakSyncError   String?
  
  flowaccountSyncId   String?
  flowaccountSyncedAt DateTime?
  
  // Tags
  tags            String[]  @default([])
  
  // Pending Items (NEW!)
  pendingItems    PendingItem[]  @default([])
  pendingNote     String?
  pendingDueDate  DateTime?
  
  // Document Linking (NEW!)
  linkedDocuments DocumentLink[]  @relation("SourceDoc")
  linkedFrom      DocumentLink[]  @relation("LinkedDoc")
  
  // Tracking
  uploadedBy String
  uploader   User     @relation("UploadedDocs", fields: [uploadedBy], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  
  @@index([companyId, docType])
  @@index([companyId, status])
  @@index([documentDate])
  @@index([vendorName])
  @@index([totalAmount])
  @@index([pendingItems])
}

// Document Linking (NEW!)
model DocumentLink {
  id            String   @id @default(cuid())
  
  sourceDocId   String
  sourceDoc     Document @relation("SourceDoc", fields: [sourceDocId], references: [id], onDelete: Cascade)
  
  linkedDocId   String
  linkedDoc     Document @relation("LinkedDoc", fields: [linkedDocId], references: [id], onDelete: Cascade)
  
  linkType      LinkType
  note          String?
  
  createdAt     DateTime @default(now())
  createdBy     String
  
  @@unique([sourceDocId, linkedDocId])
}

enum LinkType {
  SLIP_TO_RECEIPT       // สลิป → ใบเสร็จ
  RECEIPT_TO_WHT        // ใบเสร็จ → 50 ทวิ
  PO_TO_INVOICE         // PO → ใบแจ้งหนี้
  INVOICE_TO_RECEIPT    // ใบแจ้งหนี้ → ใบเสร็จ
  RELATED               // เกี่ยวข้องกัน
}

enum PendingItem {
  RECEIPT         // รอใบเสร็จ
  TAX_INVOICE     // รอใบกำกับภาษี
  WHT_CERT        // รอ 50 ทวิ
  DELIVERY_NOTE   // รอใบส่งของ
  PO              // รอ PO
  OTHER           // อื่นๆ
}

enum DocType {
  EXPENSE         // รายจ่าย
  INCOME          // รายรับ
  TAX_INVOICE     // ใบกำกับภาษี
  SLIP            // สลิปโอนเงิน
  WHT_CERT        // 50 ทวิ
  OTHER
}

enum DocStatus {
  UPLOADED        // เพิ่งอัปโหลด
  PROCESSING      // กำลังประมวลผล AI
  PENDING_REVIEW  // รอนักบัญชีตรวจสอบ
  NEEDS_REUPLOAD  // ต้องส่งใหม่ (รูปไม่ชัด)
  APPROVED        // นักบัญชี Approve แล้ว (พร้อม Sync)
  SYNCED          // Sync เข้า PEAK แล้ว
  REJECTED        // ปฏิเสธ
  ERROR           // มีปัญหา
}

enum PaymentMethod {
  CASH
  TRANSFER
  CREDIT_CARD
  PROMPTPAY
  CHEQUE
}

enum UploadSource {
  WEB
  LINE
  MOBILE
  IMPORT
}

// =============================================================================
// PLATFORM CONNECTIONS
// =============================================================================

model PlatformConnection {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  platform    Platform
  isActive    Boolean  @default(true)
  credentials Json
  settings    Json     @default("{}")
  
  lastSyncAt     DateTime?
  lastSyncError  String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([companyId, platform])
}

enum Platform {
  PEAK
  FLOWACCOUNT
}

// =============================================================================
// SUBSCRIPTION & BILLING
// =============================================================================

model Subscription {
  id          String   @id @default(cuid())
  companyId   String   @unique
  company     Company  @relation(fields: [companyId], references: [id])
  
  plan        Plan     @default(FREE)
  status      SubscriptionStatus @default(ACTIVE)
  
  documentsLimit    Int
  usersLimit        Int
  clientsLimit      Int
  documentsUsed     Int @default(0)
  
  billingCycle      BillingCycle @default(MONTHLY)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  
  omiseCustomerId   String?
  omiseCardId       String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Plan {
  FREE
  STARTER
  PRO
  BUSINESS
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  PAUSED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

// =============================================================================
// CATEGORIES
// =============================================================================

model Category {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  name        String
  type        CategoryType
  
  peakAccountCode     String?
  flowaccountCode     String?
  expressCode         String?
  
  isDefault   Boolean  @default(false)
  
  documents   Document[]
  
  createdAt   DateTime @default(now())
  
  @@unique([companyId, name])
}

enum CategoryType {
  EXPENSE
  INCOME
}

// =============================================================================
// AUDIT LOG
// =============================================================================

model AuditLog {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  userId      String
  userName    String
  
  action      AuditAction
  entityType  String
  entityId    String
  
  oldData     Json?
  newData     Json?
  
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  @@index([companyId, createdAt])
  @@index([entityType, entityId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  APPROVE
  REJECT
  SYNC
  LOGIN
  LOGOUT
  INVITE
  UPLOAD
}
```

---

## 9. PEAK API Integration

### 🔗 API Reference

**Docs:** [developers.peakaccount.com](https://developers.peakaccount.com/reference/peak-open-api)

### 📡 Endpoints Used

| Endpoint | Method | Use Case |
|----------|--------|----------|
| `/ClientToken` | POST | Get access token |
| `/Contacts` | POST | Create vendor/customer |
| `/Contacts` | GET | Get existing contacts |
| `/Expenses` | POST | Push expense |
| `/Expenses/InsertFile` | POST | Attach receipt image |
| `/Receipts` | POST | Push income/receipt |
| `/Receipts/InsertFile` | POST | Attach image |

### 🔐 Authentication Flow

```typescript
// lib/peak/auth.ts

export async function getPeakToken(credentials: PeakCredentials) {
  const response = await fetch('https://api.peakaccount.com/ClientToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret
    })
  });
  
  return response.json();
}
```

### 📤 Push Expense

```typescript
// lib/peak/expenses.ts

export async function pushExpenseToPeak(
  token: string,
  document: Document,
  contactId: string
) {
  // 1. Create expense
  const expense = await fetch('https://api.peakaccount.com/Expenses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contactId,
      documentDate: format(document.documentDate, 'yyyy-MM-dd'),
      items: [{
        name: document.description || 'รายจ่าย',
        quantity: 1,
        pricePerUnit: Number(document.amount),
        vatType: document.vatRate === 7 ? 'VAT7' : 'VAT0'
      }]
    })
  });
  
  const result = await expense.json();
  
  // 2. Attach image
  if (document.fileUrl) {
    await attachFileToPeak(token, result.id, document.fileUrl);
  }
  
  return result;
}

async function attachFileToPeak(token: string, expenseId: string, fileUrl: string) {
  // Download file from Supabase
  const fileResponse = await fetch(fileUrl);
  const fileBlob = await fileResponse.blob();
  
  // Upload to PEAK
  const formData = new FormData();
  formData.append('file', fileBlob, 'receipt.jpg');
  
  await fetch(`https://api.peakaccount.com/Expenses/${expenseId}/InsertFile`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
}
```

---

## 10. Development Plan

### 📅 Timeline Overview

| Sprint | Week | Focus | Hours |
|--------|------|-------|-------|
| **Sprint 1** | 1-2 | Setup + Upload + AI | 50h |
| **Sprint 2** | 3-4 | Document Library + Review | 50h |
| **Sprint 3** | 5-6 | Pending Documents + Linking | 45h |
| **Sprint 4** | 7-8 | Client Portal + LINE | 50h |
| **Sprint 5** | 9-10 | PEAK Integration | 45h |
| **Sprint 6** | 11-12 | Admin + Settings + Subscription | 50h |
| **Sprint 7** | 13 | Polish + Launch | 30h |
| **Total** | 13 weeks | | **320h** |

---

### 📅 Sprint 1: Setup + Upload + AI (Week 1-2)

| Task | Hours | Priority |
|------|-------|----------|
| Project setup (Next.js, Prisma, Supabase) | 4h | P0 |
| Auth (NextAuth, login/register) | 6h | P0 |
| Multi-tenancy (Company) | 4h | P0 |
| Role-based access (Owner/Accountant/Client) | 6h | P0 |
| Shadcn UI setup | 3h | P0 |
| Layout (Sidebar, Bottom Nav) | 4h | P0 |
| Upload Zone UI | 5h | P0 |
| File upload API | 3h | P0 |
| AI Classifier (Gemini) | 4h | P0 |
| AI OCR (Gemini) | 5h | P0 |
| Duplicate detection | 3h | P0 |
| Upload status UI | 3h | P0 |

**Deliverables:**
- [ ] User can register/login with role
- [ ] User can upload documents
- [ ] AI classifies and extracts data
- [ ] Duplicate check works

---

### 📅 Sprint 2: Document Library + Review Flow (Week 3-4)

| Task | Hours | Priority |
|------|-------|----------|
| Document grid view | 5h | P0 |
| Document card component | 3h | P0 |
| Document list view | 4h | P0 |
| Search (full-text) | 4h | P0 |
| Filters (type, month, status, client) | 5h | P0 |
| Sort options | 2h | P0 |
| **Review Queue UI** | 5h | P0 |
| **Compare View (รูป vs ข้อมูล)** | 5h | P0 |
| **Edit document data** | 4h | P0 |
| **Approve single/bulk** | 4h | P0 |
| **Reject + Request re-upload** | 4h | P0 |
| Status tracking | 3h | P0 |
| Bulk select | 2h | P0 |

**Deliverables:**
- [ ] Document library with search/filter
- [ ] Review Queue for accountants
- [ ] Compare view (image vs data)
- [ ] Approve/Reject flow works

---

### 📅 Sprint 3: Pending Documents + Linking (Week 5-6)

| Task | Hours | Priority |
|------|-------|----------|
| Pending status UI | 4h | P0 |
| Add pending items to document | 3h | P0 |
| **Pending Dashboard** | 6h | P0 |
| Days waiting calculation | 2h | P0 |
| Alert for long-waiting docs | 3h | P0 |
| **Document linking API** | 5h | P0 |
| Link documents UI | 5h | P0 |
| **AI suggest related docs** | 6h | P1 |
| Auto-resolve when doc arrives | 4h | P1 |
| Pending summary in dashboard | 3h | P0 |
| Filter by pending status | 2h | P0 |
| Bulk set pending | 2h | P1 |

**Deliverables:**
- [ ] Can set "รอใบเสร็จ/รอ 50 ทวิ" on documents
- [ ] Pending Dashboard shows all waiting items
- [ ] Can link related documents
- [ ] AI suggests related documents
- [ ] Auto-resolve when linked doc arrives

---

### 📅 Sprint 4: Client Portal + LINE (Week 7-8)

| Task | Hours | Priority |
|------|-------|----------|
| **Client Dashboard UI** | 8h | P0 |
| **Document status view (client)** | 5h | P0 |
| **Monthly summary (client)** | 4h | P0 |
| **Upload page (client)** | 4h | P0 |
| **Alerts section** | 3h | P0 |
| **Pending alerts (client)** | 3h | P0 |
| LINE webhook setup | 4h | P0 |
| LINE receive images | 5h | P0 |
| **LINE auto-reply** | 4h | P0 |
| **LINE status notifications** | 5h | P0 |
| **LINE pending reminder** | 3h | P0 |
| Link LINE user to account | 2h | P0 |

**Deliverables:**
- [ ] Client can see their dashboard
- [ ] Client sees document status
- [ ] Client sees pending items (รอใบเสร็จ)
- [ ] LINE upload works
- [ ] LINE auto-reply works
- [ ] LINE reminds about pending docs

---

### 📅 Sprint 5: PEAK Integration (Week 9-10)

| Task | Hours | Priority |
|------|-------|----------|
| PEAK connect UI | 4h | P0 |
| PEAK auth (ClientToken) | 4h | P0 |
| PEAK API client | 4h | P0 |
| Contact sync | 4h | P0 |
| Push expense | 6h | P0 |
| Push receipt | 5h | P0 |
| Attach file | 4h | P0 |
| Sync status tracking | 4h | P0 |
| Bulk sync | 4h | P0 |
| Retry failed | 3h | P1 |
| Update status after sync | 3h | P0 |

**Deliverables:**
- [ ] Connect PEAK account
- [ ] Push approved documents to PEAK
- [ ] Images attached to PEAK records
- [ ] Client sees "Synced" status

---

### 📅 Sprint 6: Admin + Settings + Subscription (Week 11-12)

| Task | Hours | Priority |
|------|-------|----------|
| **Admin Dashboard** | 6h | P0 |
| Client list + stats | 4h | P0 |
| User management | 4h | P0 |
| Team member management | 3h | P0 |
| **Settings pages** | 5h | P0 |
| Profile settings | 2h | P0 |
| Company settings | 2h | P0 |
| Notification settings | 2h | P0 |
| **Categories mapping** | 4h | P1 |
| **Client invitation flow** | 4h | P0 |
| **Subscription/Billing** | 6h | P1 |
| Omise integration | 4h | P1 |
| Usage tracking | 2h | P0 |
| **Audit log** | 4h | P1 |

**Deliverables:**
- [ ] Admin Dashboard for Owner
- [ ] Settings pages work
- [ ] Client invitation via email
- [ ] Subscription & payment works
- [ ] Audit log tracks actions

---

### 📅 Sprint 7: Polish + Launch (Week 13)

| Task | Hours | Priority |
|------|-------|----------|
| Mobile responsive fixes | 4h | P1 |
| Error handling | 3h | P0 |
| Loading states | 2h | P0 |
| Empty states | 2h | P1 |
| **Onboarding flow** | 6h | P0 |
| **Security review** | 3h | P0 |
| Testing (Unit + E2E) | 6h | P0 |
| Bug fixes | 4h | P0 |

**Deliverables:**
- [ ] Mobile-friendly
- [ ] Onboarding wizard works
- [ ] Security reviewed
- [ ] Tests pass
- [ ] Production ready
- [ ] **LAUNCH!** 🚀

---

## 11. Business Model

### 💳 Pricing Plans

| Plan | Documents/mo | Users | Price/mo |
|------|--------------|-------|----------|
| **Free** | 20 | 1 | ฿0 |
| **Starter** | 100 | 2 | ฿499 |
| **Pro** | 500 | 5 | ฿1,299 |
| **Business** | 2,000 | 15 | ฿2,999 |
| **Enterprise** | Unlimited | Unlimited | ฿7,999 |

### 📊 Revenue Projection (Year 1)

| Month | Customers | MRR |
|-------|-----------|-----|
| M3 | 15 | ฿12,000 |
| M6 | 50 | ฿50,000 |
| M9 | 100 | ฿120,000 |
| M12 | 150 | ฿180,000 |

| Metric | Year 1 |
|--------|--------|
| **Ending MRR** | ฿180,000 |
| **ARR** | ฿2.16M |
| **Total Revenue** | ~฿900K |
| **Break-even** | Month 5-6 |

### 💵 Cost Structure

| Category | Monthly |
|----------|---------|
| Supabase Pro | ฿850 |
| Vercel | ฿700 |
| Gemini API | ฿3,000 |
| Marketing | ฿10,000 |
| Support | ฿10,000 |
| **Total** | ฿24,550 |

---

## 12. Getting Started

### 🚀 Quick Start

```bash
# 1. Create project
npx create-next-app@latest flowdoc \
  --typescript --tailwind --eslint --app --src-dir

# 2. Navigate
cd flowdoc

# 3. Install dependencies
npm install @prisma/client @supabase/supabase-js \
  next-auth@beta @google/generative-ai \
  zod date-fns bcryptjs

# 4. Install dev deps
npm install -D prisma @types/bcryptjs

# 5. Setup Prisma
npx prisma init

# 6. Setup Shadcn
npx shadcn@latest init

# 7. Add components
npx shadcn@latest add button card dialog dropdown-menu \
  form input label select table tabs toast badge \
  avatar checkbox skeleton sheet scroll-area

# 8. Run migration
npx prisma migrate dev --name init

# 9. Start dev
npm run dev
```

### 📋 Environment Variables

```env
# .env

# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"

# NextAuth
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"

# Gemini
GOOGLE_GEMINI_API_KEY="xxx"

# PEAK (add later)
PEAK_API_URL="https://api.peakaccount.com"
PEAK_CLIENT_ID=""
PEAK_CLIENT_SECRET=""

# LINE (optional)
LINE_CHANNEL_SECRET=""
LINE_CHANNEL_ACCESS_TOKEN=""
```

### ✅ Launch Checklist

**Week 1-2: Setup + Upload + AI**
- [ ] Project created
- [ ] Auth working (with roles)
- [ ] Upload working
- [ ] AI processing

**Week 3-4: Document Library + Review**
- [ ] Document library
- [ ] Search & filter
- [ ] Review Queue
- [ ] Compare View
- [ ] Approve/Reject flow

**Week 5-6: Pending Documents + Linking**
- [ ] Pending status on documents
- [ ] Pending Dashboard
- [ ] Days waiting & alerts
- [ ] Document linking
- [ ] AI suggest related docs

**Week 7-8: Client Portal + LINE**
- [ ] Client Dashboard
- [ ] Client sees status + pending
- [ ] LINE receive images
- [ ] LINE auto-reply
- [ ] LINE pending reminder

**Week 9-10: PEAK Integration**
- [ ] PEAK connected
- [ ] Sync working
- [ ] Images attached
- [ ] Status updates to Client

**Week 11-12: Admin + Settings + Subscription**
- [ ] Admin Dashboard
- [ ] Client management
- [ ] Settings pages
- [ ] Categories mapping
- [ ] Subscription/payment
- [ ] Audit log

**Week 13: Polish + Launch**
- [ ] Onboarding wizard
- [ ] Security review
- [ ] Mobile ready
- [ ] Tests pass
- [ ] **LAUNCH!** 🚀

---

## 13. Security & Privacy

### 🔐 Authentication & Authorization

| Feature | Implementation |
|---------|----------------|
| **Password Hashing** | bcrypt with salt |
| **Session Management** | NextAuth.js JWT |
| **Role-based Access** | Middleware + DB check |
| **API Protection** | Bearer token + rate limiting |

### 🛡️ Data Protection

| Feature | Implementation |
|---------|----------------|
| **HTTPS** | Enforce TLS 1.3 |
| **Database Encryption** | Supabase encrypted at rest |
| **File Storage** | Supabase Storage with signed URLs |
| **Sensitive Data** | Encrypt API credentials (PEAK, LINE) |

### 📋 PDPA Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Consent** | ขอ consent ก่อนเก็บข้อมูล |
| **Data Access** | ผู้ใช้ดูข้อมูลตัวเองได้ |
| **Data Deletion** | ลบข้อมูลเมื่อร้องขอ |
| **Data Portability** | Export ข้อมูลได้ |
| **Privacy Policy** | หน้า Privacy Policy |

### 🔒 API Security

```typescript
// middleware.ts - Rate Limiting
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests/min
});

// API Route Protection
export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

---

## 14. Error Handling Strategy

### 🚨 Error Types

| Type | Example | Handling |
|------|---------|----------|
| **Validation** | ข้อมูลไม่ถูกต้อง | แสดง field error |
| **Auth** | ไม่มีสิทธิ์ | Redirect to login |
| **API** | PEAK API error | Retry + notify |
| **AI** | OCR failed | Mark for review |
| **Upload** | File too large | แสดง error message |
| **Network** | Connection lost | Retry with exponential backoff |

### 📝 Error Response Format

```typescript
// lib/api/response.ts
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Example
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลไม่ถูกต้อง",
    "details": {
      "vendorName": "กรุณาระบุชื่อร้าน"
    }
  }
}
```

### 🔄 Retry Strategy

```typescript
// lib/utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delay: number;
    backoff: number;
  }
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      await sleep(options.delay * Math.pow(options.backoff, i));
    }
  }
  
  throw lastError;
}
```

### 📊 Error Monitoring

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking + alerting |
| **Vercel Analytics** | Performance monitoring |
| **Custom Logs** | Business logic errors |

---

## 15. Testing Strategy

### 🧪 Test Types

| Type | Coverage | Tools |
|------|----------|-------|
| **Unit Tests** | Utils, Validators | Vitest |
| **Integration Tests** | API Routes | Vitest + MSW |
| **E2E Tests** | Critical flows | Playwright |
| **Component Tests** | UI Components | Vitest + Testing Library |

### 📁 Test Structure

```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── ai/classifier.test.ts
│   │   ├── ai/ocr.test.ts
│   │   └── validations.test.ts
│   └── utils/
│       └── format.test.ts
├── integration/
│   ├── api/
│   │   ├── documents.test.ts
│   │   ├── auth.test.ts
│   │   └── sync.test.ts
│   └── hooks/
│       └── use-documents.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── upload.spec.ts
    ├── review.spec.ts
    └── sync.spec.ts
```

### ✅ Test Coverage Goals

| Area | Target |
|------|--------|
| **Utils/Validators** | 90% |
| **API Routes** | 80% |
| **AI Processing** | 70% |
| **UI Components** | 60% |
| **E2E Critical Paths** | 100% |

### 🔄 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
```

---

## 16. Onboarding Flow

### 👋 New User (Owner) Onboarding

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: สร้างบัญชี                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ยินดีต้อนรับสู่ FlowDoc! 👋                                │
│                                                             │
│  ชื่อ-นามสกุล: [                           ]               │
│  อีเมล: [                                  ]               │
│  รหัสผ่าน: [                               ]               │
│                                                             │
│                              [สร้างบัญชี]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: ข้อมูลสำนักงานบัญชี                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ชื่อสำนักงาน: [                           ]               │
│  เลขผู้เสียภาษี: [                         ]               │
│  โลโก้: [อัปโหลด]                                          │
│                                                             │
│                              [ถัดไป]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: เชื่อมต่อระบบบัญชี                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  เลือกระบบบัญชีที่ใช้:                                      │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  PEAK   │ │FlowAcct │ │ Express │ │ข้ามไป   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: เพิ่มลูกค้าแรก                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ชื่อบริษัทลูกค้า: [                       ]               │
│  เลขผู้เสียภาษี: [                         ]               │
│                                                             │
│  ☑️ เชิญลูกค้าเข้าใช้งาน (ส่ง email)                        │
│                                                             │
│                              [เพิ่มลูกค้า]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: ตั้งค่า LINE (Optional)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  เชื่อมต่อ LINE OA เพื่อรับเอกสารจากลูกค้า                   │
│                                                             │
│  [ดูวิธีตั้งค่า]  [เชื่อมต่อ LINE]  [ข้ามไป]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  🎉 พร้อมใช้งาน!                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ขั้นตอนต่อไป:                                              │
│  ✅ อัปโหลดเอกสารทดสอบ                                      │
│  ✅ ตรวจสอบข้อมูลที่ AI อ่าน                                │
│  ✅ Sync เข้าระบบบัญชี                                      │
│                                                             │
│                              [เริ่มใช้งาน]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 👤 Client Invitation Flow

```
1. นักบัญชีกด "เชิญลูกค้า"
   ↓
2. ใส่ Email/เบอร์โทร ของลูกค้า
   ↓
3. ระบบส่ง Email/LINE พร้อม invitation link
   ↓
4. ลูกค้าคลิก link → สร้างรหัสผ่าน
   ↓
5. ลูกค้าเข้าสู่ Client Portal
```

---

## 17. Payment & Subscription

### 💳 Payment Provider

| Option | Pros | Cons |
|--------|------|------|
| **Stripe** | Global, Easy | ค่าธรรมเนียมสูง |
| **Omise** | Thai-focused | Limited features |
| **2C2P** | Thai banks | Complex integration |

**Recommendation:** ใช้ **Omise** สำหรับตลาดไทย

### 📊 Subscription Schema

```prisma
model Subscription {
  id          String   @id @default(cuid())
  companyId   String   @unique
  company     Company  @relation(fields: [companyId], references: [id])
  
  plan        Plan     @default(FREE)
  status      SubscriptionStatus @default(ACTIVE)
  
  // Limits
  documentsLimit    Int
  usersLimit        Int
  
  // Usage
  documentsUsed     Int @default(0)
  
  // Billing
  billingCycle      BillingCycle @default(MONTHLY)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  
  // Payment
  omiseCustomerId   String?
  omiseCardId       String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Plan {
  FREE
  STARTER
  PRO
  BUSINESS
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  PAUSED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}
```

### 💵 Plan Limits

```typescript
const PLAN_LIMITS = {
  FREE: { documents: 20, users: 1, clients: 1 },
  STARTER: { documents: 100, users: 2, clients: 5 },
  PRO: { documents: 500, users: 5, clients: 20 },
  BUSINESS: { documents: 2000, users: 15, clients: 50 },
  ENTERPRISE: { documents: Infinity, users: Infinity, clients: Infinity },
};
```

### 🔄 Subscription Flow

```
1. User ใช้ Free plan
   ↓
2. ถึง limit (20 docs/month)
   ↓
3. แสดง Upgrade modal
   ↓
4. เลือก Plan → กรอกบัตร
   ↓
5. Omise charge → Subscription created
   ↓
6. ใช้งานต่อได้
```

---

## 18. Backup & Recovery

### 💾 Backup Strategy

| Data | Method | Frequency |
|------|--------|-----------|
| **Database** | Supabase auto backup | Daily |
| **Files** | Supabase Storage | Real-time replication |
| **Credentials** | Encrypted in DB | With DB backup |

### 🔄 Disaster Recovery

| Scenario | Recovery |
|----------|----------|
| **DB Corruption** | Restore from Supabase backup |
| **File Loss** | Restore from Supabase Storage |
| **Region Outage** | Supabase multi-region |
| **Account Deletion** | 30-day soft delete |

### 📋 Data Retention

| Data | Retention |
|------|-----------|
| **Documents** | 7 ปี (ตามกฎหมาย) |
| **Audit Logs** | 2 ปี |
| **Deleted Items** | 30 วัน (soft delete) |
| **Session Logs** | 90 วัน |

---

## 19. Categories Mapping

### 📊 Map กับระบบบัญชี

```
┌─────────────────────────────────────────────────────────────┐
│  ตั้งค่าหมวดหมู่                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔗 PEAK Account                            [ดึงหมวดหมู่]   │
│                                                             │
│  FlowDoc หมวดหมู่        →    PEAK หมวดหมู่                 │
│  ─────────────────────────────────────────────────────────  │
│  ค่าน้ำมัน               →    [5201 ค่าน้ำมัน        ▼]    │
│  ค่าอาหาร               →    [5202 ค่ารับรอง        ▼]    │
│  ค่าเดินทาง              →    [5203 ค่าเดินทาง       ▼]    │
│  ค่าสาธารณูปโภค          →    [5204 ค่าสาธารณูปโภค   ▼]    │
│  ค่าเช่า                →    [5205 ค่าเช่า          ▼]    │
│  อื่นๆ                  →    [5299 ค่าใช้จ่ายอื่น    ▼]    │
│                                                             │
│  [+ เพิ่มหมวดหมู่]                           [บันทึก]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📝 Category Schema

```prisma
model Category {
  id          String   @id @default(cuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  
  name        String
  type        CategoryType
  
  // Mapping
  peakAccountCode     String?
  flowaccountCode     String?
  
  isDefault   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  
  @@unique([companyId, name])
}

enum CategoryType {
  EXPENSE
  INCOME
}
```

---

## 20. Deployment Guide

### 🚀 Deployment Options

| Platform | Pros | Cons |
|----------|------|------|
| **Vercel** | Easy, Auto-scale | ราคาสูงถ้า traffic เยอะ |
| **Railway** | Cheap, Simple | Less features |
| **DigitalOcean App** | Fixed price | Manual setup |

**Recommendation:** ใช้ **Vercel** สำหรับ simplicity

### 📋 Deployment Checklist

```
Pre-deployment:
☐ Environment variables set
☐ Database migrated
☐ Supabase storage configured
☐ PEAK API credentials
☐ LINE Bot configured
☐ Omise keys set

Post-deployment:
☐ Health check endpoint works
☐ Auth flow works
☐ Upload works
☐ AI processing works
☐ PEAK sync works
☐ LINE webhook works
```

### 🔧 Environment Variables (Production)

```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# NextAuth
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="https://flowdoc.app"

# AI
GOOGLE_GEMINI_API_KEY="xxx"

# PEAK
PEAK_API_URL="https://api.peakaccount.com"

# LINE
LINE_CHANNEL_SECRET="xxx"
LINE_CHANNEL_ACCESS_TOKEN="xxx"

# Payment
OMISE_PUBLIC_KEY="xxx"
OMISE_SECRET_KEY="xxx"

# Monitoring
SENTRY_DSN="xxx"
```

---

## 📞 Summary

### FlowDoc คืออะไร?

> **ระบบจัดการเอกสารทางบัญชี ที่แทนการเก็บในโฟลเดอร์**
> 
> **พร้อม Client Portal + ติดตามเอกสารที่ยังไม่ครบ**

### ทำไมต้องใช้?

**สำหรับนักบัญชี:**
| เดิม | FlowDoc |
|------|---------|
| หาเอกสารยาก | ค้นหาได้ทันที |
| เปิดดูทีละไฟล์ | AI อ่านให้ |
| คีย์เข้า PEAK เอง | กดปุ่มเดียว Sync |
| ตามเอกสารเอง | ลูกค้าส่งมาเอง + แจ้งเตือนอัตโนมัติ |
| **ไม่รู้ว่ายังขาดอะไร** | **Pending Dashboard บอกให้** |

**สำหรับลูกค้า:**
| เดิม | FlowDoc |
|------|---------|
| ส่ง LINE แล้วไม่รู้ว่าถึงหรือยัง | เห็นสถานะทันที |
| ไม่รู้ว่าต้องส่งอะไร | มี Dashboard สรุป |
| ต้องถามนักบัญชี | ดูเองได้ |
| **ลืมส่งใบเสร็จตามมา** | **LINE เตือนอัตโนมัติ** |

### Flow หลัก

```
ลูกค้าส่งบิล → AI อ่าน → นักบัญชี Review → Approve → Sync to PEAK
      ↓            ↓              ↓           ↓            ↓
   "ได้รับแล้ว"  "รอตรวจ"     "ตรวจแล้ว"   "ผ่านแล้ว"   "Sync แล้ว"
                                   ↓
                          ⏳ ถ้ายังไม่ครบ:
                          "รอใบเสร็จ" / "รอ 50 ทวิ"
                                   ↓
                          LINE เตือนลูกค้าอัตโนมัติ
```

### User Roles

| Role | ใช้งาน |
|------|--------|
| **Accountant** | Review, Approve, Sync, ดูทุก Client, Pending Dashboard |
| **Client** | ส่งเอกสาร, ดู Dashboard, เห็น Pending Alerts |

### Core Features

| Module | Description |
|--------|-------------|
| 📤 Upload | Drag & Drop, LINE, Camera |
| 🤖 AI | จำแนกประเภท, OCR, ตรวจซ้ำ |
| ✅ Review | Compare View, Approve/Reject |
| ⏳ Pending | ติดตามเอกสารที่ยังไม่ครบ |
| 🔗 Linking | จับคู่เอกสารที่เกี่ยวข้อง |
| 👤 Client Portal | Dashboard สำหรับลูกค้า |
| 💬 LINE | Auto-reply, Status notify, Remind |
| 🚀 PEAK Sync | Push เข้า PEAK + แนบรูป |
| 🏢 **Admin** | Dashboard, Client/User Management |
| ⚙️ **Settings** | Profile, Notifications, Integrations |
| 💳 **Subscription** | Plans, Payment, Usage tracking |
| 📋 **Audit Log** | Track all actions |
| 🔐 **Security** | PDPA, Encryption, Rate limiting |

### Timeline

**13 สัปดาห์ → 320 ชั่วโมง → พร้อม Launch!**

| Sprint | Week | Focus |
|--------|------|-------|
| 1 | 1-2 | Setup + Upload + AI |
| 2 | 3-4 | Document Library + Review |
| 3 | 5-6 | Pending + Linking |
| 4 | 7-8 | Client Portal + LINE |
| 5 | 9-10 | PEAK Integration |
| 6 | 11-12 | **Admin + Settings + Subscription** ⭐ |
| 7 | 13 | Polish + Launch |

---

**Ready to build! 🚀**

*Document Version: 3.0 (Full Features)*  
*Path: `FlowDoc-Plan-v2.md`*
