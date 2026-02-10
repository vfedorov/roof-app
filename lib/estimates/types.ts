export interface Inspection {
    id: string;
    date: string;
    roof_type: string;
    properties: {
        id: string;
        name: string | null;
        address: string | null;
    } | null;
    users: {
        name: string | null;
    } | null;
}

export interface MeasurementShape {
    id: string;
    surface_type: string;
    shape_type: "polygon" | "line";
    waste_percentage?: number | null;
    magnitude?: string | "";
    label?: string | null;
}

export interface MeasurementSession {
    id: string;
    date: string;
    properties: {
        id: string;
        name: string | null;
        address: string | null;
    } | null;
    users: {
        name: string | null;
    } | null;
}

export interface Assembly {
    id: string;
    assembly_name: string;
    assembly_type: "roofing" | "siding";
    pricing_type: "per_square" | "per_sq_ft" | "per_linear_ft";
    material_price: number;
    labor_price: number;
    is_active: boolean;
    assembly_categories: { category_name: string | null } | null;
    assembly_companies: { company_name: string | null } | null;
}

export interface Estimate {
    id?: string;
    inspection_id?: string;
    measurement_session_id?: string;
    is_finalize?: boolean;
}

export interface EstimateItem {
    id?: string;
    assembly_id?: string;
    manual_assembly_type?: "roofing" | "siding";
    manual_pricing_type?: "per_square" | "per_sq_ft" | "per_linear_ft";
    manual_material_price?: number | null;
    manual_labor_price?: number | null;
    manual_descriptions?: string;
    is_manual?: boolean;
    measurement_shape_id?: string;
}

export interface EstimateFormProps {
    user: { id: string; role: string };
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string } | void>;
    estimate?: Estimate;
}
