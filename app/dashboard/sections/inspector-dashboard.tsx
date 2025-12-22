import { supabase } from "@/lib/supabase/supabase";
import Link from "next/link";
import { Inspection, InspectorDashboardProps } from "@/lib/inspections/types";

export default async function InspectorDashboard(props: InspectorDashboardProps) {
    const { userId } = props;
    const [{ data: properties }, { data: inspections }] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase
            .from("inspections")
            .select("id, date, properties:property_id (id, name)")
            .eq("inspector_id", userId),
    ]);

    const typedInspections: Inspection[] = (inspections ?? []).map((i) => ({
        ...i,
        properties: i.properties?.[0] || i.properties || null,
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
