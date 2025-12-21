import { supabase } from "@/lib/supabase";
import { EditInspectionForm } from "@/app/components/edit-inspection-form";
import PhotoManager from "../photo-manager";
import { getUser } from "@/lib/auth";

export default async function EditInspectionPage({ params }: PageProps<"/inspections/[id]/edit">) {
    const { id } = await params;
    const user = await getUser();

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

    const { data: sections } = await supabase
        .from("inspection_sections")
        .select(
            `
            id,
            condition,
            observations,
            recommendations,
            inspection_section_types (
                id,
                label,
                sort_order
            )
        `,
        )
        .eq("inspection_id", id)
        .order("created_at");

    const normalizedSections =
        (sections ?? []).map((s: any) => ({
            ...s,
            inspection_section_types: Array.isArray(s.inspection_section_types)
                ? s.inspection_section_types[0]
                : s.inspection_section_types,
        })) ?? [];

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
                            sections={normalizedSections}
                        />
                    </div>
                </div>

                {/* Photo manager — untouched */}
                <div className="xl:w-[420px] w-full">
                    <PhotoManager
                        inspectionId={inspection.id}
                        allowUpload={user?.role === "inspector"}
                    />
                </div>
            </div>
        </div>
    );
}
