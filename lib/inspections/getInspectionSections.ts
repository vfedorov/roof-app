import { supabaseServer } from "@/lib/supabase/supabase-server";

export async function getInspectionSections(inspectionId: string) {
    const { data, error } = await supabaseServer
        .from("inspection_sections_with_type")
        .select("id, condition, observations, recommendations, section_label, section_sort_order")
        .eq("inspection_id", inspectionId)
        .order("section_sort_order", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data ?? [];
}
