import { supabaseServer } from "@/lib/supabase/supabase-server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing measurement session ID" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
        .from("measurement_sessions")
        .select("scale, scale_points")
        .eq("id", id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
