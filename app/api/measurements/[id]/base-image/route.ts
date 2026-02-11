import { supabaseAdmin } from "@/lib/supabase/supabase-admin";
import { type NextRequest, NextResponse } from "next/server";

const BUCKET = "measurement-images";
const PATH_PREFIX = "/storage/v1/object/public";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ------------------------------------------------------------
// POST — Upload base image for a measurement session
// ------------------------------------------------------------
export async function POST(request: NextRequest, context: any) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Missing measurement session ID" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { imageDataUrl, imageId } = body;

        if (!imageDataUrl) {
            return NextResponse.json({ error: "No image data provided" }, { status: 400 });
        }

        const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        if (buffer.length > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `Image too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
                { status: 400 },
            );
        }

        const filename = `measurement_${id}.png`;
        const path = `measurements/${id}/base/${filename}`;

        const publicUrl =
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}` + `${PATH_PREFIX}/${BUCKET}/${path}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, buffer, {
                cacheControl: "0",
                upsert: true,
                contentType: "image/png",
            });

        if (uploadError) {
            return NextResponse.json(
                { error: `Upload failed: ${uploadError.message}` },
                { status: 500 },
            );
        }

        return NextResponse.json({
            ok: true,
            url: publicUrl,
        });
    } catch (error) {
        console.error("Error saving base image:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        );
    }
}
