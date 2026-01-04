import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { LandingPage } from "@/components/landing-page";
import { CreateCompanyDialog } from "@/components/create-company-dialog";

export default async function HomePage() {
  const session = await auth();

  // If not logged in, show landing page
  if (!session?.user) {
    return <LandingPage />;
  }

  // Get user's companies
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      companies: {
        include: {
          company: true,
        },
      },
    },
  });

  // If user is admin, get all companies (admin has owner access to all)
  const companies =
    session.user.role === "ADMIN"
      ? (await prisma.company.findMany({ orderBy: { name: "asc" } })).map((c) => ({ ...c, isOwner: true, permissions: [] }))
      : user?.companies.map((c: NonNullable<typeof user>["companies"][number]) => ({ ...c.company, isOwner: c.isOwner, permissions: c.permissions })) ?? [];

  // If no companies, show setup page with create company option
  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            ยินดีต้อนรับ, {session.user.name}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            คุณยังไม่มีบริษัท เริ่มต้นสร้างบริษัทแรกของคุณเลย!
          </p>
          <CreateCompanyDialog>
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 transition-all duration-200">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              สร้างบริษัทใหม่
            </button>
          </CreateCompanyDialog>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            หรือติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึงบริษัทที่มีอยู่แล้ว
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show company selector
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] dark:opacity-40" />

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-6 shadow-lg shadow-emerald-500/20">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3">
            Bill Tracker
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            สวัสดี, {session.user.name} - เลือกบริษัท
          </p>
          <div className="mt-6">
            <CreateCompanyDialog>
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 transition-all duration-200">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                สร้างบริษัทใหม่
              </button>
            </CreateCompanyDialog>
          </div>
        </div>

        {/* Company Cards */}
        <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
          {companies.map((company: typeof companies[number]) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bill Tracker & Mini-ERP System
          </p>
        </div>
      </div>
    </div>
  );
}

function CompanyCard({
  company,
}: {
  company: { id: string; name: string; code: string; isOwner?: boolean; permissions?: unknown };
}) {
  const isAnajak = company.code === "ANJ";
  const isMeelike = company.code === "MLK";

  return (
    <a
      href={`/${company.code.toLowerCase()}/dashboard`}
      className="group block"
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl p-6 sm:p-8
          border-2 border-transparent
          transition-all duration-300
          hover:shadow-2xl hover:-translate-y-1
          ${isAnajak 
            ? "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 hover:border-blue-500/50" 
            : isMeelike 
            ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10 hover:border-orange-500/50"
            : "bg-gradient-to-br from-slate-500/10 to-slate-600/10 hover:border-slate-500/50"
          }
        `}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Icon */}
          <div
            className={`
              flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
              flex items-center justify-center shadow-xl
              ${isAnajak 
                ? "bg-gradient-to-br from-blue-500 to-indigo-600" 
                : isMeelike 
                ? "bg-gradient-to-br from-orange-500 to-amber-500"
                : "bg-gradient-to-br from-slate-500 to-slate-600"
              }
            `}
          >
            {isAnajak ? (
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ) : isMeelike ? (
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              {company.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              รหัส: {company.code}
            </p>
            {company.isOwner && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                เจ้าของ
              </span>
            )}
          </div>

          {/* Arrow */}
          <svg
            className="w-6 h-6 text-slate-400 transition-transform duration-300 group-hover:translate-x-2 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  );
}
