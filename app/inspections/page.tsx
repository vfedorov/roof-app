import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function InspectionsPage() {
    const { data: inspections } = await supabase
        .from("inspections")
        .select("*, properties(name), users(name)");

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <h1 className="text-xl font-bold">Inspections</h1>
                <Link href="/inspections/new" className="bg-black text-white px-4 py-2 rounded">
                    + New Inspection
                </Link>
            </div>

            <div className="space-y-3">
                {inspections?.map((i) => (
                    <Link key={i.id} href={`/inspections/${i.id}`} className="block border p-4 rounded hover:bg-gray-50">
                        <div className="font-semibold">{i.properties?.name}</div>
                        <div className="text-sm text-gray-500">
                            Inspector: {i.users?.name} | Date: {i.date}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
