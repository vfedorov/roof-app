import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { deleteMeasurement } from "../actions";

export default async function InspectionDetailPage({ params }: PageProps<"/inspections/[id]">) {
    const { id } = await params;
    const { data: measurement } = await supabase
        .from("measurement_sessions")
        .select("*, properties(name, address), users(name)")
        .eq("id", id)
        .single();

    if (!measurement) return <div>Measurement not found</div>;

    return (
        <div className="page gap-6">
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex-1 space-y-4">
                    <div className="card">
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-sm uppercase tracking-wide text-gray-500">
                                    Measurement
                                </p>
                                <h1 className="text-2xl font-bold">
                                    {measurement.properties.name}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {measurement.properties.address}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/measurements/${id}/edit`} className="btn">
                                    Edit
                                </Link>
                                <form action={deleteMeasurement.bind(null, id)}>
                                    <button className="btn-danger">Delete</button>
                                </form>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Inspector</p>
                                <p className="font-medium">
                                    {measurement.users?.name ?? "Unassigned"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="font-medium">{measurement.date}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Summary Notes</p>
                                <p className="font-medium leading-relaxed text-gray-700 dark:text-gray-200">
                                    {measurement.notes || "No notes yet"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
