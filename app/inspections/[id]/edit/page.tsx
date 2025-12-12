import { supabase } from "@/lib/supabase";
import { EditInspectionForm } from "@/app/components/edit-inspection-form";
import PhotoManager from "../photo-manager";

export default async function EditInspectionPage({ params }: PageProps<"/inspections/[id]/edit">) {
    const { id } = await params;

    const { data: inspection } = await supabase
        .from("inspections")
        .select("*")
        .eq("id", id)
        .single();

    const { data: properties } = await supabase.from("properties").select("id, name");
    const { data: inspectors } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "inspector");

    return (
        <div className="page gap-6">
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex-1">
                    <div className="card">
                        <h1 className="text-2xl font-semibold mb-4">Edit Inspection</h1>
                        <EditInspectionForm
                            id={id}
                            inspection={inspection}
                            inspectors={inspectors}
                            properties={properties}
                        />
                    </div>
                </div>

                <div className="xl:w-[420px] w-full">
                    <PhotoManager inspectionId={inspection.id} />
                </div>
            </div>
        </div>
    );
}
