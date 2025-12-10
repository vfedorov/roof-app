import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function PropertiesPage() {
    const { data: properties } = await supabase.from("properties").select("*").order("created_at", { ascending: false });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Properties</h1>
                <Link href="/properties/new" className="bg-black text-white px-4 py-2 rounded">
                    + Add Property
                </Link>
            </div>

            <div className="space-y-3">
                {properties?.map((p) => (
                    <Link
                        key={p.id}
                        href={`/properties/${p.id}`}
                        className="block border p-4 rounded hover:bg-gray-50"
                    >
                        <strong>{p.name}</strong>
                        <div className="text-sm text-gray-500">{p.address}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
