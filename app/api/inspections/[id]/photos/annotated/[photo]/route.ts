import { supabaseServer } from "@/lib/supabase-server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: any) {
    const { id, photo } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const path = `inspections/${id}/annotated/${photo}`;

    const { error } = await supabaseServer.storage.from("inspection-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: true, // overwrite previous annotation
        contentType: file.type,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
