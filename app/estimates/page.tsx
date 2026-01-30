import { getUser } from "@/lib/auth/auth";
import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";

export default async function EstimatesPage() {
    const user = await getUser();

    const query = supabase.from("estimates").select("*");

    // if (user.role === USER_ROLES.INSPECTOR) {
    //     query = query.eq("created_by", user.id);
    // }

    const { data: estimates } = await query;
    return (
        <div className="page">
            <div className="header">
                <h1>Estimates</h1>
                <Link href="/estimates/new" className="btn">
                    New Estimate
                </Link>
            </div>

            <div className="list">
                {estimates?.map((i) => {
                    return (
                        <Link key={i.id} href={`/estimates/${i.id}`} className="item">
                            {/*<span>*/}
                            {/*    <strong>{i.properties?.name}</strong>*/}
                            {/*</span>*/}
                            {/*<span className="details">*/}
                            {/*    Inspector: {i.users?.name} | Date: {i.date}*/}
                            {/*</span>*/}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
