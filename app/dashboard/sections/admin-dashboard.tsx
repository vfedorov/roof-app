import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function AdminDashboard() {
    const [{ data: properties }, { data: inspections }, { data: users }] = await Promise.all([
        supabase.from("properties").select("id"),
        supabase.from("inspections").select("id"),
        supabase.from("users").select("id"),
    ]);

    return (
        <div>
            <h1 className="page-title">Admin Dashboard</h1>

            <div className="grid grid-cols-3 gap-6">
                <div className="card">
                    <div className="text-4xl font-bold">{properties?.length}</div>
                    <div className="text-gray-500">Properties</div>
                    <Link href="/properties" className="card-link">
                        Manage
                    </Link>
                </div>

                <div className="card">
                    <div className="text-4xl font-bold">{inspections?.length}</div>
                    <div className="text-gray-500">Inspections</div>
                    <Link href="/inspections" className="card-link">
                        Manage
                    </Link>
                </div>

                <div className="card">
                    <div className="text-4xl font-bold">{users?.length}</div>
                    <div className="text-gray-500">Users</div>
                    <Link href="/users" className="card-link">
                        Manage
                    </Link>
                </div>
            </div>
        </div>
    );
}
