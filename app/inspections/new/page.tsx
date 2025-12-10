import { createInspection } from "../actions";
import { supabase } from "@/lib/supabase";

export default async function NewInspectionPage() {
    const { data: properties } = await supabase.from("properties").select("id, name");
    const { data: inspectors } = await supabase.from("users").select("id, name").eq("role", "inspector");

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">New Inspection</h1>

            <form action={createInspection} className="space-y-4">
                <select name="property_id" className="border p-2 w-full" required>
                    <option value="">Select Property</option>
                    {properties?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                <select name="inspector_id" className="border p-2 w-full" required>
                    <option value="">Select Inspector</option>
                    {inspectors?.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>

                <input type="date" name="date" className="border p-2 w-full" required />
                <input name="roof_type" placeholder="Roof Type" className="border p-2 w-full" />
                <textarea name="summary_notes" placeholder="Summary Notes" className="border p-2 w-full" />

                <button className="bg-black text-white px-4 py-2 rounded">Create</button>
            </form>
        </div>
    );
}
