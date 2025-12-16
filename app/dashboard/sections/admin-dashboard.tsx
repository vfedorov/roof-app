import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function AdminDashboard() {
    const [{ data: properties }, { data: inspections }, { data: users }] = await Promise.all([
        supabase.from("properties").select("id"),
        supabase.from("inspections").select("id"),
        supabase.from("users").select("id"),
    ]);

    return (
        <div className="p-2 md:p-0">
            <h1 className="page-title">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/properties" className="card block hover:no-underline">
                    <div className="text-4xl font-bold">{properties?.length}</div>
                    <div className="text-gray-500">Properties</div>
                    <span className="card-link">Manage</span>
                </Link>

                <Link href="/inspections" className="card block hover:no-underline">
                    <div className="text-4xl font-bold">{inspections?.length}</div>
                    <div className="text-gray-500">Inspections</div>
                    <span className="card-link">Manage</span>
                </Link>

                <Link href="/users" className="card block hover:no-underline">
                    <div className="text-4xl font-bold">{users?.length}</div>
                    <div className="text-gray-500">Users</div>
                    <span className="card-link">Manage</span>
                </Link>
            </div>
        </div>
    );
}
