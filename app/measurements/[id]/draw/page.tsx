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
    const tempLineRef = useRef<fabric.Line | null>(null);
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

    // ───────────────────────────────────────────────
    // Handler for drawing lines
    // ───────────────────────────────────────────────
    const handleMouseDown = (opt: fabric.TEvent) => {
        // if (activeToolRef.current !== "line" || scaleRef.current === null || !fabricRef.current)
        //     return;

        if (!fabricRef.current || !opt.e) return;

        if (opt.e instanceof MouseEvent) {
            console.log("Button", opt.e.button);
            if (opt.e.button === 2) {
                console.log(activeToolRef.current);
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

                const tempLine = new fabric.Line(
                    [currentPoint.x, currentPoint.y, currentPoint.x, currentPoint.y],
                    {
                        stroke: "red",
                        strokeWidth: 2,
                        strokeDashArray: [5, 5],
                        selectable: false,
                        evented: false,
                    },
                );
                tempLineRef.current = tempLine;
                canvas.add(tempLine);

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
                tempTextRef.current = tempText;
                canvas.add(tempText);
                canvas.renderAll();
                return;
            }

            // Second click - create final line
            const startPoint = startPointRef.current;
            startPointRef.current = null;

            // Удаляем временные объекты
            if (tempLineRef.current) {
                canvas.remove(tempLineRef.current);
                tempLineRef.current = null;
            }
            if (tempTextRef.current) {
                canvas.remove(tempTextRef.current);
                tempTextRef.current = null;
            }

            // Create final line
            const line = new fabric.Line(
                [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y],
                {
                    stroke: "red",
                    strokeWidth: 4,
                    selectable: true,
                    // hasControls: true,
                    hasBorders: true,
                    cornerColor: "red",
                    cornerStyle: "circle",
                    cornerStrokeColor: "red",
                    transparentCorners: true,
                },
            );
            ["ml", "mt", "mr", "mb"].forEach((key) => {
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
            line.on("rotating", updateText);
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
            // Игнорируем правый клик (будет использоваться для завершения)
            if (opt.e instanceof MouseEvent && opt.e.button === 2) return;

            polygonPointsRef.current.push(currentPoint);

            // Создаем/обновляем временный полигон
            if (polygonPointsRef.current.length >= 2) {
                // Удаляем старый временный полигон
                if (tempPolygonRef.current) {
                    canvas.remove(tempPolygonRef.current);
                    tempPolygonRef.current = null;
                }
                if (tempPolygonTextRef.current) {
                    canvas.remove(tempPolygonTextRef.current);
                    tempPolygonTextRef.current = null;
                }

                // Создаем новый временный полигон
                const tempPolygon = new fabric.Polygon(polygonPointsRef.current, {
                    fill: "rgba(255, 0, 0, 0.1)",
                    stroke: "red",
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                });
                tempPolygonRef.current = tempPolygon;
                canvas.add(tempPolygon);

                // Расчёт площади для временного полигона
                const areaSqFt = calculatePolygonArea(polygonPointsRef.current);
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
                tempPolygonTextRef.current = tempText;
                canvas.add(tempText);
            }

            canvas.renderAll();
            return;
        }
    };

    // Обработчик двойного клика (завершение полигона)
    const handleDblClick = (opt: fabric.TEvent) => {
        if (activeToolRef.current !== "polygon" || polygonPointsRef.current.length < 5) return;

        finalizePolygon();
    };

    const finalizePolygon = () => {
        if (!fabricRef.current || polygonPointsRef.current.length < 5) return;

        const canvas = fabricRef.current;

        // Удаляем временные объекты
        if (tempPolygonRef.current) {
            canvas.remove(tempPolygonRef.current);
            tempPolygonRef.current = null;
        }
        if (tempPolygonTextRef.current) {
            canvas.remove(tempPolygonTextRef.current);
            tempPolygonTextRef.current = null;
        }

        // Создаем финальный полигон
        const finalPolygon = new fabric.Polygon(polygonPointsRef.current, {
            fill: "rgba(255, 0, 0, 0.2)",
            stroke: "red",
            strokeWidth: 3,
            selectable: true,
            hasControls: true,
        });

        // Текст с площадью
        const areaSqFt = calculatePolygonArea(polygonPointsRef.current);
        const text = new fabric.IText(`${areaSqFt.toFixed(2)} sq ft`, {
            fontSize: 14,
            fill: "red",
            originX: "center",
            originY: "bottom",
            selectable: false,
            evented: false,
        });

        // Центрируем текст
        const center = finalPolygon.getCenterPoint();
        text.set({ left: center.x, top: center.y });

        // Обновление текста при изменении
        const updatePolygonText = () => {
            const newArea = calculatePolygonArea(finalPolygon.points);
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

        // Сбрасываем состояние
        polygonPointsRef.current = [];
        canvas.renderAll();
    };

    // Расчёт площади полигона (shoelace formula)
    const calculatePolygonArea = (points: { x: number; y: number }[]): number => {
        if (points.length < 3) return 0;

        // Пиксельная площадь
        let pixelArea = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            pixelArea += points[i].x * points[j].y;
            pixelArea -= points[j].x * points[i].y;
        }
        pixelArea = Math.abs(pixelArea) / 2;

        // Перевод в кв. футы
        if (
            scaleRef.current === null ||
            scalePointsRef.current.length !== 2 ||
            imageDimensionsRef.current.naturalWidth === 0
        ) {
            return 0;
        }

        const scaleLinePx = Math.sqrt(
            Math.pow(scalePointsRef.current[1].x - scalePointsRef.current[0].x, 2) +
                Math.pow(scalePointsRef.current[1].y - scalePointsRef.current[0].y, 2),
        );

        const displayedWidth = fabricRef.current?.getWidth() || 1;
        const scaleRatio = imageDimensionsRef.current.naturalWidth / displayedWidth;
        const pixelAreaNatural = pixelArea * scaleRatio ** 2;
        const scaleLinePxNatural = scaleLinePx * scaleRatio;

        // Площадь масштабной линии в кв. пикселях
        const scaleAreaPx = scaleLinePxNatural ** 2;
        // Площадь в кв. футах
        const areaSqFt = (pixelAreaNatural / scaleAreaPx) * scaleRef.current ** 2;

        return areaSqFt;
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

        canvas.on("mouse:down", handleMouseDown);
        canvas.on("mouse:dblclick", handleDblClick);

        const resizeCanvas = () => {
            if (!canvasWrapperRef.current) return;
            const width = canvasWrapperRef.current.clientWidth;
            const height = canvasWrapperRef.current.clientHeight;
            canvas.setDimensions({ width, height });
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        return () => {
            canvas.off("mouse:down", handleMouseDown);
            canvas.off("mouse:dblclick", handleDblClick);
            window.removeEventListener("resize", resizeCanvas);
            canvas.dispose();
        };
    }, []);

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

    // ───────────────────────────────────────────────
    // UI
    // ───────────────────────────────────────────────
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => router.back()} className="btn">
                    ← Back
                </button>
                {scale !== null && (
                    <div className="text-lg font-semibold">Scale: {scale.toFixed(2)} ft</div>
                )}
            </div>

            <div ref={canvasWrapperRef} className="border shadow-md w-full h-[70vh]">
                <canvas ref={canvasRef} />
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    className={`btn ${activeTool === "select" ? "btn-danger" : "btn-outline"}`}
                    onClick={() => {
                        setActiveTool("select");
                        startPointRef.current = null;
                        polygonPointsRef.current = [];
                        if (fabricRef.current) {
                            if (tempLineRef.current) fabricRef.current.remove(tempLineRef.current);
                            if (tempTextRef.current) fabricRef.current.remove(tempTextRef.current);
                            if (tempPolygonRef.current)
                                fabricRef.current.remove(tempPolygonRef.current);
                            if (tempPolygonTextRef.current)
                                fabricRef.current.remove(tempPolygonTextRef.current);
                            tempLineRef.current = null;
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
                <button type="button" className="btn btn-outline">
                    Delete
                </button>
            </div>
        </div>
    );
}
