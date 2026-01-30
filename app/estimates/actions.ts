"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEstimate(formData: FormData) {
    // const property_id = formData.get("property_id") as string;
    // const inspection_id = formData.get("inspection_id") as string;
    // const date = formData.get("date") as string;
    // const notes = formData.get("summary_notes") as string;
    // const user = await getUser();
    //
    // const { data: measurement, error: measurementError } = await supabase
    //   .from("measurement_sessions")
    //   .insert({
    //     property_id: property_id,
    //     inspection_id: inspection_id ? inspection_id : null,
    //     date: date,
    //     notes: notes,
    //     created_by: user?.id,
    //   })
    //   .select()
    //   .single();
    //
    // if (measurementError || !measurement) {
    //   throw new Error("Failed to create measurement" + measurementError);
    // }

    revalidatePath("/estimates");
    // redirect(`/estimates/${estimate.id}`);
    redirect("/estimates");
}
