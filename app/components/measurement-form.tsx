"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import MeasurementImageManager from "@/app/components/measurement-image-manager";
import { useToast } from "@/app/components/providers/toast-provider";
import { useRouter } from "next/navigation";

interface Property {
    id: string;
    name: string;
}

interface Inspector {
    id: string;
    name: string;
}

interface User {
    id: string;
    role: string;
}

interface Inspection {
    id: string;
    date: string;
    user: { name: string }[];
}

interface MeasurementData {
    id: string;
    property_id: string;
    inspection_id: string | null;
    date: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    notes: string | null;
}

interface MeasurementFormProps {
    user: User;
    properties: Property[];
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string } | void>;
    measurement?: MeasurementData;
}

export default function MeasurementForm({
    user,
    properties,
    action,
    measurement,
}: MeasurementFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [propertyId, setPropertyId] = useState<string>(() => {
        if (measurement?.property_id && typeof measurement.property_id === "string") {
            return measurement.property_id;
        }
        return "";
    });
    const [inspectionId, setInspectionId] = useState<string>(measurement?.inspection_id ?? "");
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!propertyId) {
            setInspections([]);
            setInspectionId("");
            return;
        }

        const fetchInspections = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("inspections")
                    .select("id, date, user:users ( name )")
                    .eq("property_id", propertyId)
                    .order("date", { ascending: false });

                if (error) {
                    console.error("Supabase error:", error);
                    return;
                }

                const typedData: Inspection[] =
                    data?.map((item: any) => ({
                        id: item.id,
                        date: item.date,
                        user: item.user instanceof Array ? item.user : [item.user],
                    })) || [];

                setInspections(typedData);

                if (
                    measurement?.inspection_id &&
                    typedData.some((i) => i.id === measurement.inspection_id)
                ) {
                    setInspectionId(measurement.inspection_id);
                }
            } catch (error) {
                console.error("Error fetching inspections:", error);
                setInspections([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInspections();
    }, [propertyId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData(e.target as HTMLFormElement);

        const result = await action(formData);
        if (!result?.ok) {
            toast({ title: "Error", description: result?.message || "Failed to update session." });
            return;
        }

        const measurementId = measurement?.id;
        if (!measurementId) return;

        const localShapes = localStorage.getItem(`measurement_shapes_${measurementId}`);
        if (localShapes) {
            try {
                // clear the shapes
                const shapesClearRes = await fetch(`/api/measurements/${measurementId}/shapes`, {
                    method: "DELETE",
                });

                if (!shapesClearRes.ok) {
                    throw new Error("Failed to clear shapes");
                }
            } catch (error) {
                console.error(error);
            }
            try {
                const res = await fetch(`/api/measurements/${measurementId}/shapes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        shapes: JSON.parse(localShapes),
                    }),
                });
                if (res.ok) {
                    localStorage.removeItem(`measurement_shapes_${measurementId}`);
                } else {
                    toast({ title: "Warning", description: "Failed to sync shapes." });
                }
            } catch (e) {
                console.error("Shape sync error:", e);
            }
        }
        toast({ title: "Success", description: "Measurement saved successfully!" });
        router.push(`/measurements/${measurementId}`);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* PROPERTY */}
            <div>
                <label className="block mb-1 font-medium">Property</label>
                <select
                    name="property_id"
                    className="select"
                    required
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                >
                    <option value="">Select Property</option>
                    {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* INSPECTION */}
            <div>
                <label className="block mb-1 font-medium">Inspection</label>
                <select
                    name="inspection_id"
                    className="select"
                    disabled={!propertyId}
                    value={inspectionId}
                    onChange={(e) => setInspectionId(e.target.value)}
                >
                    <option value="">Select Inspection</option>
                    {isLoading ? (
                        <option>Loading...</option>
                    ) : (
                        inspections.map((insp) => (
                            <option key={insp.id} value={insp.id}>
                                {insp.user[0]?.name ?? "—"} /{" "}
                                {new Date(insp.date).toLocaleDateString()}
                            </option>
                        ))
                    )}
                </select>
                {!propertyId && (
                    <p className="text-sm text-gray-500 mt-1">
                        Select a property first to see linked inspections.
                    </p>
                )}
            </div>

            {/* DATE */}
            <div>
                <label className="block mb-1 font-medium">Measurement Date</label>
                <input
                    type="date"
                    name="date"
                    defaultValue={measurement?.date ? measurement.date.split("T")[0] : ""}
                    className="input"
                    required
                />
            </div>

            {measurement && <input type="hidden" name="id" value={measurement?.id} />}

            {/* NOTES */}
            <div>
                <label className="block mb-1 font-medium">Summary Notes</label>
                <textarea
                    name="summary_notes"
                    className="textarea"
                    placeholder="Write measurement notes..."
                    defaultValue={measurement?.notes ?? ""}
                />
            </div>
            {/* Measurement Images */}
            {measurement && (
                <div className="mt-6">
                    <MeasurementImageManager measurementId={measurement.id} allowUpload={true} />
                </div>
            )}

            {/* SUBMIT */}
            <button className="btn w-full mt-4" type="submit">
                {measurement ? "Update Measurement" : "Create Measurement"}
            </button>
        </form>
    );
}
