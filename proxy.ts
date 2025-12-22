import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

// This function runs for all matched routes
export async function proxy(request: NextRequest) {
    const url = request.nextUrl;
    const pathname = url.pathname;

    const user = await getUser();
    const isLogin = pathname.startsWith("/login");

    console.log("🔍 Proxy active:", pathname, "user:", user?.id);

    // Not logged in → redirect
    if (!user && !isLogin) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Logged in but trying to visit login → redirect
    if (user && isLogin) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin-only routes
    const adminOnly = ["/users", "/properties/new", "/users/new"];
    if (adminOnly.some((u) => pathname.startsWith(u)) && user.role !== USER_ROLES.ADMIN) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// Only protect application pages — NOT images, NOT public files
export const config = {
    matcher: ["/dashboard/:path*", "/inspections/:path*", "/properties/:path*", "/users/:path*"],
};
