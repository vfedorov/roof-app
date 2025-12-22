import { supabase } from "@/lib/supabase/supabase";
import { EditInspectionForm } from "@/app/components/edit-inspection-form";
import { getInspectionSections } from "@/lib/inspections/getInspectionSections";
import { mapSectionsForRender } from "@/lib/inspections/mapSectionsForRender";
import { USER_ROLES } from "@/lib/auth/roles";

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
        .eq("role", USER_ROLES.INSPECTOR);

    const rawSections = await getInspectionSections(id);
    const sections = mapSectionsForRender(rawSections);

    return (
        <div className="page gap-6">
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex-1 space-y-6">
                    <div className="card">
                        <h1 className="text-2xl font-semibold mb-4">Edit Inspection</h1>
                        <EditInspectionForm
                            id={id}
                            inspection={inspection}
                            inspectors={inspectors}
                            properties={properties}
                            sections={sections}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
