import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function MeasurementsPage() {
    const user = await getUser();

    let query = supabase.from("measurement_sessions").select("*, properties(name), users(name)");

    if (user.role === USER_ROLES.INSPECTOR) {
        query = query.eq("created_by", user.id);
    }

    const { data: measurements } = await query;

    return (
        <div className="page">
            <div className="header">
                <h1>Measurements</h1>
                <Link href="/measurements/new" className="btn">
                    New Measurement
                </Link>
            </div>

            <div className="list">
                {measurements?.map((i) => {
                    return (
                        <Link key={i.id} href={`/measurements/${i.id}`} className="item">
                            <span>
                                <strong>{i.properties?.name}</strong>
                            </span>
                            <span className="details">
                                Inspector: {i.users?.name} | Date: {i.date}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
