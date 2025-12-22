"use server";

import { supabase } from "@/lib/supabase/supabase";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

export async function createProperty(formData: FormData) {
    const user = await getUser();
    if (!user || user.role !== USER_ROLES.ADMIN) {
        throw new Error("Not allowed");
    }

    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const zip = formData.get("zip") as string;
    const notes = formData.get("notes") as string;

    const { data, error } = await supabase
        .from("properties")
        .insert({
            name,
            address,
            city,
            state,
            zip,
            notes,
        })
        .select("id")
        .single();

    if (error) {
        return { ok: false, message: error.message, data: null };
    }

    revalidatePath("/properties");

    return { ok: true, data };
}

export async function updateProperty(id: string, formData: FormData) {
    const user = await getUser();
    if (!user || user.role !== USER_ROLES.ADMIN) {
        throw new Error("Not allowed");
    }

    const name = formData.get("name");
    const address = formData.get("address");
    const city = formData.get("city");
    const state = formData.get("state");
    const zip = formData.get("zip");
    const notes = formData.get("notes");

    const { data, error } = await supabase
        .from("properties")
        .update({ name, address, city, state, zip, notes })
        .eq("id", id);

    if (error) {
        return { ok: false, message: error.message };
    }

    revalidatePath(`/properties/${id}`);

    return { ok: true, data };
}

export async function deleteProperty(id: string) {
    const user = await getUser();
    if (!user || user.role !== USER_ROLES.ADMIN) {
        throw new Error("Not allowed");
    }

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
        return { ok: false, message: error.message };
    }
    return { ok: true };
}
