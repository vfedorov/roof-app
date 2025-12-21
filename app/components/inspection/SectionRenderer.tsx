import { RenderSection } from "@/lib/inspections/mapSectionsForRender";
import { SectionBlock } from "./SectionBlock";

export function SectionRenderer({
    inspectionId,
    sections,
}: {
    inspectionId: string;
    sections: RenderSection[];
}) {
    return (
        <div className="space-y-6">
            {sections.map((section) => (
                <SectionBlock key={section.id} inspectionId={inspectionId} section={section} />
            ))}
        </div>
    );
}
