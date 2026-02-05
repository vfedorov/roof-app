interface Shape {
    shape_type: string;
    waste_percentage: number;
    surface_type: string;
    magnitude: string;
}

interface Assembly {
    assembly_name: string;
    assembly_type: string;
    pricing_type: string;
    material_price: number;
    labor_price: number;
}

interface EstimateItem {
    id: string;
    is_manual: boolean;
    manual_assembly_type?: string;
    manual_material_price?: number;
    manual_labor_price?: number;
    manual_pricing_type?: string;
    manual_descriptions?: string;
    assemblies?: Assembly;
    quantity?: number;
    area?: number;
}

function formatPricingType(pricingType: string): string {
    const formats: Record<string, string> = {
        per_sq_ft: "sq ft",
        per_square: "square",
        per_linear_ft: "lf",
        fixed: "total",
    };
    return formats[pricingType] || pricingType.replace(/_/g, " ");
}

export interface ShapeDimension {
    magnitude: number;
    waste_percentage: number;
    magnitude_type: string;
    shape_type: string;
    surface_type: string;
}

export interface CostCalculationResult {
    materialCost: number;
    laborCost: number;
    totalCost: number;
    pricingType: string;
    pricingUnit: string;
    calculatedQuantity: number;
    unitMaterialPrice: number;
    unitLaborPrice: number;
}

export function extractDimensions(shapes: Shape[]): ShapeDimension[] {
    return shapes
        .filter((shape) => !shape.surface_type?.includes("damage"))
        .map((shape) => {
            const magnitudeText = shape.magnitude?.toString() || "";
            const match = magnitudeText.match(/^([\d.]+)\s*(.+)$/);
            return {
                magnitude: match && match[1] ? parseFloat(match[1]) : 0,
                waste_percentage: shape.waste_percentage || 0,
                magnitude_type: match && match[2] ? match[2] : "",
                shape_type: shape.shape_type,
                surface_type: shape.surface_type || "unknown",
            };
        });
}

function calculateSurfaceQuantity(
    shapes: ShapeDimension[],
    surfaceTypeFilter: string,
    shapeTypeFilter?: string,
): number {
    return shapes
        .filter((shape) => {
            const matchesSurface = shape.surface_type?.includes(surfaceTypeFilter);
            const matchesShape = !shapeTypeFilter || shape.shape_type === shapeTypeFilter;
            if (surfaceTypeFilter) {
                return matchesSurface && matchesShape;
            } else {
                return matchesShape;
            }
        })
        .reduce((sum, shape) => {
            let baseQuantity = shape.magnitude;
            if (shape.magnitude_type?.includes("square")) {
                baseQuantity = shape.magnitude * 100;
            }

            const withWaste = baseQuantity * (1 + (shape.waste_percentage || 0) / 100);

            return sum + withWaste;
        }, 0);
}

function calculateItemCost(item: EstimateItem, shapesD: ShapeDimension[]): CostCalculationResult {
    let materialPrice = item.assemblies?.material_price || 0;
    let laborPrice = item.assemblies?.labor_price || 0;
    let pricingType = item.assemblies?.pricing_type || "";
    let assemblyType = item.assemblies?.assembly_type;
    let calculatedQuantity = 0;

    if (item.is_manual) {
        materialPrice = item.manual_material_price || 0;
        laborPrice = item.manual_labor_price || 0;
        pricingType = item.manual_pricing_type || "";
        assemblyType = item.manual_assembly_type;
    }

    if (pricingType.includes("square")) {
        materialPrice = Math.round(materialPrice) / 100;
        laborPrice = Math.round(laborPrice) / 100;
    }

    if (assemblyType?.includes("roof") && !pricingType.includes("line")) {
        calculatedQuantity = calculateSurfaceQuantity(shapesD, "roof", "polygon");
    } else if (assemblyType?.includes("siding") && !pricingType.includes("line")) {
        calculatedQuantity = calculateSurfaceQuantity(shapesD, "siding", "polygon");
    } else {
        calculatedQuantity = calculateSurfaceQuantity(shapesD, "", "line");
    }
    const materialCost = materialPrice * calculatedQuantity;
    const laborCost = laborPrice * calculatedQuantity;
    return {
        materialCost: Math.round(materialCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        totalCost: Math.round((materialCost + laborCost) * 100) / 100,
        pricingType: pricingType,
        pricingUnit: formatPricingType(pricingType),
        calculatedQuantity: Math.round(calculatedQuantity * 100) / 100,
        unitMaterialPrice: materialPrice,
        unitLaborPrice: laborPrice,
    };
}

export function calculateEstimateCosts(
    estimateItems: EstimateItem[],
    shapes: Shape[],
): CostCalculationResult[] {
    const shapesDimensions = extractDimensions(shapes);
    return estimateItems.map((item) => calculateItemCost(item, shapesDimensions));
}
