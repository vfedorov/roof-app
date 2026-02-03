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

/**
 * Рассчитывает стоимость для одного элемента сметы на основе измерений
 */
function calculateItemCost(item: EstimateItem, shapes: Shape[]): CostCalculationResult {
    // Для ручных элементов используем прямые значения
    console.log("calculateItemCost item", item);
    if (item.is_manual) {
        const materialCost = item.manual_material_price || 0;
        const laborCost = item.manual_labor_price || 0;
        const pricingType = item.manual_pricing_type || "fixed";

        return {
            materialCost,
            laborCost,
            totalCost: materialCost + laborCost,
            pricingType,
            pricingUnit: formatPricingType(pricingType),
            calculatedQuantity: 1,
            unitMaterialPrice: materialCost,
            unitLaborPrice: laborCost,
        };
    }

    // Для сборок используем данные из базы и измерения
    const assembly = item.assemblies;
    if (!assembly) {
        return {
            materialCost: 0,
            laborCost: 0,
            totalCost: 0,
            pricingType: "fixed",
            pricingUnit: "item",
            calculatedQuantity: 0,
            unitMaterialPrice: 0,
            unitLaborPrice: 0,
        };
    }

    const pricingType = assembly.pricing_type;
    let calculatedQuantity = 1; // по умолчанию 1 единица

    // Рассчитываем количество/площадь на основе измерений
    if (pricingType === "per_sq_ft" || pricingType === "per_square") {
        console.log("per_sq_ft/per_square");
        calculatedQuantity = calculateTotalArea(shapes, item);
    } else if (pricingType === "per_linear_ft") {
        console.log("per_linear_ft");
        calculatedQuantity = calculateTotalLength(shapes, item);
    }
    console.log("calculatedQuantity", calculatedQuantity);

    // Применяем отходы для материала
    const wasteFactor = 1 + getAverageWastePercentage(shapes) / 100;

    const unitMaterialPrice = assembly.material_price || 0;
    const unitLaborPrice = assembly.labor_price || 0;

    const materialCost = unitMaterialPrice * calculatedQuantity * wasteFactor;
    const laborCost = unitLaborPrice * calculatedQuantity;

    return {
        materialCost: Math.round(materialCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        totalCost: Math.round((materialCost + laborCost) * 100) / 100,
        pricingType,
        pricingUnit: formatPricingType(pricingType),
        calculatedQuantity: Math.round(calculatedQuantity * 100) / 100,
        unitMaterialPrice,
        unitLaborPrice,
    };
}

/**
 * Рассчитывает общую площадь измерений для элемента
 */
function calculateTotalArea(shapes: Shape[], item: EstimateItem): number {
    return shapes
        .filter(
            (shape) =>
                shape.surface_type === "siding area" && item.assemblies?.assembly_type === "siding",
        )
        .reduce((sum, shape) => {
            // magnitude уже содержит площадь для площадных фигур
            return sum + 0; //(shape.magnitude || 0);
        }, 0);
}

/**
 * Рассчитывает общую длину измерений для элемента
 */
function calculateTotalLength(shapes: Shape[], item: EstimateItem): number {
    // Для линейных измерений magnitude содержит длину
    return shapes
        .filter((shape) => shape.shape_type === "line" || shape.shape_type === "polyline")
        .reduce((sum, shape) => sum + 1, 0); //(shape.magnitude || 0)
}

/**
 * Получает средний процент отходов из измерений
 */
function getAverageWastePercentage(shapes: Shape[]): number {
    if (shapes.length === 0) return 0;

    const totalWaste = shapes.reduce((sum, shape) => sum + (shape.waste_percentage || 0), 0);
    return totalWaste / shapes.length;
}

/**
 * Форматирует тип ценообразования для отображения
 */
function formatPricingType(pricingType: string): string {
    const formats: Record<string, string> = {
        per_sq_ft: "sq ft",
        per_square: "square",
        per_linear_ft: "lf",
        fixed: "total",
    };
    return formats[pricingType] || pricingType.replace(/_/g, " ");
}

/**
 * Основная функция: рассчитывает стоимость для всех элементов сметы
 */
export function calculateEstimateCosts(
    estimateItems: EstimateItem[],
    shapes: Shape[],
): CostCalculationResult[] {
    return estimateItems.map((item) => calculateItemCost(item, shapes));
}

/**
 * Рассчитывает итоговую сумму сметы
 */
export function calculateTotalEstimateCost(costs: CostCalculationResult[]): {
    totalMaterial: number;
    totalLabor: number;
    grandTotal: number;
} {
    const totals = costs.reduce(
        (acc, cost) => ({
            totalMaterial: acc.totalMaterial + cost.materialCost,
            totalLabor: acc.totalLabor + cost.laborCost,
            grandTotal: acc.grandTotal + cost.totalCost,
        }),
        { totalMaterial: 0, totalLabor: 0, grandTotal: 0 },
    );

    return {
        totalMaterial: Math.round(totals.totalMaterial * 100) / 100,
        totalLabor: Math.round(totals.totalLabor * 100) / 100,
        grandTotal: Math.round(totals.grandTotal * 100) / 100,
    };
}

// **********************************************************************************
interface ShapeDimension {
    magnitude: number;
    waste_percentage: number;
    magnitude_type: string;
    shape_type: string;
    surface_type: string;
}

export interface CostCalculationResultZ {
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
            return matchesSurface && matchesShape;
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

function calculateItemCostZ(item: EstimateItem, shapesD: ShapeDimension[]): CostCalculationResultZ {
    let materialPrice = item.assemblies?.material_price || 0;
    let laborPrice = item.assemblies?.labor_price || 0;
    let pricingType = item.assemblies?.pricing_type || "";
    let assemblyType = item.assemblies?.assembly_type;
    let materialCost = 0;
    let laborCost = 0;
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

    // if (assemblyType?.includes("roof")) {
    //     const roof_sq = shapesD
    //         .filter(
    //             (shape) => shape.shape_type === "polygon" && shape.surface_type?.includes("roof"),
    //         )
    //         .reduce((sum, shape) => {
    //             let magnitudeInSqFt = shape.magnitude;
    //             if (shape.magnitude_type === "square") {
    //                 magnitudeInSqFt = shape.magnitude * 100;
    //             }
    //
    //             const withWaste =
    //                 Math.round(magnitudeInSqFt * (100 + shape.waste_percentage)) / 100;
    //             return sum + withWaste;
    //         }, 0);
    //     materialCost = (materialPrice || 0) * roof_sq;
    //     laborCost = (laborPrice || 0) * roof_sq;
    // }

    if (assemblyType?.includes("roof")) {
        calculatedQuantity = calculateSurfaceQuantity(shapesD, "roof", "polygon");
        materialCost = materialPrice * calculatedQuantity;
        laborCost = laborPrice * calculatedQuantity;
    } else if (assemblyType?.includes("siding")) {
        calculatedQuantity = calculateSurfaceQuantity(shapesD, "siding", "polygon");
        materialCost = materialPrice * calculatedQuantity;
        laborCost = laborPrice * calculatedQuantity;
    } else if (
        assemblyType?.includes("ridge") ||
        assemblyType?.includes("trim") ||
        assemblyType?.includes("starter") ||
        assemblyType?.includes("corner") ||
        assemblyType?.includes("j_channel")
    ) {
        const surfaceType = assemblyType.includes("ridge")
            ? "ridge"
            : assemblyType.includes("trim")
              ? "trim"
              : assemblyType.includes("starter")
                ? "starter"
                : assemblyType.includes("corner")
                  ? "corner"
                  : assemblyType.includes("j_channel")
                    ? "j_channel"
                    : "";
        console.log("surfaceType", surfaceType);
        if (surfaceType) {
            calculatedQuantity = calculateSurfaceQuantity(shapesD, surfaceType);
            materialCost = materialPrice * calculatedQuantity;
            laborCost = laborPrice * calculatedQuantity;
        }
    }
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

export function calculateEstimateCostsZ(
    estimateItems: EstimateItem[],
    shapes: Shape[],
): CostCalculationResult[] {
    const shapesDimensions = extractDimensions(shapes);
    return estimateItems.map((item) => calculateItemCostZ(item, shapesDimensions));
}
