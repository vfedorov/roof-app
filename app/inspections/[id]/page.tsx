import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { deleteInspection } from "../actions";
import { getInspectionSections } from "@/lib/inspections/getInspectionSections";
import { mapSectionsForRender } from "@/lib/inspections/mapSectionsForRender";
import { SectionRenderer } from "@/app/components/inspection/SectionRenderer";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

function computeOverallCondition(sections: Array<{ condition: string | null }>): string {
    const conditions = sections
        .map((s) => s.condition)
        .filter((c): c is string => c !== null && c.trim() !== "");

    if (conditions.length === 0) return "Not Set";
    else if (conditions.length < 6) return "Partial Set";

    if (conditions.some((c) => c === "Poor")) return "Poor";
    if (conditions.some((c) => c === "Fair")) return "Fair";
    return "Good";
}

export default async function InspectionDetailPage({ params }: PageProps<"/inspections/[id]">) {
    const { id } = await params;
    const user = await getUser();
    const { data: inspection } = await supabase
        .from("inspections")
        .select(
            "*, properties(name, address), users(name), inspection_status(locked, status_types(status_name))",
        )
        .eq("id", id)
        .single();

    if (!inspection) return <div>Inspection not found</div>;
    const is_locked = inspection.inspection_status?.locked;
    const rawSections = await getInspectionSections(id);
    const overallCondition = computeOverallCondition(rawSections);
    const sections = mapSectionsForRender(rawSections);

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
                                <div className="mt-2">
                                    {/*<span className="text-sm font-medium text-gray-700 dark:text-gray-300">*/}
                                    {/*    Overall Condition:*/}
                                    {/*</span>*/}
                                    <span
                                        className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                                            overallCondition === "Poor"
                                                ? "bg-red-100 text-red-800"
                                                : overallCondition === "Fair"
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : overallCondition === "Good"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                        }`}
                                    >
                                        {overallCondition}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-bold">{inspection.properties.name}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {inspection.properties.address}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {(!is_locked || user?.role === USER_ROLES.ADMIN) && (
                                    <>
                                        <Link href={`/inspections/${id}/edit`} className="btn">
                                            Edit
                                        </Link>
                                        <form action={deleteInspection.bind(null, id)}>
                                            <button className="btn-danger">Delete</button>
                                        </form>
                                    </>
                                )}
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
                                <p className="text-sm text-gray-500">Status</p>
                                <p className="font-medium">
                                    {inspection.inspection_status?.status_types?.status_name ??
                                        "Unknown"}
                                </p>
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
                    <SectionRenderer inspectionId={id} sections={sections} />
                </div>
            </div>
        </div>
    );
}
