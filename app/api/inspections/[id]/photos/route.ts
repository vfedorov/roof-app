import { supabaseServer } from "@/lib/supabase/supabase-server";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase-admin";

const BUCKET = "inspection-photos";
const PATH_PREFIX = "/storage/v1/object/public";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing inspection ID" }, { status: 400 });
    }

    const formData = await request.formData();
    const section_id = formData.get("section_id") as string | null;

    if (!section_id) {
        return NextResponse.json({ error: "Missing section_id" }, { status: 400 });
    }
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
        return NextResponse.json({ error: "No files attached" }, { status: 400 });
    }

    for (const file of files) {
        const filename = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const path = `inspections/${id}/original/${filename}`;

        const publicUrl =
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}` + `${PATH_PREFIX}/${BUCKET}/${path}`;

        await supabaseAdmin.from("inspection_images").insert({
            inspection_id: id,
            section_id,
            image_url: publicUrl,
        });

        const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
            cacheControl: "0",
            upsert: false,
            contentType: file.type,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest, context: any) {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const section_id = searchParams.get("section_id");
    const photo_id = searchParams.get("photo_id");

    if (photo_id) {
        const { data, error } = await supabaseServer
            .from("inspection_images")
            .select("id, image_url, annotated_image_url")
            .eq("id", photo_id)
            .eq("inspection_id", id)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: "Photo not found" }, { status: 404 });
        }

        const result = [];

        if (data.image_url) {
            result.push({
                name: data.id,
                kind: "original",
                url: data.image_url,
            });
        }

        if (data.annotated_image_url) {
            result.push({
                name: data.id,
                kind: "annotated",
                url: data.annotated_image_url,
            });
        }

        return NextResponse.json(result);
    }

    if (!id || !section_id) {
        return NextResponse.json({ error: "Missing inspection id or section_id" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
        .from("inspection_images")
        .select("id, image_url, annotated_image_url")
        .eq("inspection_id", id)
        .eq("section_id", section_id)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const photos: {
        name: string;
        kind: "original" | "annotated";
        url: string;
    }[] = [];

    data?.forEach((row) => {
        // original
        if (row.image_url) {
            photos.push({
                name: row.id, // use DB id as stable identifier
                kind: "original",
                url: row.image_url,
            });
        }

        // annotated
        if (row.annotated_image_url) {
            photos.push({
                name: row.id,
                kind: "annotated",
                url: row.annotated_image_url,
            });
        }
    });

    return NextResponse.json(photos);
}

export async function DELETE(request: NextRequest, context: any) {
    const { id } = await context.params;

    const { searchParams } = new URL(request.url);

    const photo_id = searchParams.get("photo_id");
    const kind = searchParams.get("kind") as "original" | "annotated" | null;

    const section_id = searchParams.get("section_id");
    if (!id || !photo_id || !kind || !section_id) {
        return NextResponse.json(
            { error: "Missing id, photo_id, kind, or section_id" },
            { status: 400 },
        );
    }
    const { data: photoData, error: fetchError } = await supabaseAdmin
        .from("inspection_images")
        .select("image_url, annotated_image_url")
        .eq("id", photo_id)
        .eq("inspection_id", id)
        .eq("section_id", section_id)
        .single();

    if (fetchError || !photoData) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const paths: string[] = [];

    const extractFilename = (url: string | null): string | null => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split("/");
            return pathParts[pathParts.length - 1];
        } catch {
            return null;
        }
    };

    if (kind === "original") {
        if (photoData.image_url) {
            const filename = extractFilename(photoData.image_url);
            if (filename) {
                paths.push(`inspections/${id}/original/${filename}`);
            }
        }
        if (photoData.annotated_image_url) {
            const filename = extractFilename(photoData.annotated_image_url);
            if (filename) {
                paths.push(`inspections/${id}/annotated/${filename}`);
            }
        }
    }

    if (kind === "annotated") {
        if (photoData.annotated_image_url) {
            const filename = extractFilename(photoData.annotated_image_url);
            if (filename) {
                paths.push(`inspections/${id}/annotated/${filename}`);
            }
        }
    }

    if (paths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
        if (storageError) {
            return NextResponse.json({ error: storageError.message }, { status: 500 });
        }
    }

    if (kind === "original") {
        const { error: dbError } = await supabaseAdmin
            .from("inspection_images")
            .delete()
            .eq("id", photo_id)
            .eq("inspection_id", id)
            .eq("section_id", section_id);

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }
    }

    if (kind === "annotated") {
        const { error: dbError } = await supabaseAdmin
            .from("inspection_images")
            .update({ annotated_image_url: null })
            .eq("id", photo_id)
            .eq("inspection_id", id)
            .eq("section_id", section_id)
            .select();

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ ok: true });
}
