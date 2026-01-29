"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export async function createAssembly(formData: FormData) {
    try {
        const assembly_name = formData.get("assembly_name") as string;
        const assembly_type = formData.get("assembly_type") as string;
        const assembly_category = formData.get("assembly_category") as string;
        const pricing_type = formData.get("pricing_type") as string;
        const is_active = formData.get("is_active") === "on";
        const assembly_company = formData.get("assembly_company") as string;
        const user = await getUser();

        if (!assembly_name || !assembly_type || !assembly_category || !pricing_type) {
            return { ok: false, message: "All required fields must be filled" };
        }

        const material_price_raw = formData.get("material_price") as string;
        const labor_price_raw = formData.get("labor_price") as string;

        const material_price = material_price_raw ? parseFloat(material_price_raw) : null;

        const labor_price = labor_price_raw ? parseFloat(labor_price_raw) : null;

        if (material_price === null && labor_price === null) {
            return {
                ok: false,
                message: "At least one price (material or labor) must be provided",
            };
        }

        const { data, error } = await supabase
            .from("assemblies")
            .insert({
                assembly_name,
                assembly_type,
                assembly_category,
                pricing_type,
                material_price: material_price,
                labor_price,
                is_active,
                company_id: assembly_company,
                created_by: user?.id,
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/assemblies");
        return { ok: true, data };
    } catch (error: any) {
        console.error("Create assembly error:", error);
        return { ok: false, message: error.message || "Failed to create assembly" };
    }
}

export async function updateAssembly(formData: FormData) {
    try {
        const id = formData.get("id") as string;
        const assembly_name = formData.get("assembly_name") as string;
        const assembly_type = formData.get("assembly_type") as string;
        const assembly_category = formData.get("assembly_category") as string;
        const pricing_type = formData.get("pricing_type") as string;
        const material_price = parseFloat(formData.get("material_price") as string);
        const labor_price = parseFloat(formData.get("labor_price") as string);
        const is_active = formData.get("is_active") === "on";

        // Валидация
        if (!id) {
            return { ok: false, message: "Assembly ID is required" };
        }

        if (!assembly_name || !assembly_type || !assembly_category || !pricing_type) {
            return { ok: false, message: "All required fields must be filled" };
        }

        if (isNaN(material_price) || isNaN(labor_price)) {
            return { ok: false, message: "Invalid price values" };
        }

        const { data, error } = await supabase
            .from("assemblies")
            .update({
                assembly_name,
                assembly_type,
                assembly_category,
                pricing_type,
                material_price,
                labor_price,
                is_active,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/assemblies/${id}`);
        revalidatePath("/assemblies");
        return { ok: true, data };
    } catch (error: any) {
        console.error("Update assembly error:", error);
        return { ok: false, message: error.message || "Failed to update assembly" };
    }
}

export async function deactivateAssembly(id: string) {
    await supabase.from("assemblies").update({ is_active: false }).eq("id", id);
    revalidatePath("/assemblies");
    redirect("/assemblies");
}
