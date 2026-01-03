import { getUser } from "@/lib/auth/auth";
import { supabase } from "@/lib/supabase/supabase";
import MeasurementForm from "@/app/components/measurement-form";
import { createMeasurement } from "../actions";
import { Property } from "@/lib/inspections/types";

export default async function NewMeasurementPage() {
    const user = await getUser();

    const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name");

    const properties: Property[] = propertiesData ?? [];

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Measurement</h1>
            <MeasurementForm user={user} properties={properties} action={createMeasurement} />
        </div>
    );
}
