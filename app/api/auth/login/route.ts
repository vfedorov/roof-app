import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    const { email, password } = await req.json();

    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

    if (!user || error) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set("session", user.id, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true });
}
