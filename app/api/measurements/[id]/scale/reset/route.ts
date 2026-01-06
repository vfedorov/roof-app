import { supabaseAdmin } from "@/lib/supabase/supabase-admin";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing measurement session ID" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from("measurement_sessions")
        .update({ scale: null, scale_points: null })
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
