import type { ProxyConfig } from "next/server";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

// Paths that require the proxy logic.
// This replaces middleware's `config.matcher`.
export const proxy: ProxyConfig = {
    matcher: ["/((?!_next|api|favicon\\.ico).*)"],
};

export default async function handler(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // getUser() must be run inside the proxy handler:
    const user = await getUser();

    const isLogin = pathname.startsWith("/login");

    // Not logged in → redirect to login
    if (!user && !isLogin) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Logged in but trying to visit login page → redirect home
    if (user && isLogin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only pages
    const adminOnly = ["/users", "/properties/new", "/users/new"];
    if (adminOnly.some((u) => pathname.startsWith(u)) && user.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Otherwise allow request
    return NextResponse.next();
}
