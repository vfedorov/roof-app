import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import MeasurementForm from "@/app/components/measurement-form";
import { updateMeasurement } from "@/app/measurements/actions";
import { Property } from "@/lib/inspections/types";

export default async function EditMeasurementPage({
    params,
}: PageProps<"/measurements/[id]/edit">) {
    const { id } = await params;
    const user = await getUser();

    if (!id || !user) {
        return <>Missing parameters</>;
    }

    const { data: measurement } = await supabase
        .from("measurement_sessions")
        .select("*")
        .eq("id", id)
        .single();

    if (!measurement) {
        return <div>Measurement not found</div>;
    }

    const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name");

    const properties: Property[] = propertiesData ?? [];

    return (
        <div className="page gap-6">
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex-1 space-y-6">
                    <div className="card">
                        <h1 className="text-2xl font-semibold mb-4">Edit Measurement</h1>
                        <MeasurementForm
                            user={user}
                            properties={properties}
                            action={updateMeasurement}
                            measurement={measurement}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
