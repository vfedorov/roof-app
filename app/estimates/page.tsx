import { getUser } from "@/lib/auth/auth";
import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";

export default async function EstimatesPage() {
    const user = await getUser();

    const query = supabase
        .from("estimates")
        .select("*, measurement_sessions(date, properties(name, address))");

    // properties:property_id (
    //   name,
    //   address
    // )

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
                {estimates?.map((est) => {
                    return (
                        <Link key={est.id} href={`/estimates/${est.id}`} className="item">
                            <span>
                                <strong>
                                    {est.measurement_sessions?.properties?.name} •{" "}
                                    {est.measurement_sessions?.properties?.address} •{" "}
                                    {new Date(est.measurement_sessions?.date).toLocaleDateString()}{" "}
                                    <span className="text-gray-400 font-normal">
                                        ({new Date(est.created_at).toLocaleDateString()}{" "}
                                        {est.is_finalized ? "Finalized" : "Draft"})
                                    </span>
                                </strong>
                            </span>
                            {/*<span className="details">*/}
                            {/*    ({est.is_finalized ? "Finalized" : "Draft"})*/}
                            {/*</span>*/}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
