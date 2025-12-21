import { supabaseServer } from "@/lib/supabase-server";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

    const name = searchParams.get("name");
    const kind = searchParams.get("kind") as "original" | "annotated" | null;

    const section_id = searchParams.get("section_id");
    if (!id || !name || !kind || !section_id) {
        return NextResponse.json(
            { error: "Missing id, name, kind, or section_id" },
            { status: 400 },
        );
    }

    const paths: string[] = [];

    if (kind === "original") {
        // Delete original
        paths.push(`inspections/${id}/original/${name}`);
        // Delete annotated if exists
        paths.push(`inspections/${id}/annotated/${name}`);
    }

    if (kind === "annotated") {
        // Delete annotation only
        paths.push(`inspections/${id}/annotated/${name}`);
    }

    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin
        .from("inspection_images")
        .delete()
        .eq("inspection_id", id)
        .eq("section_id", section_id)
        .eq("name", name)
        .in("kind", kind === "original" ? ["original", "annotated"] : ["annotated"]);

    return NextResponse.json({ ok: true });
}
