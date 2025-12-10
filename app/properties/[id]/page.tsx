import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { deleteProperty } from "../actions";
import { PageParams } from "@/types/next";

export default async function PropertyDetailPage({ params }: PageParams) {
    const { id } = params;

    const { data: property } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

    if (!property) return <div>Property not found</div>;

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">{property.name}</h1>

            <div className="space-y-2 mb-6">
                <div><strong>Address:</strong> {property.address}</div>
                <div><strong>City:</strong> {property.city}</div>
                <div><strong>State:</strong> {property.state}</div>
                <div><strong>ZIP:</strong> {property.zip}</div>
                <div><strong>Notes:</strong> {property.notes}</div>
            </div>

            <div className="flex gap-4">
                <Link href={`/properties/${id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Edit
                </Link>

                <form action={deleteProperty.bind(null, id)}>
                    <button className="bg-red-600 text-white px-4 py-2 rounded">
                        Delete
                    </button>
                </form>
            </div>
        </div>
    );
}
