export interface PageParams<T extends string = string> {
    params: Record<T, string>;
}

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
    date: string;
    roof_type?: string;
    summary_notes?: string;

    // relations
    properties?: Property;
}
