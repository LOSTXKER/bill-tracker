# Bill Tracker — Accounting & Tax System

## Project
ระบบบันทึกรายรับ-รายจ่ายพร้อมคำนวณ VAT และ WHT อัตโนมัติ สำหรับธุรกิจ SME

## Business
Personal (ใช้ร่วมกัน Anajak + Meelike)

## Stack
- Framework: Next.js 16 (App Router), TypeScript
- Database: PostgreSQL (Supabase) + Prisma ORM
- Auth: NextAuth v5
- Styling: Tailwind CSS + shadcn/ui
- Charts: Recharts
- Export: ExcelJS

## How to Run
```bash
npm install
# set .env.local (Supabase creds)
npm run db:push
npm run dev    # http://localhost:3000
```

## Key Files
- `prisma/schema.prisma` — Expense/Income models + VAT/WHT fields
- `src/app/(auth)` — Authentication pages
- `src/app/[company]` — Company-specific dashboard
- `src/lib/utils/tax-calculations.ts` — VAT/WHT logic

## Current Status
- ✅ Phase 1-2 complete
- 🚧 Phase 3 (payroll) pending
