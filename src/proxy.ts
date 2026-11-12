import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionValue } from "@/lib/session";

// Barrière en amont du rendu : aucune route /admin n'est exécutée sans session valide.
// Les pages et actions admin gardent leur propre requireAdmin() (défense en profondeur).
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (isValidSessionValue(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
