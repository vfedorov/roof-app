import { useMemo } from "react";
import { MeasurementShape } from "./types";

export interface MeasurementSummary {
    roof: {
        totalAreaSqFt: number;
        totalSquares: number;
    };
    siding: {
        totalAreaSqFt: number;
    };
    linear: {
        ridge: number;
        eave: number;
        trim: number;
        other: number;
    };
    otherAreaSqFt: number;
}

const DAMAGE_TYPES = new Set(["roof damage", "siding damage"]);

const LINEAR_TYPES = new Set(["trim", "ridge", "eave", "other"]);

const ROOF_AREA_TYPES = new Set(["roof area"]);
const SIDING_AREA_TYPES = new Set(["siding area"]);

export const useMeasurementSummary = (shapes: MeasurementShape[]): MeasurementSummary => {
    return useMemo(() => {
        let roofArea = 0;
        let sidingArea = 0;
        let otherArea = 0;

        const linearTotals = {
            ridge: 0,
            eave: 0,
            trim: 0,
            other: 0,
        };

        for (const shape of shapes) {
            if (DAMAGE_TYPES.has(shape.surface_type)) continue;

            if (shape.geometry === "polygon") {
                const area = shape.areaSqFt ?? 0;
                if (ROOF_AREA_TYPES.has(shape.surface_type)) {
                    roofArea += area;
                } else if (SIDING_AREA_TYPES.has(shape.surface_type)) {
                    sidingArea += area;
                } else {
                    otherArea += area;
                }
            } else if (shape.geometry === "line") {
                const length = shape.lengthFt ?? 0;
                if (LINEAR_TYPES.has(shape.surface_type)) {
                    linearTotals[shape.surface_type as keyof typeof linearTotals] += length;
                }
            }
        }

        return {
            roof: {
                totalAreaSqFt: parseFloat(roofArea.toFixed(2)),
                totalSquares: parseFloat((roofArea / 100).toFixed(2)),
            },
            siding: {
                totalAreaSqFt: parseFloat(sidingArea.toFixed(2)),
            },
            linear: {
                ridge: parseFloat(linearTotals.ridge.toFixed(2)),
                eave: parseFloat(linearTotals.eave.toFixed(2)),
                trim: parseFloat(linearTotals.trim.toFixed(2)),
                other: parseFloat(linearTotals.other.toFixed(2)),
            },
            otherAreaSqFt: parseFloat(otherArea.toFixed(2)),
        };
    }, [shapes]);
};
