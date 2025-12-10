// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const session = req.cookies.get("session")?.value;
    const { pathname } = req.nextUrl;

    const isLoginPage = pathname.startsWith("/login");

    if (!session && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (session && isLoginPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|api|favicon.ico).*)"],
};
