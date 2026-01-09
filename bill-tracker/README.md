# Bill Tracker & Mini-ERP

ระบบจัดการเอกสารบัญชี รายรับ-รายจ่าย และภาษีหัก ณ ที่จ่าย สำหรับธุรกิจ SME

## Features

- 📝 บันทึกรายรับ-รายจ่ายพร้อมคำนวณ VAT และภาษีหัก ณ ที่จ่ายอัตโนมัติ
- 📄 ติดตามสถานะเอกสาร (รอใบเสร็จ, รอส่งบัญชี, ส่งแล้ว)
- 📊 รายงานภาษี VAT (ภ.พ.30) และ WHT (ภ.ง.ด.53/54)
- 📈 Charts และ Dashboard แสดงภาพรวมธุรกิจ
- 📱 รองรับการใช้งานบนมือถือ (Mobile First)
- 🔔 แจ้งเตือนผ่าน LINE Notify
- 📤 Export รายงานเป็น Excel

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: NextAuth.js v5
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase account)
- LINE Notify token (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/bill-tracker.git
cd bill-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

4. Generate Prisma client and push schema:
```bash
npm run db:generate
npm run db:push
```

5. Seed the database (optional):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

After seeding the database:
- **Admin**: admin@billtracker.com / admin123
- **Demo User**: demo@billtracker.com / demo1234

## Project Structure

```
bill-tracker/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (auth)/          # Authentication pages
│   │   ├── [company]/       # Company-specific pages
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── forms/           # Form components
│   │   ├── dashboard/       # Dashboard components
│   │   └── charts/          # Chart components
│   ├── lib/                 # Utility functions
│   │   ├── auth.ts          # Auth utilities
│   │   ├── db.ts            # Prisma client
│   │   ├── validations/     # Zod schemas
│   │   ├── utils/           # Tax calculations, formatters
│   │   └── notifications/   # LINE Notify
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript types
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
├── public/                  # Static files
└── __tests__/              # Test files
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with demo data

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# LINE Notify (optional)
LINE_NOTIFY_TOKEN=""
```

## Documentation

Additional documentation can be found in the `/docs` folder:

- **[REFACTORING_GUIDE.md](docs/REFACTORING_GUIDE.md)** - Refactoring patterns and best practices
- **[REFACTORING_PROGRESS.md](docs/REFACTORING_PROGRESS.md)** - Complete refactoring history and stats
- **[CLEANUP_GUIDE.md](docs/CLEANUP_GUIDE.md)** - Database cleanup and migration guide
- **[MIGRATION_DEPRECATED_FIELDS.md](docs/MIGRATION_DEPRECATED_FIELDS.md)** - Deprecated fields migration steps
- **[REIMBURSEMENT_CONSOLIDATION_PLAN.md](docs/REIMBURSEMENT_CONSOLIDATION_PLAN.md)** - Reimbursement systems consolidation plan

Other guides:
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[PERMISSIONS_IMPLEMENTATION.md](PERMISSIONS_IMPLEMENTATION.md)** - Permission system documentation
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Supabase storage setup guide

## License

MIT License

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

---

Built with ❤️ for Thai SME businesses
