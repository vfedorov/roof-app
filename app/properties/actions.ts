"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createProperty(formData: FormData) {
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const zip = formData.get("zip") as string;
    const notes = formData.get("notes") as string;

    await supabase.from("properties").insert({
        name,
        address,
        city,
        state,
        zip,
        notes
    });

    revalidatePath("/properties");
}

export async function updateProperty(id: string, formData: FormData) {
    const name = formData.get("name");
    const address = formData.get("address");
    const city = formData.get("city");
    const state = formData.get("state");
    const zip = formData.get("zip");
    const notes = formData.get("notes");

    await supabase.from("properties")
        .update({ name, address, city, state, zip, notes })
        .eq("id", id);

    revalidatePath(`/properties/${id}`);
}

export async function deleteProperty(id: string) {
    await supabase.from("properties").delete().eq("id", id);
    revalidatePath("/properties");
}
