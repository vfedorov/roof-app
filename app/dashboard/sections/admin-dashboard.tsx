import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {Card} from "@/app/components/card";

export default async function AdminDashboard() {
    const [{ data: properties }, { data: inspections }, { data: inspectors }] =
        await Promise.all([
            supabase.from("properties").select("id"),
            supabase.from("inspections").select("id"),
            supabase.from("users").select("id").eq("role", "inspector")
        ]);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

            <div className="grid grid-cols-3 gap-6">
                <Card>
                    <div className="text-4xl font-bold">{properties?.length}</div>
                    <div className="text-gray-500">Properties</div>
                    <Link href="/properties" className="text-blue-600 dark:text-blue-400 hover:underline">Manage</Link>
                </Card>

                <Card>
                    <div className="text-4xl font-bold">{inspections?.length}</div>
                    <div className="text-gray-500">Inspections</div>
                    <Link href="/inspections" className="text-blue-600 dark:text-blue-400 hover:underline">View All</Link>
                </Card>

                <Card className="border p-6 rounded bg-white">
                    <div className="text-4xl font-bold">{inspectors?.length}</div>
                    <div className="text-gray-500">Inspectors</div>
                    <Link href="/users" className="text-blue-600 dark:text-blue-400 hover:underline">Manage</Link>
                </Card>
            </div>
        </div>
    );
}
