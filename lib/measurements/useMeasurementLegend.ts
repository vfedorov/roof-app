import { RefObject, useEffect, useState } from "react";
import * as fabric from "fabric";
import { getDefaultWastePercentage } from "@/lib/measurements/shapes";

export interface LegendItem {
    id: string;
    surfaceType: string;
    label: string;
    valueNet: string;
    valueGross: string;
    shapeType: "line" | "polygon";
    displayName: string;
}

export function formatWasteValue(
    rawValueText: string,
    wastePercentage: number,
    shapeType: "line" | "polygon",
): { valueNet: string; valueGross: string } {
    let valueNet = rawValueText;
    let valueGross = rawValueText;

    const match = rawValueText.match(/^([\d.]+)\s*(.+)$/);
    if (match) {
        const numericValue = parseFloat(match[1]);
        const unit = match[2];

        if (!isNaN(numericValue)) {
            const grossValue = numericValue * (1 + wastePercentage / 100);
            valueNet = `${numericValue.toFixed(2)} ${unit}`;
            valueGross = `${grossValue.toFixed(2)} ${unit} (with ${wastePercentage}% waste)`;
        }
    }

    return { valueNet, valueGross };
}

export const useMeasurementLegend = (
    canvasRef: RefObject<fabric.Canvas | null>,
    scale: number | null,
    scalePoints: { x: number; y: number }[],
    imageDimensions: { naturalWidth: number; naturalHeight: number },
) => {
    const [items, setItems] = useState<LegendItem[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || scale === null || scalePoints.length !== 2) return;

        const updateLegend = () => {
            const shapes = canvas
                .getObjects()
                .filter(
                    (obj) =>
                        (obj.type === "line" || obj.type === "polygon") &&
                        !(obj as any).isTemp &&
                        !(obj as any).isScaleElement,
                );

            const newItems: LegendItem[] = shapes.map((shape) => {
                const id = (shape as any).id;

                const surface_t = (shape as any).surface_type;
                const surfaceType = surface_t in TYPE_COLORS ? surface_t : "custom";
                const label = (shape as any).label || "";
                const wastePercentage =
                    (shape as any).waste_percentage ?? getDefaultWastePercentage(surfaceType);
                const baseName = shape.type === "line" ? "Line" : "Polygon";
                const displayName = label ? `${baseName}: ${label}` : baseName;

                const rawValueText = (shape as any).associatedText?.text || "";
                const { valueNet, valueGross } = formatWasteValue(
                    rawValueText,
                    wastePercentage,
                    shape.type as "line" | "polygon",
                );

                return {
                    id,
                    surfaceType,
                    label,
                    valueNet,
                    valueGross,
                    shapeType: shape.type as "line" | "polygon",
                    displayName,
                };
            });

            setItems(newItems);
        };

        updateLegend();

        // Подписка на изменения холста
        canvas.on("object:added", updateLegend);
        canvas.on("object:removed", updateLegend);
        canvas.on("object:modified", updateLegend);

        return () => {
            canvas.off("object:added", updateLegend);
            canvas.off("object:removed", updateLegend);
            canvas.off("object:modified", updateLegend);
        };
    }, [canvasRef, scale, scalePoints, imageDimensions]);

    const selectShapeById = (id: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const shape = canvas.getObjects().find((obj) => (obj as any).id === id);
        if (shape) {
            canvas.discardActiveObject();
            canvas.setActiveObject(shape);
            canvas.renderAll();
        }
    };

    return { items, selectShapeById };
};

export const TYPE_COLORS: Record<string, string> = {
    "roof area": "#FF6B6B",
    "roof damage": "#FF9F43",
    "siding area": "#4ECDC4",
    "siding damage": "#FF6B9D",
    trim: "#45B7D1",
    ridge: "#96CEB4",
    eave: "#FFEAA7",
    other: "#A0A0A0",
};

export function hexToRgba(hex: string, alpha: number): string {
    const cleanHex = hex.replace(/^#/, "");
    const r = parseInt(
        cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.slice(0, 2),
        16,
    );
    const g = parseInt(
        cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.slice(2, 4),
        16,
    );
    const b = parseInt(
        cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.slice(4, 6),
        16,
    );
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
