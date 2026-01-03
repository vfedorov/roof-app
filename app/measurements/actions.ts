"use server";

import { supabase } from "@/lib/supabase/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/auth";

export async function createMeasurement(formData: FormData) {
    const property_id = formData.get("property_id") as string;
    const inspection_id = formData.get("inspection_id") as string;
    const date = formData.get("date") as string;
    const notes = formData.get("summary_notes") as string;
    const user = await getUser();

    const now = new Date().toISOString();

    const { data: measurement, error: measurementError } = await supabase
        .from("measurement_sessions")
        .insert({
            property_id: property_id,
            inspection_id: inspection_id ? inspection_id : null,
            date: date,
            notes: notes,
            created_by: user?.id,
        })
        .select()
        .single();

    if (measurementError || !measurement) {
        throw new Error("Failed to create measurement" + measurementError);
    }

    revalidatePath("/measurements");
    redirect(`/measurements/${measurement.id}`);
}

export async function updateMeasurement(formData: FormData) {
    const id = formData.get("id")?.toString();
    const propertyId = formData.get("property_id") as string;
    const inspectionId = formData.get("inspection_id") as string;
    const date = formData.get("date") as string;
    const summary_notes = formData.get("summary_notes") as string;
    const user = await getUser();

    const now = new Date().toISOString();

    const { error: measurementError } = await supabase
        .from("measurement_sessions")
        .update({
            property_id: propertyId,
            inspection_id: inspectionId || null,
            date: date,
            notes: summary_notes,
            updated_at: now,
        })
        .eq("id", id);

    if (measurementError) {
        return { ok: false, message: "Failed to update measurement" };
    }

    revalidatePath(`/measurements/${id}`);
    redirect(`/measurements/${id}`);
}

export async function deleteMeasurement(id: string) {
    await supabase.from("measurement_sessions").delete().eq("id", id);
    revalidatePath("/measurements");
    redirect("/measurements");
}
