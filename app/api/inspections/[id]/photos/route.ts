import { supabaseServer } from "@/lib/supabase-server";
import { type NextRequest, NextResponse } from "next/server";

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

        const { error } = await supabaseServer.storage
            .from("inspection-photos")
            .upload(path, file, {
                cacheControl: "3600",
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
    console.log("get patams", context);
    const { id } = await context.params;

    console.log("get photos!!!", id);

    const { data, error } = await supabaseServer.storage
        .from("inspection-photos")
        .list(`inspections/${id}/original`, {
            limit: 100,
            sortBy: { column: "created_at", order: "asc" },
        });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const urlBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inspection-photos`;

    const photos = data.map((file) => ({
        name: file.name,
        kind: "original",
        url: `${urlBase}/inspections/${id}/original/${file.name}`,
    }));

    return NextResponse.json(photos);
}
