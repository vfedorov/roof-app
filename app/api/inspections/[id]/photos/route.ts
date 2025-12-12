import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

const BUCKET = "inspection-photos";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const inspectionId = params.id;
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
        return NextResponse.json({ error: "No files attached." }, { status: 400 });
    }

    const invalid = files.find(
        (file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE,
    );
    if (invalid) {
        return NextResponse.json({ error: "Use JPG/PNG up to 10 MB each." }, { status: 400 });
    }

    const existing = await supabaseServer.storage
        .from(BUCKET)
        .list(`inspections/${inspectionId}/original`);
    if (existing.error) {
        return NextResponse.json(
            { error: existing.error.message || "Unable to load existing photos." },
            { status: 500 },
        );
    }

    if ((existing.data?.length || 0) + files.length > MAX_FILES) {
        return NextResponse.json(
            { error: `You can upload up to ${MAX_FILES} photos per inspection.` },
            { status: 400 },
        );
    }

    for (const file of files) {
        const extension = file.type === "image/png" ? "png" : "jpg";
        const filename = `${crypto.randomUUID()}.${extension}`;
        const path = `inspections/${inspectionId}/original/${filename}`;

        const { error } = await supabaseServer.storage.from(BUCKET).upload(path, file, {
            contentType: file.type,
            upsert: false,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    return NextResponse.json({ ok: true });
}
