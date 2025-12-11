"use server";

import {supabase} from "@/lib/supabase";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export async function createInspection(formData: FormData) {
  const property_id = formData.get("property_id") as string;
  const inspector_id = formData.get("inspector_id") as string;
  const date = formData.get("date") as string;
  const roof_type = formData.get("roof_type") as string;
  const summary_notes = formData.get("summary_notes") as string;

  const { data, error } = await supabase.from("inspections").insert({
    property_id,
    inspector_id,
    date,
    roof_type,
    summary_notes,
  }).select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inspections");
  redirect(`/inspections/${data.id}`);
}

export async function updateInspection(id: string, formData: FormData) {
  const property_id = formData.get("property_id") as string;
  const inspector_id = formData.get("inspector_id") as string;
  const date = formData.get("date") as string;
  const roof_type = formData.get("roof_type") as string;
  const summary_notes = formData.get("summary_notes") as string;

  const {error} = await supabase.from("inspections")
    .update({property_id, inspector_id, date, roof_type, summary_notes})
    .eq("id", id);

  if (error) {
    return {ok: false, message: error.message};
  }
  revalidatePath(`/inspections/${id}`);

  return {ok: true}
}

export async function deleteInspection(id: string, _formData: FormData) {
  const {error} = await supabase.from("inspections").delete().eq("id", id);
  revalidatePath("/inspections");
  redirect(`/inspections`);
}
