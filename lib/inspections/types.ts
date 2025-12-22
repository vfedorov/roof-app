export interface InspectorDashboardProps {
    userId: string;
}

export interface Property {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    notes?: string;
}

export interface Inspection {
    id: string;

    date: string | null;
    roof_type?: string | null;
    summary_notes?: string | null;

    property_id?: string;
    inspector_id?: string | null;

    status?: "draft" | "completed" | "report_generated";

    properties?: Property;
}
