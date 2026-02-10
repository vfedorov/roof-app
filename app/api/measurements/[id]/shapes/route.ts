import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase-admin";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
    const { id } = params;

    try {
        const { shapes } = await request.json();

        if (!Array.isArray(shapes)) {
            return NextResponse.json({ error: "Invalid shapes format" }, { status: 400 });
        }

        // Getting the existing shapes for the session
        const { data: existingShapes, error: fetchError } = await supabaseAdmin
            .from("measurement_shapes")
            .select("id")
            .eq("measurement_session_id", id);

        if (fetchError) {
            console.error("Supabase fetch error:", fetchError);
            return NextResponse.json({ error: "Failed to fetch existing shapes" }, { status: 500 });
        }
        const existingIds = new Set(existingShapes?.map((s) => s.id) || []);

        // Dividing the shapes into new and updated ones
        const shapesToUpsert = [];
        const newShapes = [];
        const updatedShapes = [];

        for (const shape of shapes) {
            if (shape.id && existingIds.has(shape.id)) {
                // This is the shape for update
                shapesToUpsert.push({
                    id: shape.id,
                    measurement_session_id: id,
                    shape_type: shape.shape_type,
                    label: shape.label || "",
                    surface_type: shape.surface_type || "other",
                    waste_percentage: shape.waste_percentage ?? 0,
                    magnitude: shape.magnitude,
                    points: shape.points,
                    updated_at: new Date().toISOString(),
                });
                updatedShapes.push(shape.id);
            } else {
                // This is a new shape
                newShapes.push({
                    measurement_session_id: id,
                    shape_type: shape.shape_type,
                    label: shape.label || "",
                    surface_type: shape.surface_type || "other",
                    waste_percentage: shape.waste_percentage ?? 0,
                    magnitude: shape.magnitude,
                    points: shape.points,
                });
            }
        }

        let upsertError = null;
        let insertError = null;

        // Updating existing shapes (if any)
        if (shapesToUpsert.length > 0) {
            const { error } = await supabaseAdmin
                .from("measurement_shapes")
                .upsert(shapesToUpsert, { onConflict: "id", ignoreDuplicates: false });

            if (error) {
                upsertError = error;
                console.error("Supabase upsert error:", error);
            }
        }

        // Inserting new shapes (if any)
        if (newShapes.length > 0) {
            const { error } = await supabaseAdmin.from("measurement_shapes").insert(newShapes);

            if (error) {
                insertError = error;
                console.error("Supabase insert error:", error);
            }
        }

        if (upsertError || insertError) {
            return NextResponse.json(
                { error: "Failed to sync shapes", details: { upsertError, insertError } },
                { status: 500 },
            );
        }

        // Determine which shapes have been deleted (does not exist in the UI, but exists in the DB)
        const currentIds = new Set(shapes.map((s) => s.id).filter((id) => id));
        const idsToDelete =
            existingIds.size > 0
                ? [...existingIds].filter((existingId) => !currentIds.has(existingId))
                : [];

        if (idsToDelete.length > 0) {
            const { error } = await supabaseAdmin
                .from("measurement_shapes")
                .delete()
                .in("id", idsToDelete);

            if (error) {
                console.error("Supabase delete error:", error);
                return NextResponse.json({ error: "Failed to delete old shapes" }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Shapes synced successfully",
            created: newShapes.length,
            updated: shapesToUpsert.length,
            deleted: idsToDelete.length,
            deleted_ids: idsToDelete,
        });
    } catch (error) {
        console.error("Unexpected error in POST /shapes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
    const { id } = params;

    try {
        const { data, error } = await supabaseAdmin
            .from("measurement_shapes")
            .select(
                `
                id,
                shape_type,
                label,
                surface_type,
                waste_percentage,
                magnitude,
                points,
                created_at,
                updated_at
            `,
            )
            .eq("measurement_session_id", id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return NextResponse.json({ error: "Failed to fetch shapes" }, { status: 500 });
        }

        return NextResponse.json({ shapes: data });
    } catch (error) {
        console.error("Unexpected error in GET /shapes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
    const { id } = params;

    try {
        const { data: session, error: sessionError } = await supabaseAdmin
            .from("measurement_sessions")
            .select("id")
            .eq("id", id)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: "Measurement session not found" }, { status: 404 });
        }

        const { error } = await supabaseAdmin
            .from("measurement_shapes")
            .delete()
            .eq("measurement_session_id", id);

        if (error) {
            console.error("Supabase delete error:", error);
            return NextResponse.json({ error: "Failed to delete shapes" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "All shapes deleted" });
    } catch (error) {
        console.error("Unexpected error in DELETE /shapes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
