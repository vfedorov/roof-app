"use client";

type Section = {
    id: string;
    condition: string | null;
    observations: string | null;
    recommendations: string | null;
    inspection_section_types: {
        label: string;
    };
};

export function InspectionSections({ sections }: { sections: Section[] }) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Inspection Sections</h2>

            {sections.map((section) => (
                <div key={section.id} className="card space-y-4">
                    <h3 className="text-lg font-semibold">
                        {section.inspection_section_types?.label}
                    </h3>

                    {/* Condition */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Condition</label>
                        <select
                            name={`section:${section.id}:condition`}
                            className="select"
                            defaultValue={section.condition ?? ""}
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
                            className="textarea"
                            defaultValue={section.observations ?? ""}
                            placeholder="Describe observed conditions…"
                        />
                    </div>

                    {/* Recommendations */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Recommendations</label>
                        <textarea
                            name={`section:${section.id}:recommendations`}
                            className="textarea"
                            defaultValue={section.recommendations ?? ""}
                            placeholder="Recommended actions…"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
