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

export function computeOverallCondition(sections: Array<{ condition: string | null }>): string {
    const conditions = sections
        .map((s) => s.condition)
        .filter((c): c is string => c !== null && c.trim() !== "");

    let result = "";
    if (conditions.length < 6) result += "*";

    if (conditions.some((c) => c === "Poor")) result += "Poor";
    else if (conditions.some((c) => c === "Fair")) result += "Fair";
    else if (conditions.some((c) => c === "Good")) result += "Good";

    return result;
}
