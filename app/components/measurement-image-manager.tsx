"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/providers/toast-provider";
import { supabase } from "@/lib/supabase/supabase";

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
    // const [confirmImage, setConfirmImage] = useState<MeasurementImage | null>(null);
    const [isSettingScale, setIsSettingScale] = useState(false);
    const [scalePoints, setScalePoints] = useState<{ x: number; y: number }[]>([]);
    const [scale, setScale] = useState<number | null>(null);
    const [feet, setFeet] = useState(0);
    const [inches, setInches] = useState(0);
    const [isSettingScaleModalOpen, setIsSettingScaleModalOpen] = useState(false);

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
    const handleSetBaseImage = async (img: MeasurementImage) => {
        console.log("handleSetBaseImage");
        if (img.is_base_image) return;

        const confirm = window.confirm(
            "Changing the base image will remove all existing measurements and scale. Continue?",
        );

        if (!confirm) return;

        // Drop previous base image
        const resetRes = await fetch(`/api/measurements/${measurementId}/images/base/reset`, {
            method: "POST",
        });

        if (!resetRes.ok) {
            toast({ title: "Failed to reset base image", variant: "destructive" });
            return;
        }

        // Set new base image
        const setRes = await fetch(`/api/measurements/${measurementId}/images/${img.id}/set-base`, {
            method: "POST",
        });

        if (!setRes.ok) {
            toast({ title: "Failed to set base image", variant: "destructive" });
            return;
        }

        // reset the scale
        const scaleResetRes = await fetch(`/api/measurements/${measurementId}/scale/reset`, {
            method: "POST",
        });

        if (!scaleResetRes.ok) {
            toast({ title: "Failed to reset scale", variant: "destructive" });
            return;
        }

        setScale(null);
        setScalePoints([]);
        setIsSettingScale(false);

        // Update the local state
        setImages((prev) =>
            prev.map((i) => ({
                ...i,
                is_base_image: i.id === img.id,
            })),
        );
    };

    // --------------------------------------------------
    // Scale handling
    // --------------------------------------------------
    const handleScaleClick = (e: React.MouseEvent<HTMLImageElement>, img: MeasurementImage) => {
        console.log("handleScaleClick");
        if (!img.is_base_image) return;

        if (scalePoints.length === 0) {
            setIsSettingScale(true);
        }

        // const rect = e.currentTarget.getBoundingClientRect();
        // const rect_x = e.clientX - rect.left;
        // const rect_y = e.clientY - rect.top;
        const rect_x = e.nativeEvent.offsetX;
        const rect_y = e.nativeEvent.offsetY - 20;

        const dimensions = imageDimensions[img.id];
        if (!dimensions) {
            console.error("Image dimensions not loaded yet");
            return;
        }

        const x = (rect_x / dimensions.displayedWidth) * dimensions.naturalWidth;
        const y = (rect_y / dimensions.displayedHeight) * dimensions.naturalHeight;

        setScalePoints((prev) => {
            const newPoints = [...prev, { x, y }];
            if (newPoints.length === 2) {
                setIsSettingScale(false);
                setIsSettingScaleModalOpen(true);
            }
            return newPoints.slice(-2);
        });
    };

    const handleSaveScale = async () => {
        console.log("handleSaveScale");
        const totalFeet = feet + inches / 12;

        const { error } = await supabase
            .from("measurement_sessions")
            .update({
                scale: totalFeet,
                scale_points: scalePoints,
            })
            .eq("id", measurementId);

        if (error) {
            toast({ title: "Failed to save scale", variant: "destructive" });
            return;
        }

        setScale(totalFeet);
        setIsSettingScaleModalOpen(false);
        setFeet(0);
        setInches(0);
    };

    // --------------------------------------------------
    // Delete image
    // --------------------------------------------------
    const performDelete = async (img: MeasurementImage) => {
        console.log("performDelete");
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
            setIsSettingScale(false);
        }
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
                            <div className="text-sm text-gray-600 flex justify-between">
                                {img.is_base_image ? (
                                    <span className="text-blue-600 font-semibold">Base Image</span>
                                ) : (
                                    "Reference"
                                )}
                                {img.is_base_image && (
                                    <span className="text-xs bg-gray-200 px-1 rounded">
                                        Scale: {scale ? `${scale.toFixed(2)} ft` : "Not set"}
                                    </span>
                                )}
                            </div>

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
                                    onClick={(e) => {
                                        if (allowUpload && img.is_base_image && scale === null) {
                                            handleScaleClick(e, img);
                                        }
                                    }}
                                    onLoad={(e) => handleImageLoad(img.id, e)}
                                />

                                {img.is_base_image &&
                                    (scalePoints.length > 0 || isSettingScale) &&
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
                                                        imageDimensions[img.id]?.displayedWidth ||
                                                    1;

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
                                        </svg>
                                    )}

                                {/* Mobile actions */}
                                {allowUpload && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (img.is_base_image) {
                                                    const confirmed = window.confirm(
                                                        "Reset scale? This will remove existing scale and allow you to set new points.",
                                                    );
                                                    if (confirmed) {
                                                        fetch(
                                                            `/api/measurements/${measurementId}/scale/reset`,
                                                            { method: "POST" },
                                                        )
                                                            .then(() => {
                                                                setScale(null);
                                                                setScalePoints([]);
                                                                setIsSettingScale(true);
                                                            })
                                                            .catch(() => {
                                                                toast({
                                                                    title: "Failed to reset scale",
                                                                    variant: "destructive",
                                                                });
                                                            });
                                                    }
                                                } else {
                                                    handleSetBaseImage(img);
                                                }
                                            }}
                                            className={`flex-1 text-sm border rounded py-1 text-center ${
                                                img.is_base_image
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            {img.is_base_image ? "✅ Base" : "🔄 Set Base"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const confirmed = window.confirm(
                                                    "Are you sure you want to delete this image? This action cannot be undone.",
                                                );
                                                if (confirmed) {
                                                    performDelete(img);
                                                }
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

            {/* Scale Modal */}
            {isSettingScaleModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded shadow-lg w-80">
                        <h3 className="font-medium mb-4">Enter Real Distance</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1">Feet</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={feet}
                                    onChange={(e) => setFeet(Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1">Inches</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="11"
                                    value={inches}
                                    onChange={(e) => setInches(Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveScale}
                                    className="btn w-full"
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingScaleModalOpen(false)}
                                    className="btn btn-secondary w-full"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*<ConfirmDialog*/}
            {/*    open={!!confirmImage}*/}
            {/*    title="Delete image?"*/}
            {/*    description="This action cannot be undone."*/}
            {/*    confirmLabel="Delete Image"*/}
            {/*    destructive*/}
            {/*    onCancel={() => setConfirmImage(null)}*/}
            {/*    onConfirm={async () => {*/}
            {/*        await performDelete(confirmImage);*/}
            {/*        setConfirmImage(null);*/}
            {/*    }}*/}
            {/*/>*/}
        </div>
    );
}
