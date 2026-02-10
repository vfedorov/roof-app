"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/providers/toast-provider";
import { supabase } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ui/confirm-dialog";
import StaticMeasurementLegend from "@/app/components/StaticMeasurementLegend";
import { formatWasteValue, LegendItem, TYPE_COLORS } from "@/lib/measurements/useMeasurementLegend";
import { getDefaultWastePercentage } from "@/lib/measurements/shapes";
import { MeasurementSummaryPanel } from "@/app/components/MeasurementSummaryPanel";
import { getDefaultWaste } from "@/lib/measurements/types";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const FONT_SIZE = 100;

interface MeasurementImage {
    id: number;
    measurement_session_id: string;
    image_url: string;
    is_base_image: boolean;
    created_at: string;
}

interface ImageDimensions {
    [key: number]: {
        naturalWidth: number;
        naturalHeight: number;
        displayedWidth: number;
        displayedHeight: number;
    };
}

export default function MeasurementImageManager({
    measurementId,
    allowUpload = false,
}: {
    measurementId: string;
    allowUpload: boolean;
}) {
    const { toast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [images, setImages] = useState<MeasurementImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmBaseImage, setConfirmBaseImage] = useState<MeasurementImage | null>(null);
    const [confirmDeleteImage, setConfirmDeleteImage] = useState<MeasurementImage | null>(null);
    const [scalePoints, setScalePoints] = useState<{ x: number; y: number }[]>([]);
    const [scale, setScale] = useState<number | null>(null);
    const [shapes, setShapes] = useState<any[]>([]);
    const [workingAreaShapes, setWorkingAreaShapes] = useState<any[]>([]);

    const router = useRouter();
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({});

    const handleImageLoad = (imgId: number, e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        setImageDimensions((prev) => ({
            ...prev,
            [imgId]: {
                naturalWidth: target.naturalWidth,
                naturalHeight: target.naturalHeight,
                displayedWidth: target.clientWidth,
                displayedHeight: target.clientHeight,
            },
        }));
    };
    // --------------------------------------------------
    // Load images
    // --------------------------------------------------
    const loadImages = async () => {
        if (!measurementId) return;

        const res = await fetch(`/api/measurements/${measurementId}/images`);
        if (!res.ok) {
            toast({ title: "Failed to load images", variant: "destructive" });
            return;
        }

        const data = await res.json();
        setImages(data);
    };

    const serializeWorkingShapes = (shapesFromLocal?: any[]): any[] => {
        let objects: any[];
        if (shapesFromLocal && Array.isArray(shapesFromLocal)) {
            objects = shapesFromLocal.filter(
                (obj) => obj.shape_type === "line" || obj.shape_type === "polygon",
            );
        } else {
            return [];
        }

        return objects.map((obj) => {
            let areaSqFt: number | undefined;
            let lengthFt: number | undefined;

            const magnitudeText = obj.magnitude || "";
            const match = magnitudeText.match(/^([\d.]+)\s*(.+)$/);

            if (match) {
                const numericValue = parseFloat(match[1]);
                if (obj.shape_type === "polygon") {
                    areaSqFt = numericValue;
                } else if (obj.shape_type === "line") {
                    lengthFt = numericValue;
                }
            }

            return {
                id: obj.id,
                surface_type: obj.surface_type || "custom",
                geometry: obj.shape_type,
                wastePercent: obj.waste_percentage ?? getDefaultWaste(obj.surface_type),
                areaSqFt,
                lengthFt,
            };
        });
    };

    useEffect(() => {
        if (!measurementId) return;

        let cancelled = false;

        (async () => {
            const { data, error } = await supabase
                .from("measurement_images")
                .select("*")
                .eq("measurement_session_id", measurementId)
                .order("is_base_image", { ascending: false })
                .order("created_at", { ascending: false });

            if (error || cancelled) return;

            setImages(data || []);

            const baseImage = data?.find((img) => img.is_base_image);
            if (baseImage) {
                const { data: sessionData } = await supabase
                    .from("measurement_sessions")
                    .select("scale, scale_points")
                    .eq("id", measurementId)
                    .single();

                if (sessionData && !cancelled) {
                    setScale(sessionData.scale);
                    setScalePoints(sessionData.scale_points || []);
                }

                try {
                    const localData = localStorage.getItem(`measurement_shapes_${measurementId}`);
                    if (localData && allowUpload) {
                        const shapesFromLocal = JSON.parse(localData);
                        setShapes(shapesFromLocal);
                        setWorkingAreaShapes(serializeWorkingShapes(shapesFromLocal));
                    } else {
                        const shapesRes = await fetch(`/api/measurements/${measurementId}/shapes`);

                        if (!cancelled) {
                            const shapesData = await shapesRes.json();
                            const shapes = shapesData.shapes || [];

                            localStorage.setItem(
                                `measurement_shapes_${measurementId}`,
                                JSON.stringify(shapes),
                            );
                            setShapes(shapes);
                            setWorkingAreaShapes(serializeWorkingShapes(shapes));
                        }
                    }
                } catch (error) {
                    console.warn("Failed to load shapes:", error);
                    setShapes([]);
                    setWorkingAreaShapes(serializeWorkingShapes([]));
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [measurementId]);

    // --------------------------------------------------
    // File selection
    // --------------------------------------------------
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selected = Array.from(e.target.files);

        const valid = selected.filter(
            (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE,
        );

        const originalCount = images.filter((p) => !p.is_base_image).length;
        if (valid.length + originalCount > MAX_FILES) {
            toast({
                title: `You can only upload up to ${MAX_FILES} total images.`,
                variant: "destructive",
            });
            return;
        }

        setFiles(valid);
    };

    const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

    // --------------------------------------------------
    // Upload
    // --------------------------------------------------
    const handleUpload = async () => {
        if (!files.length) return;

        setLoading(true);

        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));

        const res = await fetch(`/api/measurements/${measurementId}/images`, {
            method: "POST",
            body: formData,
        });

        setLoading(false);
        setFiles([]);

        if (res.ok) {
            toast({ title: "Images uploaded", variant: "success" });
            await loadImages();
        } else {
            toast({ title: "Upload failed", variant: "destructive" });
        }
    };

    const exportImageWithShapes = async (img: MeasurementImage) => {
        if (!imageDimensions[img.id]) return;

        const imgElement = document.querySelector(
            `[data-image-id="${img.id}"]`,
        ) as HTMLImageElement;
        if (!imgElement) return;

        const canvas = document.createElement("canvas");
        const naturalWidth = imageDimensions[img.id].naturalWidth;
        const naturalHeight = imageDimensions[img.id].naturalHeight;
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(imgElement, 0, 0, naturalWidth, naturalHeight);

        const svgElement = imgElement.nextElementSibling as SVGSVGElement;
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);

        const svgImg: HTMLImageElement = new window.Image();
        svgImg.src = svgUrl;

        await svgImg.decode();

        ctx.drawImage(svgImg, 0, 0, naturalWidth, naturalHeight);

        URL.revokeObjectURL(svgUrl);

        const link = document.createElement("a");
        link.download = `measurement_${img.measurement_session_id}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };
    // --------------------------------------------------
    // Set Base Image
    // --------------------------------------------------
    const handleConfirmSetBaseImage = async () => {
        if (!confirmBaseImage) return;

        // Drop previous base image
        const resetRes = await fetch(`/api/measurements/${measurementId}/images/base/reset`, {
            method: "POST",
        });

        if (!resetRes.ok) {
            toast({ title: "Failed to reset base image", variant: "destructive" });
            setConfirmBaseImage(null);
            return;
        }

        // Set new base image
        const setRes = await fetch(
            `/api/measurements/${measurementId}/images/${confirmBaseImage.id}/set-base`,
            {
                method: "POST",
            },
        );

        if (!setRes.ok) {
            toast({ title: "Failed to set base image", variant: "destructive" });
            setConfirmBaseImage(null);
            return;
        }

        // reset the scale
        const scaleResetRes = await fetch(`/api/measurements/${measurementId}/scale/reset`, {
            method: "POST",
        });

        if (!scaleResetRes.ok) {
            toast({ title: "Failed to reset scale", variant: "destructive" });
            setConfirmBaseImage(null);
            return;
        }

        // clear the shapes
        const shapesClearRes = await fetch(`/api/measurements/${measurementId}/shapes`, {
            method: "DELETE",
        });

        if (!shapesClearRes.ok) {
            toast({ title: "Failed to clear shapes", variant: "destructive" });
            setConfirmBaseImage(null);
            return;
        }

        localStorage.removeItem(`measurement_shapes_${measurementId}`);
        setScale(null);
        setScalePoints([]);

        // Update the local state
        setImages((prev) =>
            prev.map((i) => ({
                ...i,
                is_base_image: i.id === confirmBaseImage.id,
            })),
        );
        setWorkingAreaShapes([]);
        setShapes([]);
        setConfirmBaseImage(null);
    };

    // --------------------------------------------------
    // Delete image
    // --------------------------------------------------
    const performDelete = async (img: MeasurementImage) => {
        if (!img) {
            return;
        }
        const res = await fetch(`/api/measurements/${measurementId}/images?image_id=${img.id}`, {
            method: "DELETE",
        });

        if (res.ok) {
            toast({
                title: img.is_base_image ? "Base image deleted" : "Image deleted",
                variant: "success",
            });
            await loadImages();
        } else {
            toast({ title: "Delete failed", variant: "destructive" });
            return;
        }

        setImages((prev) => prev.filter((i) => i.id !== img.id));

        if (img.is_base_image) {
            setScale(null);
            setScalePoints([]);
        }
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteImage) return;
        await performDelete(confirmDeleteImage);
        setConfirmDeleteImage(null);
    };

    const legendItems: LegendItem[] = useMemo(() => {
        return shapes.map((shape) => {
            const surfaceType = shape.surface_type || "other";
            const wastePercentage =
                shape.waste_percentage ?? getDefaultWastePercentage(surfaceType);
            const shapeType = shape.shape_type as "line" | "polygon";

            const rawValueText = shape.magnitude || "";

            const { valueNet, valueGross } = formatWasteValue(
                rawValueText,
                wastePercentage,
                shapeType,
            );

            return {
                id: String(shape.id),
                surfaceType,
                label: shape.label || "",
                displayName: shape.label || surfaceType || shapeType || "Measurement",
                valueNet,
                valueGross,
                shapeType,
            };
        });
    }, [shapes]);

    const baseImage = images.find((i) => i.is_base_image);
    const otherImages = images.filter((i) => !i.is_base_image);

    const renderImageCard = (img: MeasurementImage) => {
        const isBase = img.is_base_image;

        return (
            <div
                key={img.id}
                className={`group space-y-2 ${allowUpload ? "cursor-pointer" : "cursor-default"}`}
            >
                <div className="text-base text-gray-600 flex justify-between">
                    {isBase ? (
                        <span className="text-blue-600 font-semibold">Base Image</span>
                    ) : (
                        "Reference"
                    )}

                    {isBase && (
                        <span className="bg-gray-200 px-1 rounded">
                            Scale: {scale ? `${scale.toFixed(2)} ft` : "Not set"}
                        </span>
                    )}
                </div>

                <div>
                    <div
                        className="relative"
                        onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button")) return;

                            if (isBase && allowUpload) {
                                if (scale !== null) {
                                    router.push(`/measurements/${measurementId}/draw`);
                                } else {
                                    router.push(
                                        `/measurements/${measurementId}/images/${img.id}/scale`,
                                    );
                                }
                            }
                        }}
                    >
                        <Image
                            src={img.image_url}
                            alt="Measurement"
                            width={400}
                            height={260}
                            className={`h-full w-full object-cover rounded border group-hover:opacity-90 transition ${
                                isBase ? "ring-2 ring-blue-500" : ""
                            }`}
                            unoptimized
                            onLoad={(e) => handleImageLoad(img.id, e)}
                            data-image-id={img.id}
                            crossOrigin="anonymous"
                        />

                        {isBase && scalePoints.length > 0 && imageDimensions[img.id] && (
                            <svg
                                className="absolute inset-0 pointer-events-none"
                                width="100%"
                                height="100%"
                                viewBox={`0 0 ${imageDimensions[img.id].naturalWidth} ${imageDimensions[img.id].naturalHeight}`}
                                preserveAspectRatio="xMidYMid meet"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {(() => {
                                    const scaleRatio =
                                        imageDimensions[img.id]?.naturalWidth /
                                            imageDimensions[img.id]?.displayedWidth || 1;

                                    return (
                                        <>
                                            {scalePoints.map((p, i) => (
                                                <circle
                                                    key={i}
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r={4 * scaleRatio}
                                                    fill="red"
                                                    stroke="white"
                                                    strokeWidth={2 * scaleRatio}
                                                />
                                            ))}

                                            {scalePoints.length === 2 && (
                                                <line
                                                    x1={scalePoints[0].x}
                                                    y1={scalePoints[0].y}
                                                    x2={scalePoints[1].x}
                                                    y2={scalePoints[1].y}
                                                    stroke="red"
                                                    strokeWidth={4 * scaleRatio}
                                                    strokeDasharray={`${4 * scaleRatio} ${6 * scaleRatio}`}
                                                />
                                            )}
                                        </>
                                    );
                                })()}

                                {shapes.map((shape, idx) => {
                                    const scaleRatio =
                                        imageDimensions[img.id]?.naturalWidth /
                                            imageDimensions[img.id]?.displayedWidth || 1;

                                    const surfaceType = shape.surface_type || "other";
                                    const strokeColor = TYPE_COLORS[surfaceType] || "#888888";
                                    const fillColor = `${strokeColor}33`;

                                    if (shape.shape_type === "line" && shape.points.length === 2) {
                                        const [p1, p2] = shape.points;
                                        const midX = (p1.x + p2.x) / 2;
                                        const midY = (p1.y + p2.y) / 2;

                                        return (
                                            <g key={`shape-${idx}`}>
                                                <line
                                                    x1={p1.x}
                                                    y1={p1.y}
                                                    x2={p2.x}
                                                    y2={p2.y}
                                                    stroke={strokeColor}
                                                    strokeWidth={2 * scaleRatio}
                                                />
                                                <text
                                                    x={midX}
                                                    y={midY - 8}
                                                    textAnchor="middle"
                                                    fill="white"
                                                    fontSize={FONT_SIZE / scaleRatio}
                                                    fontWeight="bold"
                                                    paintOrder="stroke"
                                                    stroke="black"
                                                    strokeWidth={0.5}
                                                >
                                                    {shape.magnitude || "0.00 ft"}
                                                </text>
                                            </g>
                                        );
                                    }

                                    if (
                                        shape.shape_type === "polygon" &&
                                        shape.points.length >= 3
                                    ) {
                                        const pointsStr = shape.points
                                            .map((p: any) => `${p.x},${p.y}`)
                                            .join(" ");

                                        const centroidX =
                                            shape.points.reduce(
                                                (sum: number, p: any) => sum + p.x,
                                                0,
                                            ) / shape.points.length;

                                        const centroidY =
                                            shape.points.reduce(
                                                (sum: number, p: any) => sum + p.y,
                                                0,
                                            ) / shape.points.length;

                                        return (
                                            <g key={`shape-${idx}`}>
                                                <polygon
                                                    points={pointsStr}
                                                    fill={fillColor}
                                                    stroke={strokeColor}
                                                    strokeWidth={2 * scaleRatio}
                                                />
                                                <text
                                                    x={centroidX}
                                                    y={centroidY}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="white"
                                                    fontSize={FONT_SIZE / scaleRatio}
                                                    fontWeight="bold"
                                                    paintOrder="stroke"
                                                    stroke="black"
                                                    strokeWidth={0.5}
                                                >
                                                    {shape.magnitude || "0.00 sq ft"}
                                                </text>
                                            </g>
                                        );
                                    }

                                    return null;
                                })}
                            </svg>
                        )}
                    </div>

                    {allowUpload && (
                        <div className="flex gap-2 mt-2">
                            {isBase ? (
                                <>
                                    {scale === null && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(
                                                    `/measurements/${measurementId}/images/${img.id}/scale`,
                                                );
                                            }}
                                            className="flex-1 text-sm border rounded py-1 text-center bg-blue-100 text-blue-700"
                                        >
                                            ️📏 Edit Scale
                                        </button>
                                    )}
                                    {scale !== null && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/measurements/${measurementId}/draw`);
                                            }}
                                            className="flex-1 text-sm border rounded py-1 text-center bg-green-100 text-green-700"
                                        >
                                            ✏️ Draw
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            exportImageWithShapes(img);
                                        }}
                                        className="hidden flex-1 text-sm border rounded py-1 text-center bg-gray-200 text-gray-700 export-base-image-btn"
                                    >
                                        💾 Export
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmBaseImage(img);
                                    }}
                                    className="flex-1 text-sm border rounded py-1 text-center bg-gray-100 text-gray-700"
                                >
                                    🔄 Set Base
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteImage(img);
                                }}
                                className="flex-1 text-sm border border-red-500 text-red-600 rounded py-1"
                            >
                                🗑 Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --------------------------------------------------
    // Render
    // --------------------------------------------------
    return (
        <div className="space-y-6">
            {/* Upload section */}
            {allowUpload && (
                <div>
                    <label className="block font-semibold mb-2">Add Images</label>

                    <input
                        type="file"
                        accept={ACCEPTED_TYPES.join(",")}
                        multiple
                        onChange={handleFileChange}
                        className="border p-2 rounded"
                    />

                    {previews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {previews.map((src, i) => (
                                <Image
                                    key={i}
                                    src={src}
                                    alt="Preview"
                                    width={400}
                                    height={260}
                                    className="h-full w-full object-cover rounded border"
                                    unoptimized
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        disabled={loading || files.length === 0}
                        onClick={handleUpload}
                        className="bg-blue-600 text-white px-4 py-2 rounded mt-4 disabled:bg-gray-400"
                    >
                        {loading ? "Uploading..." : "Upload Images"}
                    </button>
                </div>
            )}

            {allowUpload && <hr />}

            {/* Existing images */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Existing Images</h2>

                {images.length === 0 && <p className="text-gray-500">No images uploaded yet.</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="mt-6">
                        <h2 className="text-xl text-blue-600 font-semibold mb-2">
                            Measurement Summary
                        </h2>
                        {!baseImage && (
                            <p>
                                There is no data for a summary measurement report because the base
                                image is not set.
                            </p>
                        )}
                        {baseImage && <MeasurementSummaryPanel shapes={workingAreaShapes} />}
                    </div>

                    {/* BASE IMAGE */}
                    {baseImage && renderImageCard(baseImage)}

                    {/* LEGEND AS A GRID ITEM */}
                    {baseImage && shapes.length > 0 && (
                        <div className="group space-y-2">
                            <div className="text-base text-gray-600 flex justify-between">
                                <span className="text-blue-600 font-semibold">Legend</span>
                            </div>

                            <div>
                                <StaticMeasurementLegend items={legendItems} />
                            </div>
                        </div>
                    )}

                    {/* OTHER IMAGES */}
                    {otherImages.map(renderImageCard)}
                </div>
            </div>

            {/* Confirm Set Base */}
            <ConfirmDialog
                open={!!confirmBaseImage}
                title="Change Base Image?"
                description="Changing the base image will remove all existing measurements and scale. This action cannot be undone."
                confirmLabel="Change Base Image"
                destructive={true}
                onCancel={() => setConfirmBaseImage(null)}
                onConfirm={handleConfirmSetBaseImage}
            />

            {/* Confirm Delete */}
            <ConfirmDialog
                open={!!confirmDeleteImage}
                title="Delete Image?"
                description="Are you sure you want to delete this image? This action cannot be undone."
                confirmLabel="Delete Image"
                destructive={true}
                onCancel={() => setConfirmDeleteImage(null)}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
