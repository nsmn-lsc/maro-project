import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "./src/lib/authToken";

function requiredLevel(pathname: string): number | null {
  if (pathname.startsWith("/estatal") || pathname.startsWith("/colegiados")) return 3;
  if (pathname.startsWith("/region")) return 2;
  if (pathname.startsWith("/dashboard")) return 1;
  if (pathname.startsWith("/pacientes")) return 1;
  if (pathname.startsWith("/puerperio")) return 1;
  return null;
}

function redirectByLevel(req: NextRequest, nivel: number) {
  if (nivel >= 3) return NextResponse.redirect(new URL("/estatal", req.url));
  if (nivel >= 2) return NextResponse.redirect(new URL("/region", req.url));
  if (nivel >= 1) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.redirect(new URL("/inicial", req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/inicial", req.url));
  }

  const session = await verifyAuthToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/inicial", req.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (session.mustChangePassword && pathname !== "/cambiar-password") {
    return NextResponse.redirect(new URL("/cambiar-password", req.url));
  }

  const minLevel = requiredLevel(pathname);
  if (minLevel !== null && session.nivel < minLevel) {
    return redirectByLevel(req, session.nivel);
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pacientes/:path*",
    "/puerperio/:path*",
    "/region/:path*",
    "/estatal/:path*",
    "/colegiados/:path*",
    "/cambiar-password",
  ],
};
