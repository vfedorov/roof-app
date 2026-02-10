import { supabaseServer } from "@/lib/supabase/supabase-server";
import { supabaseAdmin } from "@/lib/supabase/supabase-admin";
import { type NextRequest, NextResponse } from "next/server";

const BUCKET = "measurement-images";
const PATH_PREFIX = "/storage/v1/object/public";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing measurement session ID" }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
        return NextResponse.json({ error: "No files attached" }, { status: 400 });
    }

    for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Unsupported file type: ${file.type}` },
                { status: 400 },
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
                { status: 400 },
            );
        }

        const filename = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const path = `measurements/${id}/original/${filename}`;

        const publicUrl =
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}` + `${PATH_PREFIX}/${BUCKET}/${path}`;

        const { data: imageRecord, error: insertError } = await supabaseAdmin
            .from("measurement_images")
            .insert({
                measurement_session_id: id,
                image_url: publicUrl,
                is_base_image: false,
            });

        if (insertError) {
            return NextResponse.json(
                { error: `Database insert failed: ${insertError.message}` },
                { status: 500 },
            );
        }

        const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
            cacheControl: "0",
            upsert: false,
            contentType: file.type,
        });

        if (uploadError) {
            return NextResponse.json(
                { error: `Upload failed: ${uploadError.message}` },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing measurement session ID" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
        .from("measurement_images")
        .select("*")
        .eq("measurement_session_id", id)
        .order("is_base_image", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

export async function DELETE(request: NextRequest, context: any) {
    const { id } = await context.params;

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("image_id");

    if (!id || !imageId) {
        return NextResponse.json(
            { error: "Missing measurement session ID or image ID" },
            { status: 400 },
        );
    }

    // Получаем запись из БД
    const { data: imageRecord, error: fetchError } = await supabaseServer
        .from("measurement_images")
        .select("image_url, is_base_image")
        .eq("id", imageId)
        .eq("measurement_session_id", id)
        .single();

    if (fetchError || !imageRecord) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageUrl = imageRecord.image_url;
    const filePath = imageUrl.replace(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}${PATH_PREFIX}/${BUCKET}/`,
        "",
    );

    const { error: deleteError } = await supabaseAdmin.storage.from(BUCKET).remove([filePath]);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin
        .from("measurement_images")
        .delete()
        .eq("id", imageId)
        .eq("measurement_session_id", id);

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
