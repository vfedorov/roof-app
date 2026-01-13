import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase-admin";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // ← await здесь обязателен
    const { id } = params;

    try {
        const { shapes } = await request.json();

        if (!Array.isArray(shapes)) {
            return NextResponse.json({ error: "Invalid shapes format" }, { status: 400 });
        }

        const { data: session, error: sessionError } = await supabaseAdmin
            .from("measurement_sessions")
            .select("id")
            .eq("id", id)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: "Measurement session not found" }, { status: 404 });
        }

        const shapesToInsert = shapes.map((shape: any) => ({
            measurement_session_id: id,
            shape_type: shape.shape_type,
            label: shape.label || "",
            type: shape.type || "other",
            waste_percentage: shape.waste_percentage ?? 0,
            points: shape.points,
        }));

        const { error } = await supabaseAdmin.from("measurement_shapes").insert(shapesToInsert);

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json({ error: "Failed to save shapes" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unexpected error in POST /shapes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // ← await
    const { id } = params;

    try {
        const { data, error } = await supabaseAdmin
            .from("measurement_shapes")
            .select(
                `
                id,
                shape_type,
                label,
                type,
                waste_percentage,
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
