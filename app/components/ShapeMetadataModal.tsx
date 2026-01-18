"use client";

import React, { useState } from "react";
import { SURFACE_TYPES, SurfaceType } from "@/lib/measurements/types";

interface ShapeMetadata {
    label: string;
    surface_type: SurfaceType;
    waste_percentage: number;
}

interface ShapeMetadataModalProps {
    isOpen: boolean;
    initialData: ShapeMetadata;
    onSave: (data: ShapeMetadata) => void;
    onCancel: () => void;
}

export default function ShapeMetadataModal({
    isOpen,
    initialData,
    onSave,
    onCancel,
}: ShapeMetadataModalProps) {
    const [formData, setFormData] = useState<ShapeMetadata>(initialData);

    if (!isOpen) return null;

    const handleChange = (field: keyof ShapeMetadata, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (formData.waste_percentage < 0 || formData.waste_percentage > 100) {
            alert("Waste percentage must be between 0 and 100.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">Edit Shape Metadata</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Label</label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            value={formData.label}
                            onChange={(e) => handleChange("label", e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Surface Type</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={formData.surface_type}
                            onChange={(e) =>
                                handleChange("surface_type", e.target.value as SurfaceType)
                            }
                        >
                            {SURFACE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Waste (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            className="w-full border rounded px-3 py-2"
                            value={formData.waste_percentage}
                            onChange={(e) =>
                                handleChange("waste_percentage", Number(e.target.value))
                            }
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button type="button" className="btn btn-outline" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-success" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
