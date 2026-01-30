import { supabase } from "@/lib/supabase/supabase";
import Link from "next/link";

export default async function AdminDashboard() {
    const [
        { data: properties },
        { data: inspections },
        { data: measurements },
        { data: assemblies },
        { data: estimates },
        { data: users },
    ] = await Promise.all([
        supabase.from("properties").select("id"),
        supabase.from("inspections").select("id"),
        supabase.from("measurement_sessions").select("id"),
        supabase.from("assemblies").select("id, is_active"),
        supabase.from("estimates").select("id"),
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

                <Link href="/measurements" className="card block hover:no-underline">
                    <div className="text-4xl font-bold">{measurements?.length}</div>
                    <div className="text-gray-500">Measurements</div>
                    <span className="card-link">Manage</span>
                </Link>

                <Link href="/assemblies" className="card block hover:no-underline">
                    <div className="text-4xl font-bold">{assemblies?.length}</div>
                    <div className="text-gray-500">Assemblies</div>
                    <div className="mt-2 text-sm">
                        <span className="text-green-600 font-medium">
                            {assemblies?.filter((a) => a.is_active).length} active
                        </span>
                        {" • "}
                        <span className="text-gray-500 font-medium">
                            {assemblies?.filter((a) => !a.is_active).length} inactive
                        </span>
                    </div>
                    <span className="card-link">Manage</span>
                </Link>

                <Link href="/estimates" className="card block hover:no-underline">
                    <div className="text-4xl font-bold">{estimates?.length}</div>
                    <div className="text-gray-500">Estimates</div>
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
