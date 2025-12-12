import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

// The *function* Next.js expects:
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

    // Logged in → prevent visiting login page
    if (user && isLogin) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin-only pages
    const adminOnly = ["/users", "/properties/new", "/users/new"];
    if (adminOnly.some((u) => pathname.startsWith(u)) && user.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// The *matcher* must be exported as `config`
export const config = {
    matcher: ["/((?!_next|api|favicon\\.ico).*)"],
};
