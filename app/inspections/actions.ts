"use server";

import { supabase } from "@/lib/supabase/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/auth";

export async function createInspection(formData: FormData) {
    const property_id = formData.get("property_id") as string;
    const inspector_id = formData.get("inspector_id") as string;
    const date = formData.get("date") as string;
    const roof_type = formData.get("roof_type") as string;
    const summary_notes = formData.get("summary_notes") as string;
    const status_type_id = formData.get("status_type_id") as string;

    const { data: statusType, error: statusTypeError } = await supabase
        .from("status_types")
        .select("status_name")
        .eq("id", status_type_id)
        .single();

    if (statusTypeError || !statusType) {
        throw new Error("Failed to fetch status type");
    }

    const isDraft = statusType.status_name === "Draft";
    const now = new Date().toISOString();

    const { data: status, error: statusError } = await supabase
        .from("inspection_status")
        .insert({
            status_type_id,
            changed_by: inspector_id,
            locked: !isDraft,
            locked_at: isDraft ? null : now,
            locked_by: isDraft ? null : inspector_id,
        })
        .select("id")
        .single();

    if (statusError || !status) {
        throw new Error("Failed to create inspection status");
    }

    const { data: inspection, error: inspectionError } = await supabase
        .from("inspections")
        .insert({
            property_id,
            inspector_id,
            date,
            roof_type,
            summary_notes,
            status_id: status.id,
        })
        .select()
        .single();

    if (inspectionError || !inspection) {
        throw new Error("Failed to create inspection");
    }

    const { data: sectionTypes, error: sectionTypesError } = await supabase
        .from("inspection_section_types")
        .select("id")
        .order("sort_order");

    if (sectionTypesError || !sectionTypes) {
        throw new Error("Failed to load inspection section types");
    }

    const sectionsPayload = sectionTypes.map((type) => ({
        inspection_id: inspection.id,
        section_type_id: type.id,
    }));

    const { error: sectionsError } = await supabase
        .from("inspection_sections")
        .insert(sectionsPayload);

    if (sectionsError) {
        throw new Error("Failed to create inspection sections");
    }

    revalidatePath("/inspections");
    redirect(`/inspections/${inspection.id}`);
}

export async function updateInspection(id: string, formData: FormData) {
    const property_id = formData.get("property_id") as string;
    const inspector_id = formData.get("inspector_id") as string;
    const date = formData.get("date") as string;
    const roof_type = formData.get("roof_type") as string;
    const summary_notes = formData.get("summary_notes") as string;
    const user = await getUser();

    const { data: currentInspection } = await supabase
        .from("inspections")
        .select("status_id")
        .eq("id", id)
        .single();

    if (!currentInspection?.status_id) {
        return { ok: false, message: "Inspection status not found" };
    }

    const status_type_id = formData.get("status_type_id") as string | null;

    if (status_type_id) {
        const { data: statusType, error: statusTypeError } = await supabase
            .from("status_types")
            .select("status_name")
            .eq("id", status_type_id)
            .single();

        if (statusTypeError || !statusType) {
            return { ok: false, message: "Failed to fetch status type" };
        }

        const isDraft = statusType.status_name === "Draft";
        const now = new Date().toISOString();

        const updatePayload: Record<string, any> = {
            status_type_id,
        };

        if (!isDraft) {
            updatePayload.locked = true;
            updatePayload.locked_at = now;
            updatePayload.locked_by = user?.id;
        } else {
            updatePayload.locked = false;
            updatePayload.locked_at = null;
            updatePayload.locked_by = null;
        }

        const { error: statusError } = await supabase
            .from("inspection_status")
            .update(updatePayload)
            .eq("id", currentInspection.status_id);

        if (statusError) {
            return { ok: false, message: "Failed to update inspection status" };
        }
    }

    const { error: inspectionError } = await supabase
        .from("inspections")
        .update({ property_id, inspector_id, date, roof_type, summary_notes })
        .eq("id", id);

    if (inspectionError) {
        return { ok: false, message: inspectionError.message };
    }

    const sectionUpdates: Record<
        string,
        {
            condition?: string | null;
            observations?: string | null;
            recommendations?: string | null;
        }
    > = {};

    for (const [key, value] of formData.entries()) {
        if (!key.startsWith("section:")) continue;

        // key format: section:{sectionId}:{field}
        const [, sectionId, field] = key.split(":");

        if (!sectionId || !field) continue;

        if (!sectionUpdates[sectionId]) {
            sectionUpdates[sectionId] = {};
        }

        sectionUpdates[sectionId][field as "condition" | "observations" | "recommendations"] =
            value === "" ? null : (value as string);
    }

    for (const [sectionId, values] of Object.entries(sectionUpdates)) {
        const { error } = await supabase
            .from("inspection_sections")
            .update(values)
            .eq("id", sectionId);

        if (error) {
            return { ok: false, message: error.message };
        }
    }

    revalidatePath(`/inspections/${id}`);
    return { ok: true };
}

export async function deleteInspection(id: string) {
    await supabase.from("inspections").delete().eq("id", id);
    revalidatePath("/inspections");
    redirect("/inspections");
}
