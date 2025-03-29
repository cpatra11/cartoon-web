import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Instead of using the full auth() function which tries to use Prisma in edge,
  // we'll use getToken which is safer for middleware
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // If the user is trying to access the homepage or sign-in page and is already authenticated,
  // redirect them to the dashboard
  if (token && (pathname === "/" || pathname === "/sign-in")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If the user is trying to access protected routes without authentication,
  // redirect them to sign-in
  if (
    !token &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/profile"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in"; // Changed from "/login" to "/sign-in"
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Add routes you want middleware to run on
    "/",
    "/sign-in",
    "/dashboard/:path*",
    "/profile/:path*",
    // Add any other paths you want to protect
  ],
};
