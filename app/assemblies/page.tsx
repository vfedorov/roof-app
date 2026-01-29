import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function MeasurementsPage() {
    const user = await getUser();

    const query = supabase.from("assemblies").select("*, users(name)").eq("is_active", true);

    if (user.role != USER_ROLES.ADMIN) {
        return;
    }

    const { data: assemblies } = await query;

    return (
        <div className="page">
            <div className="header">
                <h1>Assemblies</h1>
                <Link href="/assemblies/new" className="btn">
                    New Assembly
                </Link>
            </div>

            <div className="list">
                {assemblies?.map((i) => {
                    return (
                        <Link key={i.id} href={`/assemblies/${i.id}`} className="item">
                            <span>
                                <strong>{i.assembly_name}</strong>
                            </span>
                            <span className="details">Created by: {i.users?.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
