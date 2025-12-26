import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import { USER_ROLES } from "@/lib/auth/roles";
import { computeOverallCondition } from "@/lib/inspections/getInspectionSections";

export default async function InspectionsPage() {
    const user = await getUser();

    let query = supabase
        .from("inspections")
        .select("*, properties(name), users(name), inspection_status(status_types(status_name))");

    if (user.role === USER_ROLES.INSPECTOR) {
        query = query.eq("inspector_id", user.id);
    }

    const { data: inspections } = await query;

    let sectionsByInspection: Record<string, Array<{ condition: string | null }>> = {};

    if (inspections?.length) {
        const inspectionIds = inspections.map((i) => i.id);
        const { data: allSections } = await supabase
            .from("inspection_sections_with_type")
            .select("inspection_id, condition")
            .in("inspection_id", inspectionIds);

        sectionsByInspection = (allSections ?? []).reduce(
            (acc, section) => {
                if (!acc[section.inspection_id]) {
                    acc[section.inspection_id] = [];
                }
                acc[section.inspection_id].push({ condition: section.condition });
                return acc;
            },
            {} as Record<string, Array<{ condition: string | null }>>,
        );
    }

    return (
        <div className="page">
            <div className="header">
                <h1>Inspections</h1>
                <Link href="/inspections/new" className="btn">
                    New Inspection
                </Link>
            </div>

            <div className="list">
                {inspections?.map((i) => {
                    const overallCondition = computeOverallCondition(
                        sectionsByInspection[i.id] || [],
                    );

                    return (
                        <Link key={i.id} href={`/inspections/${i.id}`} className="item">
                            <span>
                                <strong>{i.properties?.name}</strong>
                            </span>
                            <span className="details">
                                Status: {i.inspection_status?.status_types?.status_name}
                            </span>
                            <span className="details">Condition: {overallCondition || "—"}</span>
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
