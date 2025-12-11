"use client";

import { FormEvent } from "react";
import { useServerAction } from "@/app/components/hooks/use-server-action";
import { updateInspection } from "@/app/inspections/actions";

export function EditInspectionForm({
    id,
    inspection,
    inspectors,
    properties,
}: {
    id: string;
    inspection: any;
    inspectors?: any[] | null;
    properties: any[] | null;
}) {
    const { run, isPending } = useServerAction(updateInspection, {
        successMessage: "Inspection updated successfully",
    });

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        run(id, formData);
    }

    return (
        <div className="form-control">
            <h1 className="form-title">Edit Inspection</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <select
                    name="property_id"
                    defaultValue={inspection.property_id}
                    className="border p-2 w-full"
                >
                    {properties?.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                <select
                    name="inspector_id"
                    defaultValue={inspection.inspector_id}
                    className="border p-2 w-full"
                >
                    {inspectors?.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>

                <input
                    type="date"
                    name="date"
                    defaultValue={inspection.date}
                    className="border p-2 w-full"
                />
                <input
                    name="roof_type"
                    defaultValue={inspection.roof_type}
                    className="border p-2 w-full"
                />
                <textarea
                    name="summary_notes"
                    defaultValue={inspection.summary_notes}
                    className="border p-2 w-full"
                />

                <button className="btn">{isPending ? "Saving..." : "Update"}</button>
            </form>
        </div>
    );
}
