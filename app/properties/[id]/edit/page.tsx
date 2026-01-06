import { supabase } from "@/lib/supabase/supabase";
import { EditPropertyForm } from "@/app/components/edit-property-form";

export default async function EditPropertyPage({ params }: PageProps<"/properties/[id]/edit">) {
    const { id } = await params;

    const { data: property } = await supabase.from("properties").select("*").eq("id", id).single();

    if (!property) throw new Error("Property not found");

    const { data: measurements } = await supabase
        .from("measurement_sessions")
        .select("*, users(name)")
        .eq("property_id", id);

    return (
        <div className="form-control">
            <h1 className="form-title">Edit Property</h1>
            <EditPropertyForm id={id} property={property} measurements={measurements} />
        </div>
    );
}
