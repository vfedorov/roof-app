"use client";

import PhotoManager from "@/app/components/photo-manager";

type Section = {
    id: string;
    condition: string | null;
    observations: string | null;
    recommendations: string | null;
    inspection_section_types: {
        label: string;
    };
};

export function InspectionSections({
    inspectionId,
    sections,
    allowUpload,
}: {
    inspectionId: string;
    sections: Section[];
    allowUpload: boolean;
}) {
    return (
        <div className="space-y-8">
            {sections.map((section) => (
                <div key={section.id} className="card space-y-4">
                    <h3 className="text-lg font-semibold">
                        {section.inspection_section_types.label}
                    </h3>

                    {/* Condition */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Condition</label>
                        <select
                            name={`section:${section.id}:condition`}
                            defaultValue={section.condition ?? ""}
                            className="select"
                        >
                            <option value="">Select</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                        </select>
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Observations</label>
                        <textarea
                            name={`section:${section.id}:observations`}
                            defaultValue={section.observations ?? ""}
                            className="textarea"
                        />
                    </div>

                    {/* Recommendations */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Recommendations</label>
                        <textarea
                            name={`section:${section.id}:recommendations`}
                            defaultValue={section.recommendations ?? ""}
                            className="textarea"
                        />
                    </div>

                    {/* Section-based photos */}
                    <PhotoManager
                        inspectionId={inspectionId}
                        sectionId={section.id}
                        allowUpload={allowUpload}
                    />
                </div>
            ))}
        </div>
    );
}
