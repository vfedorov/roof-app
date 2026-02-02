"use server";

import { getUser } from "@/lib/auth/auth";
import { supabase } from "@/lib/supabase/supabase";
import { revalidatePath } from "next/cache";

export async function createEstimate(formData: FormData) {
    const user = await getUser();
    if (!user) {
        return { ok: false, message: "Unauthorized" };
    }

    const inspectionId = formData.get("inspection_id") as string;
    const measurementSessionId = formData.get("measurement_session_id") as string;
    const isFinalized = formData.has("is_finalized");

    if (!measurementSessionId) {
        return { ok: false, message: "Measurement session is required" };
    }

    // 1. Create Estimate
    const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert({
            measurement_session_id: measurementSessionId,
            inspection_id: inspectionId,
            created_by: user.id,
            is_finalized: isFinalized,
        })
        .select()
        .single();

    if (estimateError || !estimate) {
        console.error("Estimate creation error:", estimateError);
        return { ok: false, message: "Failed to create estimate" };
    }
    console.log("Estimate", estimate);
    // 2. Get all Items
    const items: any[] = [];
    let idx = 0;
    while (
        formData.has(`items[${idx}][assembly_id]`) ||
        formData.has(`items[${idx}][manual_assembly_type]`)
    ) {
        const assemblyId = formData.get(`items[${idx}][assembly_id]`) as string;
        const isManual = formData.get(`items[${idx}][is_manual]`) === "true";

        const item = {
            estimate_id: estimate.id,
            assembly_id: isManual ? null : assemblyId || null,
            is_manual: isManual,

            // Только для ручных
            manual_assembly_type: isManual
                ? formData.get(`items[${idx}][manual_assembly_type]`)
                : null,
            manual_pricing_type: isManual
                ? formData.get(`items[${idx}][manual_pricing_type]`)
                : null,
            manual_material_price: isManual
                ? parseFloat(formData.get(`items[${idx}][manual_material_price]`) as string) || null
                : null,
            manual_labor_price: isManual
                ? parseFloat(formData.get(`items[${idx}][manual_labor_price]`) as string) || null
                : null,
            manual_descriptions: formData.get(`items[${idx}][manual_descriptions]`) as string,
        };

        if (!isManual && !assemblyId) {
            return {
                ok: false,
                message: "Item should be one of existing Assemblies or Manual assembly.",
            };
        }

        items.push(item);
        idx++;
    }

    // 3. Insert all rows
    if (items.length > 0) {
        const { error: itemsError } = await supabase.from("estimate_items").insert(items);

        if (itemsError) {
            console.error("Estimate items insertion error:", itemsError);
            // if error - delete estimate
            await supabase.from("estimates").delete().eq("id", estimate.id);
            return { ok: false, message: "Failed to save estimate items", items: items };
        }
    }

    revalidatePath("/estimates");
    return { ok: true };
}
