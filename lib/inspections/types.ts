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

export interface User {
    name: string;
}

export interface Measurement {
    id: string;
    property_id?: string;
    inspection_id?: string | null;
    date: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    notes: string | null;
    users?: User | null;
}
