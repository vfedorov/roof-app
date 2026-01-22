import { User } from "@/lib/inspections/types";

export const SURFACE_TYPES = [
    "roof area",
    "roof damage",
    "siding area",
    "siding damage",
    "trim",
    "ridge",
    "eave",
    "other",
] as const;

export type SurfaceType = (typeof SURFACE_TYPES)[number];

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

export interface MeasurementShape {
    id: string;
    surface_type: SurfaceType;
    geometry: "line" | "polygon";
    areaSqFt?: number;
    lengthFt?: number;
    wastePercent?: number;
}

export const getDefaultWaste = (type: string): number => {
    switch (type) {
        case "roof area":
            return 10;
        case "siding area":
            return 15;
        case "trim":
        case "ridge":
        case "eave":
            return 15;
        default:
            return 0;
    }
};
