"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createInspection(formData: FormData) {
    const property_id = formData.get("property_id") as string;
    const inspector_id = formData.get("inspector_id") as string;
    const date = formData.get("date") as string;
    const roof_type = formData.get("roof_type") as string;
    const summary_notes = formData.get("summary_notes") as string;

    await supabase.from("inspections").insert({
        property_id,
        inspector_id,
        date,
        roof_type,
        summary_notes,
    });

    revalidatePath("/inspections");
}

export async function updateInspection(id: string, formData: FormData) {
    const property_id = formData.get("property_id") as string;
    const inspector_id = formData.get("inspector_id") as string;
    const date = formData.get("date") as string;
    const roof_type = formData.get("roof_type") as string;
    const summary_notes = formData.get("summary_notes") as string;

    await supabase.from("inspections")
        .update({ property_id, inspector_id, date, roof_type, summary_notes })
        .eq("id", id);

    revalidatePath(`/inspections/${id}`);
}

export async function deleteInspection(id: string) {
    await supabase.from("inspections").delete().eq("id", id);
    revalidatePath("/inspections");
}
