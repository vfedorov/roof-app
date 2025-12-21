export type RenderSection = {
    id: string;
    label: string;
    condition: string | null;
    observations: string | null;
    recommendations: string | null;
};

export function mapSectionsForRender(rawSections: any[]): RenderSection[] {
    return rawSections.map((s) => ({
        id: s.id,
        label: s.section_label,
        condition: s.condition,
        observations: s.observations,
        recommendations: s.recommendations,
    }));
}
