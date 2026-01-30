import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function MeasurementsPage() {
    const user = await getUser();

    const query = supabase
        .from("assemblies")
        .select("*, users(name)")
        .order("is_active", { ascending: false })
        .order("assembly_name");

    if (user.role != USER_ROLES.ADMIN) {
        return (
            <div className="flex justify-center">
                <span>
                    <strong>Only to the administrator, accessible this pages are.</strong>
                </span>
            </div>
        );
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
                                <strong>
                                    {i.assembly_name}
                                    {!i.is_active && (
                                        <span className="text-gray-400 font-normal">
                                            {" "}
                                            (Deactivated)
                                        </span>
                                    )}
                                </strong>
                            </span>
                            <span className="details">Created by: {i.users?.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
