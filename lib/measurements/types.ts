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
