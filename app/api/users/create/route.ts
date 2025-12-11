import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";

export async function POST(req: Request) {
    const currentUser = await getUser();

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, email, password, role } = await req.json();

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("users").insert({
        name,
        email,
        password_hash,
        role,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
}
