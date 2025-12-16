import { supabaseServer } from "@/lib/supabase-server";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "inspection-photos";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing inspection ID" }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
        return NextResponse.json({ error: "No files attached" }, { status: 400 });
    }

    for (const file of files) {
        const filename = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const path = `inspections/${id}/original/${filename}`;

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

    // Get originals
    const originals = await supabaseServer.storage.from(BUCKET).list(`inspections/${id}/original`);

    // Get annotated
    const annotated = await supabaseServer.storage.from(BUCKET).list(`inspections/${id}/annotated`);

    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

    const photos: {
        name: string;
        kind: "original" | "annotated";
        url: string;
    }[] = [];

    // Original photos
    originals.data?.forEach((f) => {
        photos.push({
            name: f.name,
            kind: "original",
            url: `${base}/inspections/${id}/original/${f.name}?v=${f.updated_at || Date.now()}`,
        });
    });

    // Annotated photos
    annotated.data?.forEach((f) => {
        photos.push({
            name: f.name,
            kind: "annotated",
            url: `${base}/inspections/${id}/annotated/${f.name}?v=${f.updated_at || Date.now()}`,
        });
    });

    return NextResponse.json(photos);
}

export async function DELETE(request: NextRequest, context: any) {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    const name = searchParams.get("name");
    const kind = searchParams.get("kind") as "original" | "annotated" | null;

    if (!id || !name || !kind) {
        return NextResponse.json({ error: "Missing id, name, or kind" }, { status: 400 });
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

    return NextResponse.json({ ok: true });
}
