import { RefObject, useEffect, useState } from "react";
import * as fabric from "fabric";

export interface LegendItem {
    id: string;
    surfaceType: string;
    label: string;
    value: string;
    shapeType: "line" | "polygon";
    displayName: string;
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
                const surfaceType = (shape as any).surface_type || "custom";
                const label = (shape as any).label || "";
                const associatedText = (shape as any).associatedText;
                const value =
                    associatedText?.text || (shape.type === "line" ? "0.00 ft" : "0.00 sq ft");
                const baseName = shape.type === "line" ? "Line" : "Polygon";
                const displayName = label ? `${baseName}: ${label}` : baseName;
                return {
                    id,
                    surfaceType,
                    label,
                    value,
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
