import { supabaseAdmin } from "@/lib/supabase/supabase-admin";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: any) {
    const { id, imageId } = await context.params;

    if (!id || !imageId) {
        return NextResponse.json({ error: "Missing ID or image ID" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from("measurement_images")
        .update({ is_base_image: true })
        .eq("id", imageId)
        .eq("measurement_session_id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
