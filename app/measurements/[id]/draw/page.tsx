"use client";
//Start to add points to each vertex of polygon
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/providers/toast-provider";
import * as fabric from "fabric";
import ShapeMetadataModal from "@/app/components/ShapeMetadataModal";
import { SurfaceType } from "@/lib/measurements/types";
import {
    calculatePolygonArea,
    createLineVertexPoints,
    outPolygonArea,
    removeLinePoints,
    syncLinePoints,
    syncVertexCircles,
    updatePolygonBoundingBox,
} from "@/lib/measurements/shapes";
import { createMagnifier } from "@/lib/measurements/magnifier";
import { updateLineLength } from "@/lib/measurements/lineGeometry";
import { useMeasurementLegend } from "@/lib/measurements/useMeasurementLegend";
import MeasurementLegend from "@/app/components/MeasurementLegend";

const FONT_SIZE = 20;
const FONT_COLOR = "#C0C0C0";
const FONT_STROKE = "white";
const FONT_WEIGHT = "normal";
const STROKE_WIDTH = 0.2;

export default function DrawPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { toast } = useToast();

    const [measurementId, setMeasurementId] = useState("");
    const [baseImageUrl, setBaseImageUrl] = useState("");
    const [scale, setScale] = useState<number | null>(null);
    const [scalePoints, setScalePoints] = useState<{ x: number; y: number }[]>([]);
    const [imageDimensions, setImageDimensions] = useState({
        naturalWidth: 0,
        naturalHeight: 0,
    });
    const [polygonPointCount, setPolygonPointCount] = useState(0);

    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);

    const [activeTool, setActiveTool] = useState<"select" | "line" | "polygon">("select");
    const activeToolRef = useRef(activeTool);
    const scalePointsRef = useRef(scalePoints);
    const scaleRef = useRef(scale);
    const imageDimensionsRef = useRef(imageDimensions);

    const startPointRef = useRef<fabric.Point | null>(null);
    const tempStartPointRef = useRef<fabric.Circle | null>(null);
    const tempTextRef = useRef<fabric.IText | null>(null);
    const polygonPointsRef = useRef<fabric.Point[]>([]);
    const tempPolygonRef = useRef<fabric.Polygon | null>(null);
    const tempPolygonTextRef = useRef<fabric.IText | null>(null);

    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActiveRef = useRef(false);
    const [isMagnifierActive, setIsMagnifierActive] = useState(false);
    const isMagnifierActiveRef = useRef(false);
    const magnifierRef = useRef<ReturnType<typeof createMagnifier> | null>(null);
    const [hasSelection, setHasSelection] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isLegendExpanded, setIsLegendExpanded] = useState(false);

    const [editingMetadata, setEditingMetadata] = useState<{
        id: string;
        label: string;
        surface_type: SurfaceType;
        waste_percentage: number;
    } | null>(null);

    const { items: legendItems, selectShapeById } = useMeasurementLegend(
        fabricRef,
        scale,
        scalePoints,
        imageDimensions,
    );

    useEffect(() => {
        activeToolRef.current = activeTool;
    }, [activeTool]);
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);
    useEffect(() => {
        scalePointsRef.current = scalePoints;
    }, [scalePoints]);
    useEffect(() => {
        imageDimensionsRef.current = imageDimensions;
    }, [imageDimensions]);
    useEffect(() => {
        isMagnifierActiveRef.current = isMagnifierActive;
        const canvas = fabricRef.current;
        if (!canvas) return;

        if (isMagnifierActive) {
            canvas.selection = false;
            canvas.defaultCursor = "crosshair";
            canvas.discardActiveObject();
            canvas.renderAll();
        } else {
            canvas.selection = true;
            canvas.defaultCursor = "default";
        }
    }, [isMagnifierActive]);

    const applyTransformToPoints = (
        points: { x: number; y: number }[],
        matrix: number[],
    ): fabric.Point[] => {
        return points.map((point) => {
            const x = point.x;
            const y = point.y;
            const transformedX = matrix[0] * x + matrix[2] * y + matrix[4];
            const transformedY = matrix[1] * x + matrix[3] * y + matrix[5];
            return new fabric.Point(transformedX, transformedY);
        });
    };

    const openMetadataModal = (shape: fabric.Object) => {
        const id = (shape as any).id;
        if (!id || !fabricRef.current) return;
        const label = (shape as any).label || "";
        const surface_type =
            (shape as any).surface_type || (shape.type === "line" ? "ridge" : "roof area");
        const waste_percentage = (shape as any).waste_percentage ?? getDefaultWaste(surface_type);

        setEditingMetadata({ id, label, surface_type, waste_percentage });
    };

    const getDefaultWaste = (type: string): number => {
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
    // ───────────────────────────────────────────────
    // Handler for Metadata
    // ───────────────────────────────────────────────
    const handleMetadataSave = (data: {
        label: string;
        surface_type: SurfaceType;
        waste_percentage: number;
    }) => {
        if (!editingMetadata?.id || !fabricRef.current) return;
        const shape = fabricRef.current
            .getObjects()
            .find((obj) => (obj as any).id === editingMetadata.id);

        if (!shape) {
            toast({ title: "Error", description: "Shape not found." });
            setEditingMetadata(null);
            return;
        }

        (shape as any).label = data.label;
        (shape as any).surface_type = data.surface_type;
        (shape as any).waste_percentage = data.waste_percentage;
        fabricRef.current.fire("object:modified", { target: shape });

        const textObj = (shape as any).associatedText;
        if (textObj) {
            textObj.set({ text: textObj.text || "" });
            fabricRef.current.renderAll();
        }

        setEditingMetadata(null);
        autosave();
        toast({ title: "Saved", description: "Shape metadata updated." });
    };

    const handleMetadataCancel = () => {
        setEditingMetadata(null);
    };
    // ───────────────────────────────────────────────
    // Handler for drawing lines
    // ───────────────────────────────────────────────
    const handlePointerUpOrCancel = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        isLongPressActiveRef.current = false;
        magnifierRef.current?.hide();
    };

    const handlePointerDown = (opt: fabric.TEvent) => {
        if (isMagnifierActiveRef.current) {
            opt.e?.preventDefault?.();
            opt.e?.stopPropagation?.();
        }
        if (!fabricRef.current || !opt.e) return;

        if (isLongPressActiveRef.current) return;

        const canvas = fabricRef.current;
        const pointer = canvas.getScenePoint(opt.e);
        const currentPoint = new fabric.Point(pointer.x, pointer.y);

        if (isMagnifierActive && magnifierRef.current) {
            magnifierRef.current.show(pointer.x, pointer.y, 1);
        }

        if ("ontouchstart" in window && opt.e instanceof TouchEvent) {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = setTimeout(() => {
                isLongPressActiveRef.current = true;
                if (activeToolRef.current === "polygon" && polygonPointsRef.current.length >= 3) {
                    finalizePolygon();
                }
            }, 500);
        }

        // ───────────────────────────────────
        // LINE TOOL (two-click)
        // ───────────────────────────────────
        if (activeToolRef.current === "line" && scaleRef.current !== null) {
            // First click - set start point
            if (startPointRef.current === null) {
                startPointRef.current = currentPoint;

                // Create a small visible circle as start point indicator
                const tempCircle = new fabric.Circle({
                    left: currentPoint.x,
                    top: currentPoint.y,
                    radius: 5,
                    fill: "red",
                    stroke: "white",
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                });
                tempCircle.set({
                    originX: "center",
                    originY: "center",
                });

                (tempCircle as any).isTemp = true;
                tempStartPointRef.current = tempCircle;
                canvas.add(tempCircle);

                const tempText = new fabric.IText("Click second point", {
                    fontSize: 12,
                    fill: "red",
                    selectable: false,
                    evented: false,
                    left: currentPoint.x,
                    top: currentPoint.y - 10,
                });
                tempText.set({
                    originX: "center",
                    originY: "bottom",
                });
                (tempText as any).isTemp = true;
                tempTextRef.current = tempText;
                canvas.add(tempText);
                canvas.renderAll();
                return;
            }

            // Second click - create final line
            const startPoint = startPointRef.current;
            startPointRef.current = null;

            // Delete temp objects
            if (tempStartPointRef.current) {
                canvas.remove(tempStartPointRef.current);
                tempStartPointRef.current = null;
            }
            if (tempTextRef.current) {
                canvas.remove(tempTextRef.current);
                tempTextRef.current = null;
            }

            const dx = currentPoint.x - startPoint.x;
            const dy = currentPoint.y - startPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            // Create final line
            const line = new fabric.Line([0, 0, length, 0], {
                left: startPoint.x,
                top: startPoint.y,
                angle: angle,
                stroke: "red",
                strokeWidth: 4,
                strokeDashArray: [],
                selectable: true,
                hasBorders: true,
                cornerColor: "red",
                cornerStrokeColor: "red",
                transparentCorners: true,
                strokeUniform: true,
                objectCaching: false,
            });
            line.set({
                originX: "left",
                originY: "top",
                cornerStyle: "circle",
            });
            (line as any).id = crypto.randomUUID();

            ["tl", "tr", "bl", "br", "mt", "mb", "mtr"].forEach((key) => {
                line.setControlVisible(key, false);
            });

            const text = new fabric.IText("0.00 ft", {
                fontSize: FONT_SIZE,
                fontWeight: FONT_WEIGHT,
                fill: FONT_COLOR,
                stroke: FONT_STROKE,
                strokeWidth: STROKE_WIDTH,
                selectable: false,
                evented: false,
            });
            text.set({
                originX: "center",
                originY: "bottom",
            });

            // const label_ = new fabric.IText("", {
            //     fontSize: 14,
            //     fill: "red",
            //     selectable: false,
            //     evented: false,
            // });
            // label_.set({
            //     originX: "center",
            //     originY: "bottom",
            // });
            //
            // const type_ = new fabric.IText("", {
            //     fontSize: 14,
            //     fill: "red",
            //     selectable: false,
            //     evented: false,
            // });
            // type_.set({
            //     originX: "center",
            //     originY: "bottom",
            // });

            (line as any).associatedText = text;
            // (line as any).associatedLabel = label_;
            // (line as any).associatedType = type_;

            // Update length and position
            const updateText = () =>
                updateLineLength({
                    line,
                    text,
                    canvas,
                    scale: scaleRef.current,
                    scalePoints: scalePointsRef.current,
                    naturalWidth: imageDimensionsRef.current.naturalWidth,
                });

            const onLineChanged = () => {
                line.setCoords();
                updateText();
                syncLinePoints(line, canvas);
                autosave();
            };

            // Events
            line.on("moving", onLineChanged);
            line.on("scaling", onLineChanged);
            line.on("modified", onLineChanged);
            line.on("rotating", onLineChanged);

            canvas.add(line, text); //, label_, type_);
            line.setCoords();
            const vertexCircles = createLineVertexPoints(
                line,
                canvas,
                updateText,
                syncLinePoints,
                autosave,
            );

            (line as any).vertexCircles = vertexCircles;

            // Первоначальная синхронизация
            syncLinePoints(line, canvas);

            openMetadataModal(line);

            canvas.setActiveObject(line);
            updateText();
            setActiveTool("select");
            activeToolRef.current = "select";
            startPointRef.current = null;
            autosave();
            return;
        }

        // ───────────────────────────────────
        // POLYGON TOOL
        // ───────────────────────────────────
        if (activeToolRef.current === "polygon" && scaleRef.current !== null) {
            if (opt.e instanceof MouseEvent) {
                if (opt.e.button === 2) return;
            }

            polygonPointsRef.current.push(currentPoint);
            setPolygonPointCount(polygonPointsRef.current.length);
            if (polygonPointsRef.current.length === 1) {
                const startCircle = new fabric.Circle({
                    left: currentPoint.x,
                    top: currentPoint.y,
                    radius: 5,
                    fill: "red",
                    stroke: "white",
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                });
                startCircle.set({
                    originX: "center",
                    originY: "center",
                });
                (startCircle as any).isTemp = true;
                tempStartPointRef.current = startCircle;
                canvas.add(startCircle);
            }

            //Creating/updating a temporary polygon
            if (polygonPointsRef.current.length >= 2) {
                // Delete old temp polygon
                if (tempPolygonRef.current) {
                    canvas.remove(tempPolygonRef.current);
                    tempPolygonRef.current = null;
                }
                if (tempPolygonTextRef.current) {
                    canvas.remove(tempPolygonTextRef.current);
                    tempPolygonTextRef.current = null;
                }

                // Creating a new temporary polygon
                const tempPolygon = new fabric.Polygon(polygonPointsRef.current, {
                    fill: "rgba(255, 0, 0, 0.05)",
                    stroke: "red",
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    strokeUniform: true,
                    lockRotation: true,
                });

                (tempPolygon as any).isTemp = true;
                tempPolygon.setControlVisible("mtr", false);
                tempPolygonRef.current = tempPolygon;
                canvas.add(tempPolygon);

                // Calculating the area for a temporary polygon
                // const areaSqFt = calculatePolygonArea(polygonPointsRef.current);
                const areaSqFt = calculatePolygonArea(
                    tempPolygon,
                    scaleRef.current,
                    scalePointsRef.current,
                    imageDimensionsRef.current,
                    canvas,
                );
                const tempText = new fabric.IText(`${outPolygonArea(areaSqFt)}`, {
                    fontSize: FONT_SIZE,
                    fontWeight: FONT_WEIGHT,
                    fill: FONT_COLOR,
                    stroke: FONT_STROKE,
                    strokeWidth: STROKE_WIDTH,
                    selectable: false,
                    evented: false,
                    left: currentPoint.x,
                    top: currentPoint.y - 10,
                });
                tempText.set({
                    originX: "center",
                    originY: "bottom",
                });
                (tempText as any).isTemp = true;
                tempPolygonTextRef.current = tempText;
                canvas.add(tempText);
            }

            canvas.renderAll();
            return;
        }
    };

    // Double-click (complete polygon creation)
    const handleDblClick = (opt: fabric.TEvent) => {
        if (isLongPressActiveRef.current) return;
        if (activeToolRef.current !== "polygon" || polygonPointsRef.current.length <= 3) return;
        finalizePolygon();
    };

    const finalizePolygon = () => {
        if (!fabricRef.current || polygonPointsRef.current.length < 3) return;

        const canvas = fabricRef.current;

        // Delete temp objects
        if (tempPolygonRef.current) {
            canvas.remove(tempPolygonRef.current);
            tempPolygonRef.current = null;
        }
        if (tempPolygonTextRef.current) {
            canvas.remove(tempPolygonTextRef.current);
            tempPolygonTextRef.current = null;
        }
        if (tempStartPointRef.current) {
            canvas.remove(tempStartPointRef.current);
            tempStartPointRef.current = null;
        }

        // Create final polygon
        const finalPolygon = new fabric.Polygon(polygonPointsRef.current, {
            fill: "rgba(255, 0, 0, 0.2)",
            stroke: "red",
            strokeWidth: 3,
            selectable: true,
            hasControls: true,
            strokeUniform: true,
            cornerColor: "red",
            cornerStrokeColor: "red",
            transparentCorners: true,
            lockRotation: true,
        });

        finalPolygon.set({
            originX: "left",
            originY: "top",
            cornerStyle: "circle",
        });
        (finalPolygon as any).id = crypto.randomUUID();
        finalPolygon.setControlVisible("mtr", false);

        const areaSqFt = calculatePolygonArea(
            finalPolygon,
            scaleRef.current,
            scalePointsRef.current,
            imageDimensionsRef.current,
            canvas,
        );
        const text = new fabric.IText(`${outPolygonArea(areaSqFt)}`, {
            fontSize: FONT_SIZE,
            fontWeight: FONT_WEIGHT,
            fill: FONT_COLOR,
            stroke: FONT_STROKE,
            strokeWidth: STROKE_WIDTH,
            selectable: false,
            evented: false,
        });
        text.set({
            originX: "center",
            originY: "bottom",
        });

        // const label_ = new fabric.IText("", {
        //     fontSize: 14,
        //     fill: "red",
        //     selectable: false,
        //     evented: false,
        // });
        // label_.set({
        //     originX: "center",
        //     originY: "bottom",
        // });
        //
        // const type_ = new fabric.IText("", {
        //     fontSize: 14,
        //     fill: "red",
        //     selectable: false,
        //     evented: false,
        // });
        // type_.set({
        //     originX: "center",
        //     originY: "bottom",
        // });

        (finalPolygon as any).associatedText = text;
        // (finalPolygon as any).associatedLabel = label_;
        // (finalPolygon as any).associatedType = type_;

        const center = finalPolygon.getCenterPoint();
        text.set({ left: center.x, top: center.y });
        // label_.set({ left: center.x, top: center.y - 30 });
        // type_.set({ left: center.x, top: center.y - 15 });

        const updatePolygonText = () => {
            const newArea = calculatePolygonArea(
                finalPolygon,
                scaleRef.current,
                scalePointsRef.current,
                imageDimensionsRef.current,
                canvas,
            );
            const newCenter = finalPolygon.getCenterPoint();
            text.set({
                text: `${outPolygonArea(newArea)}`,
                left: newCenter.x,
                top: newCenter.y,
            });
            // label_.set({
            //     left: newCenter.x,
            //     top: newCenter.y - 30,
            // });
            // type_.set({
            //     left: newCenter.x,
            //     top: newCenter.y - 15,
            // });
            canvas.renderAll();
        };
        (finalPolygon as any).updateTextFn = updatePolygonText;

        const onPolygonChanged = () => {
            finalPolygon.setCoords();
            updatePolygonText();
            syncVertexCircles(finalPolygon, canvas);
            autosave();
        };

        finalPolygon.on("moving", onPolygonChanged);
        finalPolygon.on("scaling", onPolygonChanged);
        finalPolygon.on("modified", onPolygonChanged);

        canvas.add(finalPolygon, text); // , label_, type_);
        finalPolygon.setCoords();
        const vertexCircles: fabric.Circle[] = [];

        finalPolygon.points.forEach((point, idx) => {
            const circle = new fabric.Circle({
                left: point.x,
                top: point.y,
                radius: 6,
                fill: "white",
                stroke: "red",
                strokeWidth: 1,
                selectable: true,
                hasControls: false,
                hoverCursor: "pointer",
            });
            circle.set({
                originX: "center",
                originY: "center",
            });

            (circle as any).belongsTo = finalPolygon;
            (circle as any).vertexIndex = idx;

            vertexCircles.push(circle);
            circle.on("moving", () => {
                const poly = (circle as any).belongsTo as fabric.Polygon;
                const idx = (circle as any).vertexIndex as number;

                if (!poly || idx === undefined) return;

                const matrix = poly.calcTransformMatrix();
                const inverseMatrix = fabric.util.invertTransform(matrix);

                // Получаем новую позицию точки
                const newX = circle.left! + circle.radius! / 2;
                const newY = circle.top! + circle.radius! / 2;

                const localPoint = new fabric.Point(newX, newY).transform(inverseMatrix);

                const adjustedX = localPoint.x + poly.pathOffset.x;
                const adjustedY = localPoint.y + poly.pathOffset.y;

                // Обновляем точку в массиве
                poly.points[idx].x = adjustedX;
                poly.points[idx].y = adjustedY;

                // Перерисовываем полигон
                updatePolygonText();
                // poly.set({ dirty: true });
                // poly.setCoords();
                // poly.setBoundingBox();
                updatePolygonBoundingBox(poly);
                canvas.renderAll();

                // Обновляем текст (площадь)
                const updateFn = (poly as any).updateTextFn; // см. шаг 3
                if (updateFn) updateFn();
                syncVertexCircles(poly, canvas);
                autosave();
            });
            canvas.add(circle);
        });

        // Сохраняем ссылки на точки внутри полигона
        (finalPolygon as any).vertexCircles = vertexCircles;

        openMetadataModal(finalPolygon);
        canvas.setActiveObject(finalPolygon);
        polygonPointsRef.current = [];
        setPolygonPointCount(0);
        canvas.renderAll();
        setActiveTool("select");
        activeToolRef.current = "select";
        autosave();
    };

    const handleDeleteSelected = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length === 0) {
            toast({ title: "No selection", description: "Please select a shape to delete." });
            return;
        }

        // Delete all selected objects
        activeObjects.forEach((obj) => {
            if ((obj as any).associatedText) {
                canvas.remove((obj as any).associatedText);
            }
            if ((obj as any).vertexCircles && obj.type === "polygon") {
                (obj as any).vertexCircles.forEach((c: fabric.Object) => {
                    canvas.remove(c);
                });
            }

            // Удаляем точки линий с помощью новой функции
            if ((obj as any).vertexCircles && obj.type === "line") {
                removeLinePoints(obj, canvas);
            }

            canvas.remove(obj);
        });

        // Removing the selection
        canvas.discardActiveObject();
        canvas.renderAll();
    };

    const handleEditMetadata = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length !== 1) {
            toast({
                title: "Select one shape",
                description: "Please select exactly one line or polygon.",
            });
            return;
        }
        const obj = activeObjects[0];
        if (obj.type !== "line" && obj.type !== "polygon") {
            toast({
                title: "Invalid selection",
                description: "Only lines and polygons can have metadata.",
            });
            return;
        }
        openMetadataModal(obj);
    };
    // ───────────────────────────────────────────────
    // Saving shape data
    // ───────────────────────────────────────────────
    const saveShapesLocally = (silent = false) => {
        if (!fabricRef.current || !measurementId) return;

        const canvas = fabricRef.current;
        const naturalWidth = imageDimensionsRef.current.naturalWidth;
        const naturalHeight = imageDimensionsRef.current.naturalHeight;
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        const objects = canvas
            .getObjects()
            .filter(
                (obj) => (obj.type === "line" || obj.type === "polygon") && !(obj as any).isTemp,
            );

        const shapesToSave = objects.map((obj) => {
            let points: { x: number; y: number }[] = [];
            const shapeType = obj.type === "line" ? "line" : "polygon";
            const label = (obj as any).label || "";
            const surfaceType = (obj as any).surface_type || "custom";
            const wastePercentage = (obj as any).waste_percentage ?? 0;
            const magnitude = (obj as any).associatedText.text || "";

            if (obj.type === "line") {
                const coords = obj.getCoords();
                points = [
                    {
                        x: ((coords[0].x - obj.strokeWidth / 2) / canvasWidth) * naturalWidth,
                        y: ((coords[0].y + obj.strokeWidth / 2) / canvasHeight) * naturalHeight,
                    },
                    {
                        x: ((coords[1].x - obj.strokeWidth / 2) / canvasWidth) * naturalWidth,
                        y: ((coords[1].y + obj.strokeWidth / 2) / canvasHeight) * naturalHeight,
                    },
                ];
            } else if (obj.type === "polygon") {
                const poly = obj as fabric.Polygon;
                const matrix = poly.calcTransformMatrix();
                const globalPoints = poly.points.map((point) => {
                    const transformed = new fabric.Point(point.x, point.y).transform(matrix);
                    return new fabric.Point(
                        transformed.x - poly.pathOffset.x * poly.scaleX,
                        transformed.y - poly.pathOffset.y * poly.scaleY,
                    );
                });
                points = globalPoints.map((pt) => ({
                    x: (pt.x / canvasWidth) * naturalWidth,
                    y: (pt.y / canvasHeight) * naturalHeight,
                }));
            }

            return {
                measurement_session_id: measurementId,
                shape_type: shapeType,
                label,
                surface_type: surfaceType,
                waste_percentage: wastePercentage,
                magnitude,
                points,
                id: (obj as any).id,
            };
        });

        // Save to the localStorage
        try {
            localStorage.setItem(
                `measurement_shapes_${measurementId}`,
                JSON.stringify(shapesToSave),
            );
            if (!silent) {
                toast({ title: "Draft saved", description: "Shapes cached locally." });
            }
        } catch (e) {
            if (!silent) {
                toast({ title: "Warning", description: "Failed to cache shapes." });
            }
        }
    };

    const autosave = () => {
        // console.log("----autosave!!!");
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setSaveStatus("saving");

        saveTimeoutRef.current = setTimeout(() => {
            try {
                saveShapesLocally(true);
                setSaveStatus("saved");
            } catch (e) {
                console.error("Autosave failed", e);
                setSaveStatus("error");
            }
        }, 600); // debounce ~0.5–0.7 сек
    };
    // ───────────────────────────────────────────────
    // Loading measurement data
    // ───────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const p = await params;
            setMeasurementId(p.id);

            const sessionRes = await fetch(`/api/measurements/${p.id}`);
            const session = await sessionRes.json();
            setScale(session.scale);
            setScalePoints(session.scale_points || []);

            const imagesRes = await fetch(`/api/measurements/${p.id}/images`);
            const images = await imagesRes.json();
            const baseImage = images.find((img: any) => img.is_base_image);
            if (baseImage) {
                setBaseImageUrl(baseImage.image_url);
            }
        };
        load();
    }, [params]);

    // ───────────────────────────────────────────────
    // Initializing Fabric.js canvas
    // ───────────────────────────────────────────────
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: "transparent",
        });
        fabricRef.current = canvas;

        canvas.on("selection:created", (e) => {
            const selected = e.selected?.[0];
            if (selected && (selected as any).belongsTo) {
                setHasSelection(false);
            } else {
                setHasSelection(true);
            }
        });

        canvas.on("selection:updated", (e) => {
            const selected = e.selected?.[0];
            if (selected && (selected as any).belongsTo) {
                setHasSelection(false);
            } else {
                setHasSelection(true);
            }
        });
        canvas.on("selection:cleared", () => setHasSelection(false));

        canvas.on("mouse:down", handlePointerDown);
        canvas.on("mouse:up", handlePointerUpOrCancel);
        canvas.on("mouse:dblclick", handleDblClick);
        canvas.on("mouse:move", (opt) => {
            if (!isMagnifierActiveRef.current || !magnifierRef.current || !opt.e) return;

            const pointer = canvas.getScenePoint(opt.e);
            let k = 1;
            if (opt.e instanceof TouchEvent && opt.e.type === "touchmove") {
                k = 2.02675;
            }
            magnifierRef.current.show(pointer.x * k, pointer.y * k, k);
        });

        magnifierRef.current = createMagnifier(canvas, canvasWrapperRef.current!);

        const resizeAndScaleContent = () => {
            if (!canvasWrapperRef.current || !baseImageUrl) return;

            const wrapperWidth = canvasWrapperRef.current.clientWidth;
            const wrapperHeight = canvasWrapperRef.current.clientHeight;

            const bgImage = canvas.getObjects().find((obj) => (obj as any).isBackgroundImage);

            if (bgImage) {
                const img = bgImage as fabric.Image;
                const scaleImg = wrapperWidth / img.width!;
                const scaledHeight = img.height! * scaleImg;

                canvas.setDimensions({ width: wrapperWidth, height: scaledHeight });

                img.set({
                    scaleX: scaleImg,
                    scaleY: scaleImg,
                    left: 0,
                    top: 0,
                });

                const naturalWidth = (img._element as HTMLImageElement).naturalWidth;
                const naturalHeight = (img._element as HTMLImageElement).naturalHeight;
                setImageDimensions({ naturalWidth, naturalHeight });

                const existing = canvas.getObjects();
                existing.forEach((obj) => {
                    if ((obj as any).isScaleElement) {
                        canvas.remove(obj);
                    }
                });
                const displayedWidth = wrapperWidth;
                const displayedHeight = scaledHeight;

                const coefX = displayedWidth / naturalWidth;
                const coefY = displayedHeight / naturalHeight;
                if (scalePoints.length === 2) {
                    const scaleLineStart = {
                        x: scalePoints[0].x * coefX,
                        y: scalePoints[0].y * coefY,
                    };
                    const scaleLineEnd = {
                        x: scalePoints[1].x * coefX,
                        y: scalePoints[1].y * coefY,
                    };

                    const r = 6;
                    const scaleLine = new fabric.Line(
                        [scaleLineStart.x, scaleLineStart.y, scaleLineEnd.x, scaleLineEnd.y],
                        {
                            stroke: "blue",
                            strokeWidth: 4,
                            strokeDashArray: [5, 5],
                            selectable: false,
                            evented: false,
                            lockMovementX: true,
                            lockMovementY: true,
                        },
                    );
                    (scaleLine as any).isScaleElement = true;

                    const circle1 = new fabric.Circle({
                        left: scaleLineStart.x - r,
                        top: scaleLineStart.y - r,
                        radius: r,
                        fill: "blue",
                        stroke: "white",
                        strokeWidth: 2,
                        selectable: false,
                        evented: false,
                    });
                    const circle2 = new fabric.Circle({
                        left: scaleLineEnd.x - r,
                        top: scaleLineEnd.y - r,
                        radius: r,
                        fill: "blue",
                        stroke: "white",
                        strokeWidth: 2,
                        selectable: false,
                        evented: false,
                    });
                    (circle1 as any).isScaleElement = true;
                    (circle2 as any).isScaleElement = true;

                    canvas.add(scaleLine, circle1, circle2);
                }
                // const shapes = canvas
                //     .getObjects()
                //     .filter(
                //         (obj) =>
                //             (obj.type === "line" || obj.type === "polygon") &&
                //             !(obj as any).isTemp &&
                //             !(obj as any).isScaleElement,
                //     );
                // shapes.forEach((shape) => {
                //     if (shape.type === "line") {
                //         const coords = shape.getCoords();
                //         const p1 = { x: coords[0].x, y: coords[0].y };
                //         const p2 = { x: coords[1].x, y: coords[1].y };
                //
                //         // Пересчёт координат относительно нового масштаба
                //         const newP1 = {
                //             x: p1.x, // / imageDimensions.naturalWidth) * wrapperWidth,
                //             y: p1.y, // / imageDimensions.naturalHeight) * scaledHeight,
                //         };
                //         const newP2 = {
                //             x: p2.x, // / imageDimensions.naturalWidth) * wrapperWidth,
                //             y: p2.y, // / imageDimensions.naturalHeight) * scaledHeight,
                //         };
                //
                //         // Обновление линии
                //         const dx = newP2.x - newP1.x;
                //         const dy = newP2.y - newP1.y;
                //         const length = Math.sqrt(dx * dx + dy * dy);
                //         const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                //
                //         shape.set({
                //             left: newP1.x,
                //             top: newP1.y,
                //             angle: angle,
                //         });
                //
                //         // Обновление текста
                //         const text = (shape as any).associatedText;
                //         if (text) {
                //             const lineCenterX = (newP1.x + newP2.x) / 2 - 25;
                //             const lineCenterY = (newP1.y + newP2.y) / 2 - 10;
                //             text.set({
                //                 left: lineCenterX,
                //                 top: lineCenterY,
                //             });
                //         }
                //     } else if (shape.type === "polygon") {
                //         const points = (shape as fabric.Polygon).points.map((point) => ({
                //             x: point.x,
                //             y: point.y,
                //         }));
                //
                //         shape.set({
                //             points: points,
                //         });
                //     }
                // });
                canvas.renderAll();
            } else {
                canvas.setDimensions({ width: wrapperWidth, height: wrapperHeight });
            }
        };

        resizeAndScaleContent();
        window.addEventListener("resize", resizeAndScaleContent);

        return () => {
            canvas.off("mouse:down", handlePointerDown);
            canvas.off("mouse:up", handlePointerUpOrCancel);
            canvas.off("mouse:dblclick", handleDblClick);

            window.removeEventListener("resize", resizeAndScaleContent);
            canvas.dispose();

            magnifierRef.current?.destroy();
            magnifierRef.current = null;
        };
    }, [baseImageUrl, scalePoints]);
    // ───────────────────────────────────────────────
    // Loading the background image and the scale line
    // ───────────────────────────────────────────────
    useEffect(() => {
        if (!fabricRef.current || !baseImageUrl || scalePoints.length !== 2) return;

        const loadImage = async () => {
            const canvas = fabricRef.current!;

            // Removing the old background and scale
            const existing = canvas.getObjects();
            existing.forEach((obj) => {
                if ((obj as any).isBackgroundImage || (obj as any).isScaleElement) {
                    canvas.remove(obj);
                }
            });

            // Load image
            const img = await fabric.Image.fromURL(baseImageUrl, {
                crossOrigin: "anonymous",
            });

            if (!canvasWrapperRef.current) return;

            const wrapperWidth = canvasWrapperRef.current.clientWidth;
            const scaleImg = wrapperWidth / img.width!;
            const scaledHeight = img.height! * scaleImg;

            canvas.setDimensions({ width: wrapperWidth, height: scaledHeight });

            img.set({
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                lockRotation: true,
                lockScalingX: true,
                lockScalingY: true,
                hoverCursor: "default",
                scaleX: scaleImg,
                scaleY: scaleImg,
                left: 0,
                top: 0,
            });

            (img as any).isBackgroundImage = true;
            canvas.add(img);
            canvas.sendObjectToBack(img);

            // Natural size
            const naturalWidth = (img._element as HTMLImageElement).naturalWidth;
            const naturalHeight = (img._element as HTMLImageElement).naturalHeight;
            setImageDimensions({ naturalWidth, naturalHeight });

            // Scale line
            const displayedWidth = wrapperWidth;
            const displayedHeight = scaledHeight;

            const scaleLineStart = {
                x: (scalePoints[0].x / naturalWidth) * displayedWidth,
                y: (scalePoints[0].y / naturalHeight) * displayedHeight,
            };
            const scaleLineEnd = {
                x: (scalePoints[1].x / naturalWidth) * displayedWidth,
                y: (scalePoints[1].y / naturalHeight) * displayedHeight,
            };

            // Line
            const scaleLine = new fabric.Line(
                [scaleLineStart.x, scaleLineStart.y, scaleLineEnd.x, scaleLineEnd.y],
                {
                    stroke: "blue",
                    strokeWidth: 4,
                    strokeDashArray: [5, 5],
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                },
            );
            (scaleLine as any).isScaleElement = true;
            (scaleLine as any).isTemp = true;
            // Circles
            const r = 6;
            const circle1 = new fabric.Circle({
                left: scaleLineStart.x - r,
                top: scaleLineStart.y - r,
                radius: r,
                fill: "blue",
                stroke: "white",
                strokeWidth: 2,
                selectable: false,
                evented: false,
            });
            const circle2 = new fabric.Circle({
                left: scaleLineEnd.x - r,
                top: scaleLineEnd.y - r,
                radius: r,
                fill: "blue",
                stroke: "white",
                strokeWidth: 2,
                selectable: false,
                evented: false,
            });
            (circle1 as any).isScaleElement = true;
            (circle2 as any).isScaleElement = true;

            canvas.add(scaleLine, circle1, circle2);
            canvas.renderAll();
        };

        loadImage();
    }, [baseImageUrl, scalePoints]);

    useEffect(() => {
        if (
            !fabricRef.current ||
            !baseImageUrl ||
            scalePoints.length !== 2 ||
            imageDimensions.naturalWidth === 0 ||
            imageDimensions.naturalHeight === 0
        )
            return;
        const loadShapes = async () => {
            let shapesToRender: any[] = [];

            try {
                const localData = localStorage.getItem(`measurement_shapes_${measurementId}`);
                if (localData) {
                    shapesToRender = JSON.parse(localData);
                }
            } catch (e) {
                console.warn("Failed to parse local shapes");
            }

            if (shapesToRender.length === 0) {
                try {
                    const res = await fetch(`/api/measurements/${measurementId}/shapes`);
                    const data = await res.json();
                    if (data.shapes?.length > 0) {
                        shapesToRender = data.shapes;
                        localStorage.setItem(
                            `measurement_shapes_${measurementId}`,
                            JSON.stringify(data.shapes),
                        );
                    }
                } catch (error) {
                    console.warn("Failed to load shapes from server");
                }
            }

            if (shapesToRender.length === 0) return;

            const res = await fetch(`/api/measurements/${measurementId}/shapes`);
            const data = await res.json();
            if (!data.shapes || !Array.isArray(data.shapes)) return;

            const canvas = fabricRef.current!;
            const naturalWidth = imageDimensions.naturalWidth;
            const naturalHeight = imageDimensions.naturalHeight;
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();

            shapesToRender.forEach((shape: any) => {
                const points = shape.points.map((p: any) => ({
                    x: (p.x / naturalWidth) * canvasWidth,
                    y: (p.y / naturalHeight) * canvasHeight,
                }));
                if (shape.shape_type === "line") {
                    const [p1, p2] = points;
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                    const line = new fabric.Line([0, 0, length, 0], {
                        left: p1.x,
                        top: p1.y,
                        angle: angle,
                        stroke: "red",
                        strokeWidth: 4,
                        selectable: true,
                        hasBorders: true,
                        cornerColor: "red",
                        cornerStrokeColor: "red",
                        transparentCorners: true,
                        strokeUniform: true,
                        objectCaching: false,
                    });
                    line.set({
                        originX: "left",
                        originY: "top",
                        cornerStyle: "circle",
                    });
                    (line as any).id = shape.id || crypto.randomUUID();
                    (line as any).surface_type = shape.surface_type || "custom";
                    (line as any).label = shape.label || "";
                    (line as any).waste_percentage = shape.waste_percentage ?? 0;

                    ["tl", "tr", "bl", "br", "mt", "mb", "mtr"].forEach((key) => {
                        line.setControlVisible(key, false);
                    });

                    (line as any).label = shape.label || "";
                    const text = new fabric.IText(shape.magnitude || "0.00 ft", {
                        fontSize: FONT_SIZE,
                        fontWeight: FONT_WEIGHT,
                        fill: FONT_COLOR,
                        stroke: FONT_STROKE,
                        strokeWidth: STROKE_WIDTH,
                        selectable: false,
                        evented: false,
                    });
                    text.set({
                        originX: "center",
                        originY: "bottom",
                    });

                    // const label_ = new fabric.IText(shape.label || "", {
                    //     fontSize: 14,
                    //     fill: "red",
                    //     selectable: false,
                    //     evented: false,
                    // });
                    // label_.set({
                    //     originX: "center",
                    //     originY: "bottom",
                    // });
                    //
                    // const type_ = new fabric.IText(shape.surface_type || "", {
                    //     fontSize: 14,
                    //     fill: "red",
                    //     selectable: false,
                    //     evented: false,
                    // });
                    // type_.set({
                    //     originX: "center",
                    //     originY: "bottom",
                    // });

                    (line as any).associatedText = text;
                    // (line as any).associatedLabel = label_;
                    // (line as any).associatedType = type_;

                    const updateText = () =>
                        updateLineLength({
                            line,
                            text,
                            canvas,
                            scale: scaleRef.current,
                            scalePoints: scalePointsRef.current,
                            naturalWidth: imageDimensionsRef.current.naturalWidth,
                        });

                    const onLineChanged = () => {
                        line.setCoords();
                        updateText();
                        syncLinePoints(line, canvas);
                        autosave();
                    };

                    line.on("moving", onLineChanged);
                    line.on("scaling", onLineChanged);
                    line.on("modified", onLineChanged);
                    line.on("rotating", onLineChanged);

                    canvas.add(line, text); // , label_, type_);
                    line.setCoords();
                    const vertexCircles = createLineVertexPoints(
                        line,
                        canvas,
                        updateText,
                        syncLinePoints,
                        autosave,
                    );

                    (line as any).vertexCircles = vertexCircles;

                    syncLinePoints(line, canvas);
                    updateText();
                } else if (shape.shape_type === "polygon") {
                    const polygon = new fabric.Polygon(points, {
                        fill: "rgba(255, 0, 0, 0.2)",
                        stroke: "red",
                        strokeWidth: 3,
                        selectable: true,
                        hasControls: true,
                        strokeUniform: true,
                        cornerColor: "red",
                        cornerStrokeColor: "red",
                        transparentCorners: true,
                        lockRotation: true,
                    });
                    polygon.set({
                        originX: "left",
                        originY: "top",
                        cornerStyle: "circle",
                    });
                    (polygon as any).id = shape.id || crypto.randomUUID();
                    polygon.setControlVisible("mtr", false);
                    (polygon as any).surface_type = shape.surface_type || "custom";
                    (polygon as any).label = shape.label || "";
                    (polygon as any).waste_percentage = shape.waste_percentage ?? 0;
                    const text = new fabric.IText(shape.magnitude || "0.00 sq ft", {
                        fontSize: FONT_SIZE,
                        fontWeight: FONT_WEIGHT,
                        fill: FONT_COLOR,
                        stroke: FONT_STROKE,
                        strokeWidth: STROKE_WIDTH,
                        selectable: false,
                        evented: false,
                    });
                    text.set({
                        originX: "center",
                        originY: "bottom",
                    });

                    // const label_ = new fabric.IText(shape.label || "", {
                    //     fontSize: 14,
                    //     fill: "red",
                    //     selectable: false,
                    //     evented: false,
                    // });
                    // label_.set({
                    //     originX: "center",
                    //     originY: "bottom",
                    // });
                    //
                    // const type_ = new fabric.IText(shape.surface_type || "", {
                    //     fontSize: 14,
                    //     fill: "red",
                    //     selectable: false,
                    //     evented: false,
                    // });
                    // type_.set({
                    //     originX: "center",
                    //     originY: "bottom",
                    // });

                    (polygon as any).associatedText = text;
                    // (polygon as any).associatedLabel = label_;
                    // (polygon as any).associatedType = type_;

                    const center = polygon.getCenterPoint();
                    text.set({ left: center.x, top: center.y });
                    // label_.set({ left: center.x, top: center.y - 30 });
                    // type_.set({ left: center.x, top: center.y - 15 });

                    const updatePolygonText = () => {
                        const newArea = calculatePolygonArea(
                            polygon,
                            scaleRef.current,
                            scalePointsRef.current,
                            imageDimensionsRef.current,
                            canvas,
                        );
                        const newCenter = polygon.getCenterPoint();
                        text.set({
                            text: `${outPolygonArea(newArea)}`,
                            left: newCenter.x,
                            top: newCenter.y,
                        });
                        // label_.set({
                        //     left: newCenter.x,
                        //     top: newCenter.y - 30,
                        // });
                        // type_.set({
                        //     left: newCenter.x,
                        //     top: newCenter.y - 15,
                        // });
                        canvas.renderAll();
                    };

                    (polygon as any).updateTextFn = updatePolygonText;

                    const onPolygonChanged = () => {
                        polygon.setCoords();
                        updatePolygonText();
                        syncVertexCircles(polygon, canvas);
                        autosave();
                    };

                    polygon.on("moving", onPolygonChanged);
                    polygon.on("scaling", onPolygonChanged);
                    polygon.on("modified", onPolygonChanged);

                    canvas.add(polygon, text); //, label_, type_);
                    polygon.setCoords();
                    updatePolygonText();

                    const vertexCircles: fabric.Circle[] = [];

                    polygon.points.forEach((point, idx) => {
                        const circle = new fabric.Circle({
                            left: point.x,
                            top: point.y,
                            radius: 6,
                            fill: "white",
                            stroke: "red",
                            strokeWidth: 1,
                            selectable: true,
                            hasControls: false,
                            hoverCursor: "pointer",
                        });
                        circle.set({
                            originX: "center",
                            originY: "center",
                        });

                        // Связываем точку с полигоном и индексом
                        (circle as any).belongsTo = polygon;
                        (circle as any).vertexIndex = idx;

                        vertexCircles.push(circle);
                        circle.on("moving", () => {
                            const poly = (circle as any).belongsTo as fabric.Polygon;
                            const idx = (circle as any).vertexIndex as number;

                            if (!poly || idx === undefined) return;

                            const matrix = poly.calcTransformMatrix();
                            const inverseMatrix = fabric.util.invertTransform(matrix);

                            // Получаем новую позицию точки
                            const newX = circle.left! + circle.radius! / 2;
                            const newY = circle.top! + circle.radius! / 2;

                            const localPoint = new fabric.Point(newX, newY).transform(
                                inverseMatrix,
                            );

                            const adjustedX = localPoint.x + poly.pathOffset.x;
                            const adjustedY = localPoint.y + poly.pathOffset.y;

                            // Обновляем точку в массиве
                            poly.points[idx].x = adjustedX;
                            poly.points[idx].y = adjustedY;

                            // Перерисовываем полигон
                            // poly.set({ dirty: true });
                            // poly.setCoords();
                            updatePolygonBoundingBox(poly);
                            // poly.setBoundingBox();
                            canvas.renderAll();

                            // Обновляем текст (площадь)
                            const updateFn = (poly as any).updateTextFn;
                            if (updateFn) updateFn();
                            syncVertexCircles(poly, canvas);
                            autosave();
                        });
                        canvas.add(circle);
                    });

                    // Сохраняем ссылки на точки внутри полигона
                    (polygon as any).vertexCircles = vertexCircles;
                }
            });

            canvas.renderAll();
        };

        loadShapes();
    }, [
        baseImageUrl,
        scalePoints,
        measurementId,
        imageDimensions.naturalWidth,
        imageDimensions.naturalHeight,
    ]);

    const handleBackAndSave = () => {
        // saveShapesLocally();
        router.back();
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);
    // ───────────────────────────────────────────────
    // UI
    // ───────────────────────────────────────────────
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={handleBackAndSave} className="btn btn-outline">
                        ← Back
                    </button>
                    <button
                        onClick={() => {
                            setIsMagnifierActive((prev) => {
                                // console.log("---set is magnifier actinv: ", prev);
                                if (prev) {
                                    magnifierRef.current?.hide();
                                }
                                return !prev;
                            });
                        }}
                        className={`btn ${isMagnifierActive ? "btn-danger" : "btn-outline"}`}
                    >
                        🔍 Magnify
                    </button>
                    {activeTool === "select" && hasSelection && (
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleEditMetadata}
                        >
                            Edit Metadata
                        </button>
                    )}
                </div>

                {scale !== null && (
                    <div className="text-lg font-semibold">Scale: {scale.toFixed(2)} ft</div>
                )}
            </div>

            <div ref={canvasWrapperRef} className="relative border shadow-md w-full h-[70vh]">
                <div className="relative border shadow-md w-full h-[70vh]">
                    <canvas ref={canvasRef} />
                    <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur rounded-lg p-2 flex gap-2">
                        <button
                            type="button"
                            className={`btn btn-sm ${activeTool === "select" ? "btn-danger" : "btn-outline"}`}
                            onClick={() => {
                                setActiveTool("select");
                                startPointRef.current = null;
                                polygonPointsRef.current = [];
                                setPolygonPointCount(0);
                            }}
                        >
                            Select
                        </button>

                        <button
                            type="button"
                            className={`btn btn-sm ${activeTool === "line" ? "btn-danger" : "btn-outline"}`}
                            onClick={() => {
                                setActiveTool("line");
                            }}
                        >
                            Line
                        </button>

                        <button
                            type="button"
                            className={`btn btn-sm ${activeTool === "polygon" ? "btn-danger" : "btn-outline"}`}
                            onClick={() => {
                                setActiveTool("polygon");
                            }}
                        >
                            Polygon
                        </button>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            {saveStatus === "saving" && <span>Saving…</span>}
                            {saveStatus === "saved" && (
                                <span className="text-green-400">Saved</span>
                            )}
                            {saveStatus === "error" && (
                                <span className="text-red-400">Save failed</span>
                            )}
                        </div>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                        {activeTool === "polygon" && polygonPointCount >= 3 && (
                            <button className="btn btn-danger shadow-lg" onClick={finalizePolygon}>
                                Finish Polygon
                            </button>
                        )}

                        {activeTool === "select" && hasSelection && (
                            <button
                                className="btn btn-outline btn-error shadow-lg"
                                onClick={handleDeleteSelected}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
                <MeasurementLegend
                    items={legendItems}
                    onSelect={selectShapeById}
                    isExpanded={isLegendExpanded}
                    onToggle={() => setIsLegendExpanded(!isLegendExpanded)}
                />
            </div>

            {editingMetadata && (
                <ShapeMetadataModal
                    isOpen={true}
                    initialData={{
                        label: editingMetadata.label,
                        surface_type: editingMetadata.surface_type,
                        waste_percentage: editingMetadata.waste_percentage,
                    }}
                    onSave={handleMetadataSave}
                    onCancel={handleMetadataCancel}
                />
            )}
        </div>
    );
}
