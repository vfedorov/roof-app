"use client";

import { FormEvent } from "react";
import { useServerAction } from "@/app/components/hooks/use-server-action";
import { useToast } from "@/app/components/hooks/use-toast";
import { updateInspection } from "@/app/inspections/actions";
import { InspectionSections } from "@/app/components/inspection-sections";
import { Inspection, Property } from "@/lib/inspections/types";
import { Measurement } from "@/lib/measurements/types";
import { RenderSection } from "@/lib/inspections/mapSectionsForRender";
import Link from "next/link";

interface StatusType {
    id: string;
    status_name: string;
}

export function EditInspectionForm({
    id,
    inspection,
    inspectors,
    properties,
    sections,
    statusTypes,
    currentStatusTypeId,
    allowEditPhotos,
    measurements,
}: {
    id: string;
    inspection: Inspection;
    inspectors?: { id: string; name: string }[] | null;
    properties: Property[] | null;
    sections: RenderSection[];
    statusTypes: StatusType[] | null;
    currentStatusTypeId: string | null;
    allowEditPhotos: boolean;
    measurements: Measurement[] | null;
}) {
    const { run, isPending } = useServerAction(updateInspection, {
        successMessage: "Inspection updated successfully",
    });
    const { toast } = useToast();

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const selectedStatusTypeId = formData.get("status_type_id") as string | null;

        if (!selectedStatusTypeId) {
            run(id, formData);
            return;
        }

        const selectedStatus = statusTypes?.find((st) => st.id === selectedStatusTypeId);
        const isDraft = selectedStatus?.status_name === "Draft";

        if (!isDraft) {
            let hasEmptyCondition = false;

            for (const [key] of formData.entries()) {
                if (key.startsWith("section:") && key.endsWith(":condition")) {
                    const value = formData.get(key) as string | null;
                    if (!value || value.trim() === "") {
                        hasEmptyCondition = true;
                        break;
                    }
                }
            }

            if (hasEmptyCondition) {
                toast({
                    title: "All 'Condition' fields must be filled before changing status from Draft.",
                    variant: "warning",
                });
                return;
            }
        }

        run(id, formData);
    }

    return (
        <div className="form-control px-0 md:px-6 md:card">
            <h1 className="form-title">Edit Inspection</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
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
                        defaultValue={inspection.inspector_id ?? ""}
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
                        defaultValue={inspection.date ?? ""}
                        className="border p-2 w-full"
                    />
                    <select
                        name="status_type_id"
                        defaultValue={currentStatusTypeId || ""}
                        className="border p-2 w-full"
                    >
                        <option value="">Select Status</option>
                        {statusTypes?.map((st) => {
                            if (
                                st.status_name === "Report Generated" &&
                                st.id !== currentStatusTypeId
                            ) {
                                return null;
                            }
                            return (
                                <option key={st.id} value={st.id}>
                                    {st.status_name}
                                </option>
                            );
                        })}
                    </select>
                    <input
                        name="roof_type"
                        defaultValue={inspection.roof_type ?? ""}
                        className="border p-2 w-full"
                    />
                    <textarea
                        name="summary_notes"
                        defaultValue={inspection.summary_notes ?? ""}
                        className="border p-2 w-full"
                    />
                </div>

                <InspectionSections
                    sections={sections}
                    inspectionId={inspection.id}
                    allowUpload={allowEditPhotos}
                />
                {measurements && measurements.length > 0 && (
                    <>
                        <h2 className="text-xl font-semibold mb-3">Measurements</h2>
                        <div className="space-y-3">
                            {measurements.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/measurements/${p.id}`}
                                    className="block border p-4 rounded"
                                >
                                    {new Date(p.date).toLocaleDateString()}
                                </Link>
                            ))}
                        </div>
                    </>
                )}
                <button className="btn">{isPending ? "Saving..." : "Update"}</button>
            </form>
        </div>
    );
}
