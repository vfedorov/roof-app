import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteInspection } from "../actions";
import { PageParams } from "@/types/next";

export default async function InspectionDetailPage({ params }: PageParams) {
    const { id } = params;

    const { data: inspection } = await supabase
        .from("inspections")
        .select("*, properties(name, address), users(name)")
        .eq("id", id)
        .single();

    if (!inspection) return <div>Inspection not found</div>;

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">
                Inspection — {inspection.properties.name}
            </h1>

            <div className="space-y-2 mb-6">
                <div><strong>Inspector:</strong> {inspection.users?.name}</div>
                <div><strong>Date:</strong> {inspection.date}</div>
                <div><strong>Roof Type:</strong> {inspection.roof_type}</div>
                <div><strong>Notes:</strong> {inspection.summary_notes}</div>
            </div>

            <div className="flex gap-4">
                <Link href={`/inspections/${id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Edit
                </Link>

                <form action={deleteInspection.bind(null, id)}>
                    <button className="bg-red-600 text-white px-4 py-2 rounded">
                        Delete
                    </button>
                </form>
            </div>
        </div>
    );
}
