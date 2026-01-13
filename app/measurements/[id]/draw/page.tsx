"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/providers/toast-provider";
import * as fabric from "fabric";

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

    // ───────────────────────────────────────────────
    // Handler for drawing lines
    // ───────────────────────────────────────────────
    const handleMouseDown = (opt: fabric.TEvent) => {
        if (!fabricRef.current || !opt.e) return;

        if (opt.e instanceof MouseEvent) {
            if (opt.e.button === 2) {
                if (activeToolRef.current === "polygon" && polygonPointsRef.current.length >= 3) {
                    finalizePolygon();
                }
                opt.e.preventDefault();
                return;
            }
        }

        const canvas = fabricRef.current;
        const pointer = canvas.getScenePoint(opt.e);
        const currentPoint = new fabric.Point(pointer.x, pointer.y);

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
                    originX: "center",
                    originY: "center",
                });

                (tempCircle as any).isTemp = true;
                tempStartPointRef.current = tempCircle;
                canvas.add(tempCircle);

                const tempText = new fabric.IText("Click second point", {
                    fontSize: 12,
                    fill: "red",
                    originX: "center",
                    originY: "bottom",
                    selectable: false,
                    evented: false,
                    left: currentPoint.x,
                    top: currentPoint.y - 10,
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
                originX: "left",
                originY: "center",
                angle: angle,
                stroke: "red",
                strokeWidth: 4,
                strokeDashArray: [],
                selectable: true,
                hasBorders: true,
                cornerColor: "red",
                cornerStyle: "circle",
                cornerStrokeColor: "red",
                transparentCorners: true,
            });

            ["tl", "tr", "bl", "br", "mt", "mb"].forEach((key) => {
                line.setControlVisible(key, false);
            });

            const text = new fabric.IText("0.00 ft", {
                fontSize: 14,
                fill: "red",
                originX: "center",
                originY: "bottom",
                selectable: false,
                evented: false,
            });

            (line as any).associatedText = text;

            // Calculate Scale
            const scaleLinePx = Math.sqrt(
                Math.pow(scalePointsRef.current[1].x - scalePointsRef.current[0].x, 2) +
                    Math.pow(scalePointsRef.current[1].y - scalePointsRef.current[0].y, 2),
            );

            // Update length and position
            const updateText = () => {
                const coords = line.getCoords();
                const finalP1 = coords[0];
                const finalP2 = coords[2];

                // Calculating the length in feet
                if (
                    scaleRef.current === null ||
                    scalePointsRef.current.length !== 2 ||
                    imageDimensionsRef.current.naturalWidth === 0
                ) {
                    text.set({ text: "–" });
                    return;
                }

                const currentLinePx = finalP2.distanceFrom(finalP1);
                const displayedWidth = canvas.getWidth();
                const scaleRatio = imageDimensionsRef.current.naturalWidth / displayedWidth;
                const currentLinePxNatural = currentLinePx * scaleRatio;
                const lengthFt = (currentLinePxNatural / scaleLinePx) * scaleRef.current;
                // Text position
                const lineCenterX = (finalP1.x + finalP2.x) / 2 - 25;
                const lineCenterY = (finalP1.y + finalP2.y) / 2 - 10;
                text.set({
                    left: lineCenterX,
                    top: lineCenterY,
                    text: `${lengthFt.toFixed(2)} ft`,
                });
            };

            // Events
            line.on("moving", updateText);
            line.on("scaling", updateText);
            line.on("modified", updateText);

            canvas.add(line, text);
            canvas.setActiveObject(line);
            updateText();
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
                });
                (tempPolygon as any).isTemp = true;
                tempPolygonRef.current = tempPolygon;
                canvas.add(tempPolygon);

                // Calculating the area for a temporary polygon
                // const areaSqFt = calculatePolygonArea(polygonPointsRef.current);
                const areaSqFt = calculatePolygonArea(tempPolygon);
                const tempText = new fabric.IText(`${areaSqFt.toFixed(2)} sq ft`, {
                    fontSize: 14,
                    fill: "red",
                    originX: "center",
                    originY: "bottom",
                    selectable: false,
                    evented: false,
                    left: currentPoint.x,
                    top: currentPoint.y - 10,
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
        if (activeToolRef.current !== "polygon" || polygonPointsRef.current.length <= 3) return;

        finalizePolygon();
    };

    const finalizePolygon = () => {
        if (!fabricRef.current || polygonPointsRef.current.length <= 3) return;

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
        });

        finalPolygon.set({
            originX: "left",
            originY: "top",
            cornerStyle: "circle",
        });

        //const areaSqFt = calculatePolygonArea(polygonPointsRef.current);
        const areaSqFt = calculatePolygonArea(finalPolygon);
        const text = new fabric.IText(`${areaSqFt.toFixed(2)} sq ft`, {
            fontSize: 14,
            fill: "red",
            selectable: false,
            evented: false,
        });
        text.set({
            originX: "center",
            originY: "bottom",
        });

        (finalPolygon as any).associatedText = text;
        // (text as any).associatedShape = finalPolygon;

        const center = finalPolygon.getCenterPoint();
        text.set({ left: center.x, top: center.y });

        const updatePolygonText = () => {
            // const newArea = calculatePolygonArea(finalPolygon.points);
            const newArea = calculatePolygonArea(finalPolygon);
            const newCenter = finalPolygon.getCenterPoint();
            text.set({
                text: `${newArea.toFixed(2)} sq ft`,
                left: newCenter.x,
                top: newCenter.y,
            });
            canvas.renderAll();
        };

        finalPolygon.on("moving", updatePolygonText);
        finalPolygon.on("scaling", updatePolygonText);
        finalPolygon.on("modified", updatePolygonText);

        canvas.add(finalPolygon, text);
        canvas.setActiveObject(finalPolygon);
        polygonPointsRef.current = [];
        canvas.renderAll();
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
            canvas.remove(obj);
        });

        // Removing the selection
        canvas.discardActiveObject();
        canvas.renderAll();
    };

    const calculatePolygonArea = (polygon: fabric.Polygon): number => {
        if (polygon.points.length < 3) return 0;

        // Get the transformation matrix
        const matrix = polygon.calcTransformMatrix();

        // Transform all the points taking into account the transformation
        const transformedPoints = applyTransformToPoints(polygon.points, matrix);

        // Calculate the area using the lacing formula
        let pixelArea = 0;
        const n = transformedPoints.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            pixelArea += transformedPoints[i].x * transformedPoints[j].y;
            pixelArea -= transformedPoints[j].x * transformedPoints[i].y;
        }
        pixelArea = Math.abs(pixelArea) / 2;

        // Checking the scale
        if (scaleRef.current === null || scalePointsRef.current.length !== 2) {
            return 0;
        }

        const canvasWidth = fabricRef.current?.getWidth() || 1;
        const canvasHeight = fabricRef.current?.getHeight() || 1;
        const naturalWidth = imageDimensionsRef.current.naturalWidth;
        const naturalHeight = imageDimensionsRef.current.naturalHeight;

        const [p1Nat, p2Nat] = scalePointsRef.current;
        const p1Canvas = {
            x: (p1Nat.x / naturalWidth) * canvasWidth,
            y: (p1Nat.y / naturalHeight) * canvasHeight,
        };
        const p2Canvas = {
            x: (p2Nat.x / naturalWidth) * canvasWidth,
            y: (p2Nat.y / naturalHeight) * canvasHeight,
        };

        const scaleLinePx = Math.sqrt(
            Math.pow(p2Canvas.x - p1Canvas.x, 2) + Math.pow(p2Canvas.y - p1Canvas.y, 2),
        );

        const feetPerPx = scaleRef.current / scaleLinePx;
        const areaSqFt = pixelArea * (feetPerPx * feetPerPx);

        return areaSqFt;
    };

    // ───────────────────────────────────────────────
    // Saving shape data
    // ───────────────────────────────────────────────
    const handleSaveShapes = async () => {
        if (!fabricRef.current || !measurementId) {
            toast({ title: "Error", description: "No measurement ID or canvas available." });
            return;
        }

        const canvas = fabricRef.current;
        const naturalWidth = imageDimensions.naturalWidth;
        const naturalHeight = imageDimensions.naturalHeight;
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
            const label = (obj as any).associatedText?.text || "";
            const wastePercentage = 0;
            if (obj.type === "line") {
                const coords = obj.getCoords();
                points = [
                    {
                        x: (coords[0].x / canvasWidth) * naturalWidth,
                        y: (coords[0].y / canvasHeight) * naturalHeight,
                    },
                    {
                        x: (coords[2].x / canvasWidth) * naturalWidth,
                        y: (coords[2].y / canvasHeight) * naturalHeight,
                    },
                ];
                console.log("Line points: ", points);
            } else if (obj.type === "polygon") {
                const poly = obj as fabric.Polygon;
                const matrix = poly.calcTransformMatrix();

                const globalPoints = poly.points.map((point) => {
                    const transformed = new fabric.Point(point.x, point.y).transform(matrix);
                    return new fabric.Point(
                        transformed.x - poly.pathOffset.x * poly.scaleX, // + poly.left + pathOffset.x,
                        transformed.y - poly.pathOffset.y * poly.scaleY, // + poly.top + pathOffset.y,
                    );
                });

                points = globalPoints.map((pt) => ({
                    x: (pt.x / canvasWidth) * naturalWidth,
                    y: (pt.y / canvasHeight) * naturalHeight,
                }));
                console.log("Poly points: ", points);
            }

            return {
                measurement_session_id: measurementId,
                shape_type: shapeType,
                label: label,
                type: "custom",
                waste_percentage: wastePercentage,
                points: points,
            };
        });

        try {
            // clear the shapes
            const shapesClearRes = await fetch(`/api/measurements/${measurementId}/shapes`, {
                method: "DELETE",
            });

            if (!shapesClearRes.ok) {
                throw new Error("Failed to clear shapes");
            }

            // toast({ title: "Success", description: "Shapes cleared successfully!" });
        } catch (error) {
            // toast({ title: "Error", description: "Failed to clear shapes." });
            console.error(error);
        }

        try {
            const res = await fetch(`/api/measurements/${measurementId}/shapes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shapes: shapesToSave }),
            });

            if (!res.ok) throw new Error("Failed to save shapes");

            toast({ title: "Success", description: "Shapes saved successfully!" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to save shapes." });
            console.error(error);
        }
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
    // useEffect(() => {
    //     if (!canvasRef.current) return;
    //
    //     const canvas = new fabric.Canvas(canvasRef.current, {
    //         preserveObjectStacking: true,
    //         selection: true,
    //         backgroundColor: "transparent",
    //     });
    //     fabricRef.current = canvas;
    //
    //     canvas.on("mouse:down", handleMouseDown);
    //     canvas.on("mouse:dblclick", handleDblClick);
    //
    //     const resizeCanvas = () => {
    //         if (!canvasWrapperRef.current) return;
    //         const width = canvasWrapperRef.current.clientWidth;
    //         const height = canvasWrapperRef.current.clientHeight;
    //         canvas.setDimensions({ width, height });
    //     };
    //
    //     resizeCanvas();
    //     window.addEventListener("resize", resizeCanvas);
    //
    //     return () => {
    //         canvas.off("mouse:down", handleMouseDown);
    //         canvas.off("mouse:dblclick", handleDblClick);
    //         window.removeEventListener("resize", resizeCanvas);
    //         canvas.dispose();
    //     };
    // }, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: "transparent",
        });
        fabricRef.current = canvas;

        canvas.on("mouse:down", handleMouseDown);
        canvas.on("mouse:dblclick", handleDblClick);

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
                //         const p2 = { x: coords[2].x, y: coords[2].y };
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
            canvas.off("mouse:down", handleMouseDown);
            canvas.off("mouse:dblclick", handleDblClick);
            window.removeEventListener("resize", resizeAndScaleContent);
            canvas.dispose();
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
            try {
                const res = await fetch(`/api/measurements/${measurementId}/shapes`);
                const data = await res.json();
                if (!data.shapes || !Array.isArray(data.shapes)) return;

                const canvas = fabricRef.current!;
                const naturalWidth = imageDimensions.naturalWidth;
                const naturalHeight = imageDimensions.naturalHeight;
                const canvasWidth = canvas.getWidth();
                const canvasHeight = canvas.getHeight();

                data.shapes.forEach((shape: any) => {
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
                        });
                        line.set({
                            originX: "left",
                            originY: "center",
                            cornerStyle: "circle",
                        });

                        ["tl", "tr", "bl", "br", "mt", "mb"].forEach((key) => {
                            line.setControlVisible(key, false);
                        });

                        const text = new fabric.IText(shape.label || "0.00 ft", {
                            fontSize: 14,
                            fill: "red",
                            selectable: false,
                            evented: false,
                        });
                        text.set({
                            originX: "center",
                            originY: "bottom",
                        });

                        (line as any).associatedText = text;

                        const updateText = () => {
                            const coords = line.getCoords();
                            const finalP1 = coords[0];
                            const finalP2 = coords[2];

                            if (
                                scaleRef.current === null ||
                                scalePointsRef.current.length !== 2 ||
                                imageDimensionsRef.current.naturalWidth === 0
                            ) {
                                text.set({ text: "–" });
                                return;
                            }

                            const currentLinePx = finalP2.distanceFrom(finalP1);
                            const displayedWidth = canvas.getWidth();
                            const scaleRatio =
                                imageDimensionsRef.current.naturalWidth / displayedWidth;
                            const currentLinePxNatural = currentLinePx * scaleRatio;
                            const scaleLinePx = Math.sqrt(
                                Math.pow(
                                    scalePointsRef.current[1].x - scalePointsRef.current[0].x,
                                    2,
                                ) +
                                    Math.pow(
                                        scalePointsRef.current[1].y - scalePointsRef.current[0].y,
                                        2,
                                    ),
                            );
                            const lengthFt =
                                (currentLinePxNatural / scaleLinePx) * scaleRef.current;

                            const lineCenterX = (finalP1.x + finalP2.x) / 2 - 25;
                            const lineCenterY = (finalP1.y + finalP2.y) / 2 - 10;
                            text.set({
                                left: lineCenterX,
                                top: lineCenterY,
                                text: `${lengthFt.toFixed(2)} ft`,
                            });
                        };

                        line.on("moving", updateText);
                        line.on("scaling", updateText);
                        line.on("modified", updateText);

                        canvas.add(line, text);
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
                        });
                        polygon.set({
                            originX: "left",
                            originY: "top",
                            cornerStyle: "circle",
                        });

                        const text = new fabric.IText(shape.label || "0.00 sq ft", {
                            fontSize: 14,
                            fill: "red",
                            selectable: false,
                            evented: false,
                        });
                        text.set({
                            originX: "center",
                            originY: "bottom",
                        });

                        (polygon as any).associatedText = text;

                        const center = polygon.getCenterPoint();
                        text.set({ left: center.x, top: center.y });

                        const updatePolygonText = () => {
                            const newArea = calculatePolygonArea(polygon);
                            const newCenter = polygon.getCenterPoint();
                            text.set({
                                text: `${newArea.toFixed(2)} sq ft`,
                                left: newCenter.x,
                                top: newCenter.y,
                            });
                            canvas.renderAll();
                        };

                        polygon.on("moving", updatePolygonText);
                        polygon.on("scaling", updatePolygonText);
                        polygon.on("modified", updatePolygonText);

                        canvas.add(polygon, text);
                    }
                });

                canvas.renderAll();
            } catch (error) {
                console.error("Error loading shapes:", error);
            }
        };

        loadShapes();
    }, [
        baseImageUrl,
        scalePoints,
        measurementId,
        imageDimensions.naturalWidth,
        imageDimensions.naturalHeight,
    ]);
    // ───────────────────────────────────────────────
    // UI
    // ───────────────────────────────────────────────
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="btn">
                        ← Back
                    </button>
                    <button type="button" className="btn btn-success" onClick={handleSaveShapes}>
                        Save Shapes
                    </button>
                </div>

                {scale !== null && (
                    <div className="text-lg font-semibold">Scale: {scale.toFixed(2)} ft</div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    className={`btn ${activeTool === "select" ? "btn-danger" : "btn-outline"}`}
                    onClick={() => {
                        setActiveTool("select");
                        startPointRef.current = null;
                        polygonPointsRef.current = [];
                        if (fabricRef.current) {
                            if (tempStartPointRef.current)
                                fabricRef.current.remove(tempStartPointRef.current);
                            if (tempTextRef.current) fabricRef.current.remove(tempTextRef.current);
                            if (tempPolygonRef.current)
                                fabricRef.current.remove(tempPolygonRef.current);
                            if (tempPolygonTextRef.current)
                                fabricRef.current.remove(tempPolygonTextRef.current);
                            tempStartPointRef.current = null;
                            tempTextRef.current = null;
                            tempPolygonRef.current = null;
                            tempPolygonTextRef.current = null;
                        }
                    }}
                >
                    Select
                </button>
                <button
                    type="button"
                    className={`btn ${activeTool === "line" ? "btn-danger" : "btn-outline"}`}
                    onClick={() => {
                        setActiveTool("line");
                    }}
                >
                    Line
                </button>

                <button
                    type="button"
                    className={`btn ${activeTool === "polygon" ? "btn-danger" : "btn-outline"}`}
                    onClick={() => {
                        setActiveTool("polygon");
                    }}
                >
                    Polygon
                </button>
                <button type="button" className="btn btn-outline" onClick={handleDeleteSelected}>
                    Delete
                </button>
                {activeTool === "polygon" && (
                    <span className="text-sm text-gray-300 ml-2">
                        Double-click to complete the polygon creation.
                    </span>
                )}
            </div>

            <div ref={canvasWrapperRef} className="border shadow-md w-full h-[70vh]">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}
