import { supabaseAdmin } from "@/lib/supabase/supabase-admin";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing measurement session ID" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from("measurement_images")
        .update({ is_base_image: false })
        .eq("measurement_session_id", id)
        .eq("is_base_image", true);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
