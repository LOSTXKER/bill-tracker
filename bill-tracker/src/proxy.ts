import { NextResponse, type NextRequest } from "next/server";

// Named export as required by Next.js 16
export function proxy(request: NextRequest) {
  // Simple pass-through proxy
  // Auth is handled in individual pages and API routes
  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
