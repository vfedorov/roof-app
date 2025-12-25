import { supabase } from "@/lib/supabase/supabase";
import { EditInspectionForm } from "@/app/components/edit-inspection-form";
import { getInspectionSections } from "@/lib/inspections/getInspectionSections";
import { mapSectionsForRender } from "@/lib/inspections/mapSectionsForRender";
import { USER_ROLES } from "@/lib/auth/roles";
import { getUser } from "@/lib/auth/auth";

export default async function EditInspectionPage({ params }: PageProps<"/inspections/[id]/edit">) {
    const { id } = await params;
    const user = await getUser();

    if (!id || !user) {
        return <>Missing parameters</>;
    }

    const { data: inspection } = await supabase
        .from("inspections")
        .select("*, inspection_status(id, locked, status_type_id, status_types(id, status_name))")
        .eq("id", id)
        .single();

    if (!inspection) {
        return <div>Inspection not found</div>;
    }

    if (inspection.inspection_status?.locked && user.role !== USER_ROLES.ADMIN) {
        return (
            <div className="page">
                <div className="card">
                    <h1 className="text-2xl font-semibold mb-4">Edit Inspection</h1>
                    <p className="text-gray-600">
                        This inspection is locked. Only admins can edit completed inspections.
                    </p>
                </div>
            </div>
        );
    }

    const { data: statusTypes = [] } = await supabase
        .from("status_types")
        .select("id, status_name")
        .order("status_name");

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
                            statusTypes={statusTypes}
                            currentStatusTypeId={inspection.inspection_status?.status_type_id}
                            allowEditPhotos={user.role === USER_ROLES.INSPECTOR}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
