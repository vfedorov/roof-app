import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function middleware(req: NextRequest) {
    const user = await getUser();
    const url = req.nextUrl.pathname;

    const isLogin = url.startsWith("/login");

    if (!user && !isLogin) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (user && isLogin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const adminOnly = ["/users", "/properties/new", "/users/new"];

    if (adminOnly.some((u) => url.startsWith(u)) && user.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|api|favicon.ico).*)"],
};
