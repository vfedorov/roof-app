import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function PropertiesPage() {
    const user = await getUser();
    const { data: properties } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

    return (
        <div className="page">
            <div className="header">
                <h1>Properties</h1>
                {user.role === USER_ROLES.ADMIN && (
                    <Link className="btn" href="/properties/new">
                        Add Property
                    </Link>
                )}
            </div>

            <div className="list">
                {properties?.map((p) => (
                    <Link key={p.id} href={`/properties/${p.id}`} className="item">
                        <span>
                            <strong>{p.name}</strong>
                        </span>
                        <span className="details">{p.address}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
