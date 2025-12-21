import { supabaseServer } from "@/lib/supabase-server";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, context: any) {
    const { id, photo } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const path = `inspections/${id}/annotated/${photo}`;

    const { error: uploadError } = await supabaseServer.storage
        .from("inspection-photos")
        .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type,
        });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const publicUrl =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}` +
        `/storage/v1/object/public/inspection-photos/${path}`;

    const { error: dbError } = await supabaseAdmin
        .from("inspection_images")
        .update({ annotated_image_url: publicUrl })
        .eq("id", photo)
        .eq("inspection_id", id);

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
