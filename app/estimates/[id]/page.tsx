import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { getUser } from "@/lib/auth/auth";
import {
    calculateEstimateCostsZ,
    calculateTotalEstimateCost,
    extractDimensions,
} from "@/lib/estimates/calculateCost";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getUser();

    const { data: estimate } = await supabase
        .from("estimates")
        .select(
            `
            *,
            estimate_items!estimate_id(
                *,
                assemblies!assembly_id(assembly_name, assembly_type, pricing_type, material_price, labor_price)
            ),
            inspections!inspection_id(
                date,
                properties!property_id(name, address),
                users!inspector_id(name)
            ),
            measurement_sessions!measurement_session_id(
                id,
                date,
                properties!property_id(name, address),
                users!created_by(name)
            ),
            users!created_by(name)
        `,
        )
        .eq("id", id)
        .single();

    if (!estimate) {
        return (
            <div className="flex justify-center p-6">
                <span className="text-lg font-semibold text-red-500">Estimate not found</span>
            </div>
        );
    }

    const inspection = Array.isArray(estimate.inspections)
        ? estimate.inspections[0]
        : estimate.inspections;
    const measurementSession = Array.isArray(estimate.measurement_sessions)
        ? estimate.measurement_sessions[0]
        : estimate.measurement_sessions;
    const createdBy = Array.isArray(estimate.users) ? estimate.users[0] : estimate.users;
    const estimateItems = Array.isArray(estimate.estimate_items) ? estimate.estimate_items : [];

    const { data: shapes } = await supabase
        .from("measurement_shapes")
        .select("shape_type, waste_percentage, surface_type, magnitude")
        .eq("measurement_session_id", measurementSession.id);

    const costs = calculateEstimateCostsZ(estimateItems, shapes || []);
    const totals = calculateTotalEstimateCost(costs);
    console.log("costs", costs);
    // console.log("Totals", totals);
    const test = extractDimensions(shapes || []);
    console.log("My test", test);

    return (
        <div className="page gap-6 p-6 max-w-6xl mx-auto">
            <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-gray-500">Estimate</p>
                        <h1 className="text-2xl font-bold">
                            Estimate
                            {estimate.is_finalized && (
                                <span className="ml-2 text-green-600 text-sm font-normal">
                                    (Finalized)
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Created by: {createdBy?.name || "Unknown"} on{" "}
                            {new Date(estimate.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/*{user && [USER_ROLES.ADMIN].includes(user.role) && (*/}
                        {/*    <Link href={`/estimates/${id}/edit`} className="btn">*/}
                        {/*        Edit*/}
                        {/*    </Link>*/}
                        {/*)}*/}
                        <Link href={`/estimates/${id}/edit`} className="btn">
                            Edit
                        </Link>
                        <Link href="/estimates" className="btn">
                            Back to List
                        </Link>
                    </div>
                </div>

                {/* Inspection & Measurement Session Info */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-3">Inspection</h3>
                        {inspection ? (
                            <div className="space-y-2">
                                <p>
                                    <span className="text-gray-500">Property:</span>{" "}
                                    {inspection.properties?.name} • {inspection.properties?.address}
                                </p>
                                <p>
                                    <span className="text-gray-500">Inspector:</span>{" "}
                                    {inspection.users?.name}
                                </p>
                                <p>
                                    <span className="text-gray-500">Date:</span>{" "}
                                    {new Date(inspection.date).toLocaleDateString()}
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-500">No inspection linked</p>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold mb-3">Measurement Session</h3>
                        {measurementSession ? (
                            <div className="space-y-2">
                                <p>
                                    <span className="text-gray-500">Property:</span>{" "}
                                    {measurementSession.properties?.name} •{" "}
                                    {measurementSession.properties?.address}
                                </p>
                                <p>
                                    <span className="text-gray-500">Created by:</span>{" "}
                                    {measurementSession.users?.name}
                                </p>
                                <p>
                                    <span className="text-gray-500">Date:</span>{" "}
                                    {new Date(measurementSession.date).toLocaleDateString()}
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-500">No measurement session linked</p>
                        )}
                    </div>
                </div>

                {/* Estimate Items */}
                <div className="card">
                    <h3 className="text-xl font-semibold mb-4">
                        Assemblies Included in the Estimate ({estimateItems.length})
                    </h3>
                    {estimateItems.length === 0 ? (
                        <p className="text-gray-500">No items in this estimate</p>
                    ) : (
                        <div className="space-y-3">
                            {estimateItems.map((item: any, idx: number) => {
                                const assembly = item.assemblies;
                                const total = item.is_manual
                                    ? (item.manual_material_price || 0) +
                                      (item.manual_labor_price || 0)
                                    : (assembly.material_price || 0) + (assembly.labor_price || 0);

                                return (
                                    <div
                                        key={item.id}
                                        className="border border-gray-600 rounded-lg p-4 bg-gray-800/50"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-lg">
                                                    {item.is_manual
                                                        ? "Manual Item"
                                                        : assembly?.assembly_name || "—"}
                                                    <span className="ml-2 text-sm text-gray-400">
                                                        (
                                                        {item.is_manual
                                                            ? item.manual_assembly_type
                                                            : assembly?.assembly_type}
                                                        )
                                                    </span>
                                                </div>
                                                {item.is_manual && item.manual_descriptions && (
                                                    <div className="text-sm text-gray-300 mt-1 italic">
                                                        {item.manual_descriptions}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div>
                                                <div className="text-sm">
                                                    <span className="text-gray-400">Material:</span>{" "}
                                                    $
                                                    {item.is_manual
                                                        ? item.manual_material_price?.toFixed(2) ||
                                                          "0.00"
                                                        : assembly.material_price?.toFixed(2) ||
                                                          "0.00"}
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-400">Labor:</span> $
                                                    {item.is_manual
                                                        ? item.manual_labor_price?.toFixed(2) ||
                                                          "0.00"
                                                        : assembly.labor_price?.toFixed(2) ||
                                                          "0.00"}
                                                </div>

                                                <div className="text-sm text-gray-400 mt-1">
                                                    Pricing: $
                                                    {item.is_manual
                                                        ? item.manual_material_price +
                                                          item.manual_labor_price
                                                        : assembly.material_price +
                                                          assembly.labor_price}
                                                    /
                                                    {item.is_manual
                                                        ? item.manual_pricing_type.replace(
                                                              /_/g,
                                                              " ",
                                                          )
                                                        : assembly.pricing_type.replace(/_/g, " ")}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-lg">
                                                    Total: ${total.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
