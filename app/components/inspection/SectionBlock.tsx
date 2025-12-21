import PhotoManager from "@/app/components/photo-manager";
import { RenderSection } from "@/lib/inspections/mapSectionsForRender";

export function SectionBlock({
    inspectionId,
    section,
    showPhotos = true,
}: {
    inspectionId: string;
    section: RenderSection;
    showPhotos?: boolean;
}) {
    return (
        <div className="card space-y-4">
            <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">{section.label}</h2>

                {section.condition && (
                    <p className="text-sm text-gray-600">
                        Condition: <span className="font-medium">{section.condition}</span>
                    </p>
                )}
            </div>

            {section.observations && (
                <div>
                    <p className="text-sm font-medium text-gray-500">Observations</p>
                    <p>{section.observations}</p>
                </div>
            )}

            {section.recommendations && (
                <div>
                    <p className="text-sm font-medium text-gray-500">Recommendations</p>
                    <p>{section.recommendations}</p>
                </div>
            )}

            {showPhotos && (
                <PhotoManager
                    inspectionId={inspectionId}
                    sectionId={section.id}
                    allowUpload={false}
                />
            )}
        </div>
    );
}
