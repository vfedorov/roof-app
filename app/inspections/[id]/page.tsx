import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteInspection } from "../actions";
import PhotoManager from "@/app/components/photo-manager";

export default async function InspectionDetailPage({ params }: PageProps<"/inspections/[id]">) {
    const { id } = await params;

    const { data: inspection } = await supabase
        .from("inspections")
        .select("*, properties(name, address), users(name)")
        .eq("id", id)
        .single();

    if (!inspection) return <div>Inspection not found</div>;

    const { data: sections } = await supabase
        .from("inspection_sections")
        .select(
            `
        id,
        condition,
        observations,
        recommendations,
        inspection_section_types (
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
                <div className="flex-1 space-y-4">
                    <div className="card">
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-sm uppercase tracking-wide text-gray-500">
                                    Inspection
                                </p>
                                <h1 className="text-2xl font-bold">{inspection.properties.name}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {inspection.properties.address}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/inspections/${id}/edit`} className="btn">
                                    Edit
                                </Link>
                                <form action={deleteInspection.bind(null, id)}>
                                    <button className="btn-danger">Delete</button>
                                </form>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Inspector</p>
                                <p className="font-medium">
                                    {inspection.users?.name ?? "Unassigned"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="font-medium">{inspection.date}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Roof Type</p>
                                <p className="font-medium">{inspection.roof_type}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Summary Notes</p>
                                <p className="font-medium leading-relaxed text-gray-700 dark:text-gray-200">
                                    {inspection.summary_notes || "No notes yet"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm uppercase tracking-wide text-gray-500">
                                    Reporting
                                </p>
                                <h2 className="text-lg font-semibold">PDF Report</h2>
                            </div>
                            <form
                                action={`/api/inspections/${id}/report`}
                                method="GET"
                                target="_blank"
                            >
                                <button className="btn" type="submit">
                                    Generate PDF Report
                                </button>
                            </form>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Reports will include branding, property details, findings, and annotated
                            photos.
                        </p>
                    </div>
                    {normalizedSections?.map((section) => (
                        <div key={section.id} className="card space-y-4">
                            <div className="border-b pb-2">
                                <h2 className="text-lg font-semibold">
                                    {section.inspection_section_types.label}
                                </h2>
                                {section.condition && (
                                    <p className="text-sm text-gray-600">
                                        Condition:{" "}
                                        <span className="font-medium">{section.condition}</span>
                                    </p>
                                )}
                            </div>

                            {section.observations && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Observations
                                    </p>
                                    <p className="text-gray-700">{section.observations}</p>
                                </div>
                            )}

                            {section.recommendations && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Recommendations
                                    </p>
                                    <p className="text-gray-700">{section.recommendations}</p>
                                </div>
                            )}

                            <PhotoManager
                                inspectionId={id}
                                sectionId={section.id}
                                allowUpload={false}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
