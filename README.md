# SlipSync - AI จัดการสลิป & บัญชี

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Supabase-green?logo=supabase" alt="Supabase"/>
</div>

## 📋 เกี่ยวกับโปรเจค

SlipSync เป็นระบบจัดการสลิปและบัญชีอัจฉริยะด้วย AI สำหรับ CEO และทีมบัญชี ออกแบบมาเพื่อ:

- ✅ ลดภาระ CEO ในการส่งสลิปและอธิบายค่าใช้จ่าย
- ✅ ป้องกันข้อมูลค่าใช้จ่ายตกหล่น
- ✅ เชื่อมการทำงานระหว่าง CEO ↔ ฝ่ายบัญชีแบบ Real-time
- ✅ สร้างข้อมูล Pre-Accounting ที่พร้อมใช้งาน

## 🚀 ฟีเจอร์หลัก

### สำหรับ CEO
- 📸 อัปโหลดสลิปได้ทั้งรูปภาพและ PDF
- 🤖 AI อ่านข้อมูลจากสลิปอัตโนมัติ (ร้านค้า, วันที่, จำนวนเงิน, VAT)
- ✏️ แก้ไขข้อมูลได้ก่อนยืนยัน
- 📊 Dashboard ดูภาพรวมค่าใช้จ่าย

### สำหรับทีมบัญชี
- 🔔 รับแจ้งเตือนรายการใหม่
- ✅ ตรวจสอบและอนุมัติรายการ
- 🏷️ จัดหมวดหมู่ค่าใช้จ่าย
- 📤 Export ข้อมูลเพื่อปิดงบ

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Storage) + Prisma ORM (Database)
- **Database**: PostgreSQL (Supabase)
- **AI/OCR**: OpenAI Vision API (พร้อมเชื่อมต่อ)
- **Integration**: Line Messaging API (พร้อมเชื่อมต่อ)

## 📦 การติดตั้ง

### 1. Clone โปรเจค

```bash
git clone https://github.com/your-repo/slipsync.git
cd slipsync
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` จากตัวอย่าง:

```bash
cp env.example .env.local
```

แก้ไขค่าใน `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI/OCR Configuration (Optional)
OPENAI_API_KEY=your-openai-api-key

# Line Integration (Optional)
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

### 4. ตั้งค่า Supabase & Prisma

1. สร้างโปรเจคใหม่ที่ [supabase.com](https://supabase.com)
2. ไปที่ Settings > Database และคัดลอก Connection strings
3. สร้าง Storage Bucket ชื่อ `receipts`
4. คัดลอก URL และ Anon Key มาใส่ใน `.env.local`

### 5. รัน Prisma Migration

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# หรือสร้าง migration (production)
npx prisma migrate dev --name init
```

### 6. เปิด Prisma Studio (Optional)

```bash
npx prisma studio
```

### 7. รัน Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์

## 📁 โครงสร้างโปรเจค

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # หน้า Authentication
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/         # หน้า Dashboard (Protected)
│   │   ├── upload/        # อัปโหลดสลิป
│   │   ├── receipts/      # รายการสลิป
│   │   └── settings/      # ตั้งค่า
│   └── api/               # API Routes
├── components/            # React Components
│   ├── ui/               # UI Components (Button, Card, etc.)
│   ├── navigation.tsx    # Navigation Component
│   └── receipt-upload.tsx # Upload Component
├── lib/                   # Utility Functions
│   ├── supabase/         # Supabase Client (Auth)
│   ├── prisma.ts         # Prisma Client Instance
│   ├── db.ts             # Database Helper Functions
│   └── utils.ts          # Helper Functions
└── types/                 # TypeScript Types
    └── database.ts       # Database Types

prisma/
├── schema.prisma         # Prisma Schema
└── migrations/           # Database Migrations

supabase/
└── schema.sql            # Legacy SQL Schema (reference)
```

## 🔐 Database Schema

### Tables
- `companies` - ข้อมูลบริษัท
- `profiles` - ข้อมูลผู้ใช้ (extends auth.users)
- `expense_categories` - หมวดหมู่ค่าใช้จ่าย
- `receipts` - ข้อมูลสลิป
- `pre_accounting_entries` - รายการ Pre-Accounting

### Row Level Security (RLS)
- ข้อมูลแยกตามบริษัท
- ผู้ใช้เห็นเฉพาะข้อมูลของบริษัทตัวเอง

## 🎨 UI/UX

- **Mobile-first** design
- **Dark theme** พร้อม Emerald/Teal accent
- **Glass morphism** effects
- **Responsive** สำหรับทุกขนาดหน้าจอ
- **Thai language** support

## 📱 Progressive Web App (PWA)

รองรับการติดตั้งเป็นแอปบนมือถือ (Coming soon)

## 🔮 Roadmap

### Phase 1: MVP ✅
- [x] อัปโหลดสลิป
- [x] AI อ่านข้อมูล (Mock)
- [x] Dashboard
- [x] Authentication

### Phase 2: Smart AI
- [ ] เชื่อมต่อ OpenAI Vision API
- [ ] เรียนรู้ร้านประจำ
- [ ] แนะนำหมวดแม่นขึ้น

### Phase 3: Integration
- [ ] Line Messaging API
- [ ] แจ้งเตือนทีมบัญชี
- [ ] Export รายงาน

### Phase 4: SaaS
- [ ] Multi-company
- [ ] Subscription billing
- [ ] Advanced analytics

## 📄 License

MIT License - ดู [LICENSE](LICENSE) สำหรับรายละเอียด

## 🤝 Contributing

ยินดีรับ Pull Requests! กรุณาอ่าน [CONTRIBUTING.md](CONTRIBUTING.md) ก่อน

## 📞 Contact

- 📧 Email: support@slipsync.app
- 🌐 Website: https://slipsync.app
