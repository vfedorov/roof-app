import { updateInspection } from "../../actions";
import { supabase } from "@/lib/supabase";
import {PageParams} from "@/types/next";

export default async function EditInspectionPage({ params }: PageParams) {
    const { id } = params;

    const { data: inspection } = await supabase
        .from("inspections")
        .select("*")
        .eq("id", id)
        .single();

    const { data: properties } = await supabase.from("properties").select("id, name");
    const { data: inspectors } = await supabase.from("users").select("id, name").eq("role", "inspector");

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Edit Inspection</h1>

            <form action={updateInspection.bind(null, id)} className="space-y-4">

                <select name="property_id" defaultValue={inspection.property_id} className="border p-2 w-full">
                    {properties?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                <select name="inspector_id" defaultValue={inspection.inspector_id} className="border p-2 w-full">
                    {inspectors?.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>

                <input type="date" name="date" defaultValue={inspection.date} className="border p-2 w-full" />
                <input name="roof_type" defaultValue={inspection.roof_type} className="border p-2 w-full" />
                <textarea name="summary_notes" defaultValue={inspection.summary_notes} className="border p-2 w-full" />

                <button className="bg-black text-white px-4 py-2 rounded">Update</button>
            </form>
        </div>
    );
}
