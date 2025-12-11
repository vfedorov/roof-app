"use server";

import {supabase} from "@/lib/supabase";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export async function createProperty(formData: FormData) {
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const zip = formData.get("zip") as string;
    const notes = formData.get("notes") as string;

    const { data, error } = await supabase.from("properties").insert({
        name,
        address,
        city,
        state,
        zip,
        notes
    }).select("id")
      .single();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/properties");
    redirect(`/properties/${data.id}`);
}

export async function updateProperty(id: string, formData: FormData) {
    const name = formData.get("name");
    const address = formData.get("address");
    const city = formData.get("city");
    const state = formData.get("state");
    const zip = formData.get("zip");
    const notes = formData.get("notes");

    const {error} = await supabase.from("properties")
        .update({ name, address, city, state, zip, notes })
        .eq("id", id);

    if (error) {
        return {ok: false, message: error.message};
    }

    revalidatePath(`/properties/${id}`);

    return {ok: true};
}

export async function deleteProperty(id: string) {
    await supabase.from("properties").delete().eq("id", id);
    revalidatePath("/properties");
    redirect("/properties");
}
