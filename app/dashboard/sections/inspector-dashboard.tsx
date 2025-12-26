import { supabase } from "@/lib/supabase/supabase";
import { computeOverallCondition } from "@/lib/inspections/getInspectionSections";
import Link from "next/link";

export default async function InspectorDashboard({ userId }: { userId: string }) {
    const [{ data: properties }, { data: inspections }] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase
            .from("inspections")
            .select(
                "id, date, properties:property_id (id, name), inspection_status!inner (status_types (status_name))",
            )
            .eq("inspector_id", userId),
    ]);

    let sectionsByInspection: Record<string, Array<{ condition: string | null }>> = {};

    if (inspections?.length) {
        const inspectionIds = inspections.map((i: any) => i.id);
        const { data: allSections } = await supabase
            .from("inspection_sections_with_type")
            .select("inspection_id, condition")
            .in("inspection_id", inspectionIds);

        sectionsByInspection = (allSections ?? []).reduce(
            (acc, { inspection_id, condition }) => {
                if (!acc[inspection_id]) acc[inspection_id] = [];
                acc[inspection_id].push({ condition });
                return acc;
            },
            {} as Record<string, Array<{ condition: string | null }>>,
        );
    }

    const typedInspections: any[] = (inspections ?? []).map((i) => ({
        ...i,
        properties: i.properties?.[0] || i.properties || null,
        inspection_status: i.inspection_status,
        overallCondition: computeOverallCondition(sectionsByInspection[i.id] || []),
    }));

    return (
        <div className="p-2 md:p-0">
            <h1 className="text-2xl font-bold mb-6">Inspector Dashboard</h1>

            <div className="mb-6">
                <Link
                    href="/inspections/new"
                    className="block md:inline-block bg-[color:var(--brand)] text-white px-4 py-2 rounded"
                >
                    + Start Inspection
                </Link>
            </div>

            <h2 className="text-xl font-semibold mb-3">My Inspections</h2>
            <div className="space-y-3 mb-10">
                {typedInspections?.map((i) => (
                    <Link
                        key={i.id}
                        href={`/inspections/${i.id}`}
                        className="block border p-4 rounded"
                    >
                        <div className="font-semibold">{i.properties?.name}</div>
                        <div className="text-sm text-gray-500">
                            Status: {i.inspection_status?.status_types?.status_name}
                        </div>
                        <div className="text-sm text-gray-500">
                            Condition: {i.overallCondition || "—"}
                        </div>
                        <div className="text-sm text-gray-500">{i.date}</div>
                    </Link>
                ))}
            </div>

            <h2 className="text-xl font-semibold mb-3">Properties</h2>
            <div className="space-y-3">
                {properties?.map((p) => (
                    <Link
                        key={p.id}
                        href={`/properties/${p.id}`}
                        className="block border p-4 rounded"
                    >
                        {p.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
