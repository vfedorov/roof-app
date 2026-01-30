"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

// Тип для данных сборки
interface AssemblyData {
    assembly_name: string;
    assembly_type: string;
    assembly_category: string;
    pricing_type: string;
    is_active: boolean;
    assembly_company: string;
    material_price: number | null;
    labor_price: number | null;
}

function extractAssemblyData(formData: FormData): AssemblyData {
    const assembly_name = formData.get("assembly_name") as string;
    const assembly_type = formData.get("assembly_type") as string;
    const assembly_category = formData.get("assembly_category") as string;
    const pricing_type = formData.get("pricing_type") as string;
    const is_active = formData.get("is_active") === "on";
    const assembly_company = formData.get("assembly_company") as string;

    const material_price_raw = formData.get("material_price") as string;
    const labor_price_raw = formData.get("labor_price") as string;

    const material_price = material_price_raw ? parseFloat(material_price_raw) : null;
    const labor_price = labor_price_raw ? parseFloat(labor_price_raw) : null;

    return {
        assembly_name,
        assembly_type,
        assembly_category,
        pricing_type,
        is_active,
        assembly_company,
        material_price,
        labor_price,
    };
}

function validateAssemblyData(data: AssemblyData): { valid: boolean; message?: string } {
    if (
        !data.assembly_name ||
        !data.assembly_type ||
        !data.assembly_category ||
        !data.pricing_type
    ) {
        return { valid: false, message: "All required fields must be filled" };
    }

    if (data.material_price === null && data.labor_price === null) {
        return {
            valid: false,
            message: "At least one price (material or labor) must be provided",
        };
    }

    return { valid: true };
}

export async function createAssembly(formData: FormData) {
    try {
        const data = extractAssemblyData(formData);
        const validation = validateAssemblyData(data);

        if (!validation.valid) {
            return { ok: false, message: validation.message };
        }

        const user = await getUser();

        const { data: result, error } = await supabase
            .from("assemblies")
            .insert({
                assembly_name: data.assembly_name,
                assembly_type: data.assembly_type,
                assembly_category: data.assembly_category,
                pricing_type: data.pricing_type,
                material_price: data.material_price,
                labor_price: data.labor_price,
                is_active: data.is_active,
                company_id: data.assembly_company,
                created_by: user?.id,
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/assemblies");
        return { ok: true, data: result };
    } catch (error: any) {
        return { ok: false, message: error.message || "Failed to create assembly" };
    }
}

export async function updateAssembly(formData: FormData) {
    try {
        const id = formData.get("id") as string;

        if (!id) {
            return { ok: false, message: "Assembly ID is required" };
        }

        const data = extractAssemblyData(formData);
        const validation = validateAssemblyData(data);

        if (!validation.valid) {
            return { ok: false, message: validation.message };
        }

        const { data: result, error } = await supabase
            .from("assemblies")
            .update({
                assembly_name: data.assembly_name,
                assembly_type: data.assembly_type,
                assembly_category: data.assembly_category,
                pricing_type: data.pricing_type,
                material_price: data.material_price,
                labor_price: data.labor_price,
                is_active: data.is_active,
                company_id: data.assembly_company,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/assemblies/${id}`);
        revalidatePath("/assemblies");
        return { ok: true, data: result };
    } catch (error: any) {
        return { ok: false, message: error.message || "Failed to update assembly" };
    }
}

export async function deactivateAssembly(id: string) {
    await supabase.from("assemblies").update({ is_active: false }).eq("id", id);
    revalidatePath("/assemblies");
    redirect("/assemblies");
}
