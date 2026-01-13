"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/providers/toast-provider";
import { supabase } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ui/confirm-dialog";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

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

    useEffect(() => {
        if (!measurementId) return;

        let cancelled = false;

        (async () => {
            const { data, error } = await supabase
                .from("measurement_images")
                .select("*")
                .eq("measurement_session_id", measurementId)
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

                const shapesRes = await fetch(`/api/measurements/${measurementId}/shapes`);
                if (!cancelled) {
                    const shapesData = await shapesRes.json();
                    setShapes(shapesData.shapes || []);
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

        const originalCount = images.filter((p) => p.is_base_image === false).length;
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

        setScale(null);
        setScalePoints([]);

        // Update the local state
        setImages((prev) =>
            prev.map((i) => ({
                ...i,
                is_base_image: i.id === confirmBaseImage.id,
            })),
        );

        setConfirmBaseImage(null);
    };

    const handleSetBaseImage = async (img: MeasurementImage) => {
        if (img.is_base_image) return;

        setConfirmBaseImage(img);
        return;
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
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className={`group space-y-2 ${
                                allowUpload ? "cursor-pointer" : "cursor-default"
                            }`}
                        >
                            <div className="text-base text-gray-600 flex justify-between">
                                {img.is_base_image ? (
                                    <span className="text-blue-600 font-semibold">Base Image</span>
                                ) : (
                                    "Reference"
                                )}
                                {img.is_base_image && (
                                    <span className="bg-gray-200 px-1 rounded">
                                        Scale: {scale ? `${scale.toFixed(2)} ft` : "Not set"}
                                    </span>
                                )}
                            </div>

                            <div>
                                <div className="relative">
                                    <Image
                                        src={img.image_url}
                                        alt="Measurement"
                                        width={400}
                                        height={260}
                                        className={`h-full w-full object-cover rounded border group-hover:opacity-90 transition ${
                                            img.is_base_image ? "ring-2 ring-blue-500" : ""
                                        }`}
                                        unoptimized
                                        onLoad={(e) => handleImageLoad(img.id, e)}
                                    />

                                    {img.is_base_image &&
                                        scalePoints.length > 0 &&
                                        imageDimensions[img.id] && (
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
                                                            imageDimensions[img.id]
                                                                ?.displayedWidth || 1;

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
                                                            imageDimensions[img.id]
                                                                ?.displayedWidth || 1;

                                                    if (
                                                        shape.shape_type === "line" &&
                                                        shape.points.length === 2
                                                    ) {
                                                        const [p1, p2] = shape.points;
                                                        return (
                                                            <line
                                                                key={`shape-${idx}`}
                                                                x1={p1.x}
                                                                y1={p1.y}
                                                                x2={p2.x}
                                                                y2={p2.y}
                                                                stroke="red"
                                                                strokeWidth={2 * scaleRatio}
                                                                // strokeDasharray={`${4 * scaleRatio} ${6 * scaleRatio}`}
                                                            />
                                                        );
                                                    }

                                                    if (
                                                        shape.shape_type === "polygon" &&
                                                        shape.points.length >= 3
                                                    ) {
                                                        const pointsStr = shape.points
                                                            .map((p: any) => `${p.x},${p.y}`)
                                                            .join(" ");
                                                        return (
                                                            <polygon
                                                                key={`shape-${idx}`}
                                                                points={pointsStr}
                                                                fill="rgba(255, 0, 0, 0.2)"
                                                                stroke="red"
                                                                strokeWidth={2 * scaleRatio}
                                                            />
                                                        );
                                                    }

                                                    return null;
                                                })}
                                            </svg>
                                        )}
                                </div>

                                {/* Mobile actions */}
                                {allowUpload && (
                                    <div className="flex gap-2 mt-2">
                                        {img.is_base_image ? (
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
                                        {img.is_base_image && scale !== null && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(
                                                        `/measurements/${measurementId}/draw`,
                                                    );
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
                    ))}
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
