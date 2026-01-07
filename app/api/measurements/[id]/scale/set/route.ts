import { supabaseAdmin } from "@/lib/supabase/supabase-admin";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    const body = await request.json();
    const { scale, scale_points } = body;

    if (typeof scale !== "number" || !Array.isArray(scale_points)) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from("measurement_sessions")
        .update({ scale, scale_points })
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
