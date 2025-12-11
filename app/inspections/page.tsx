import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";

export default async function InspectionsPage() {
    const user = await getUser();

    let query = supabase.from("inspections").select("*, properties(name), users(name)");

    if (user.role === "inspector") {
        query = query.eq("inspector_id", user.id);
    }

    const { data: inspections } = await query;

    return (
        <div className="page">
            <div className="header">
                <h1>Inspections</h1>
                <Link href="/inspections/new" className="btn">
                    New Inspection
                </Link>
            </div>

            <div className="list">
                {inspections?.map((i) => (
                    <Link key={i.id} href={`/inspections/${i.id}`} className="item">
                        <span>
                            <strong>{i.properties?.name}</strong>
                        </span>
                        <span className="details">
                            Inspector: {i.users?.name} | Date: {i.date}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
