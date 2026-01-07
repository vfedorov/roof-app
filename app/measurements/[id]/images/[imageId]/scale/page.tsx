"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/providers/toast-provider";

export default function SetScalePage({
    params,
}: {
    params: Promise<{ id: string; imageId: string }>;
}) {
    const router = useRouter();
    const { toast } = useToast();

    const [measurementId, setMeasurementId] = useState("");
    const [imageId, setImageId] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [scalePoints, setScalePoints] = useState<
        { x: number; y: number; clientX: number; clientY: number }[]
    >([]);
    const [feet, setFeet] = useState(0);
    const [inches, setInches] = useState(0);
    const [saving, setSaving] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // ---------------------------------------------------
    // Load parameters
    // ---------------------------------------------------
    useEffect(() => {
        async function load() {
            const p = await params;
            setMeasurementId(p.id);
            setImageId(p.imageId);

            const res = await fetch(`/api/measurements/${p.id}/images`);
            const images = await res.json();
            const image = images.find((img: any) => img.id == p.imageId);
            if (image) {
                setImageUrl(image.image_url);
            }
        }
        load();
    }, [params]);

    // ---------------------------------------------------
    // Handle image click
    // ---------------------------------------------------
    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (scalePoints.length >= 2) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setScalePoints((prev) => [...prev, { x, y, clientX: e.clientX, clientY: e.clientY }]);
    };

    // ---------------------------------------------------
    // Save scale
    // ---------------------------------------------------
    const handleSave = async () => {
        if (scalePoints.length !== 2) {
            toast({ title: "Please select two points", variant: "destructive" });
            return;
        }

        if (!imageUrl) return;

        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => resolve(null);
        });

        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        const displayedWidth = imgRef.current?.width || naturalWidth;
        const displayedHeight = imgRef.current?.height || naturalHeight;

        const points = scalePoints.map((p) => ({
            x: (p.x / displayedWidth) * naturalWidth,
            y: (p.y / displayedHeight) * naturalHeight,
        }));

        const totalFeet = feet + inches / 12;

        setSaving(true);
        const res = await fetch(`/api/measurements/${measurementId}/scale/set`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scale: totalFeet,
                scale_points: points,
            }),
        });
        setSaving(false);

        if (res.ok) {
            toast({ title: "Scale saved!", variant: "success" });
            router.push(`/measurements/${measurementId}/edit`);
        } else {
            toast({ title: "Failed to save scale", variant: "destructive" });
        }
    };

    // ---------------------------------------------------
    // Render
    // ---------------------------------------------------
    return (
        <div className="p-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => router.back()} className="btn">
                    ← Back
                </button>
            </div>

            {/* Image with overlay */}
            <div className="relative inline-block border shadow-md">
                {imageUrl && (
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Base Image"
                        className="max-w-full h-auto"
                        onClick={handleImageClick}
                    />
                )}

                {/* Overlay for points */}
                <div
                    ref={overlayRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 10 }}
                >
                    {scalePoints.map((p, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 bg-red-500 rounded-full -ml-1.5 -mt-1.5"
                            style={{
                                left: `${p.x}px`,
                                top: `${p.y}px`,
                            }}
                        />
                    ))}
                    {scalePoints.length === 2 && (
                        <svg
                            className="absolute inset-0 w-full h-full"
                            style={{ pointerEvents: "none" }}
                        >
                            <line
                                x1={scalePoints[0].x}
                                y1={scalePoints[0].y}
                                x2={scalePoints[1].x}
                                y2={scalePoints[1].y}
                                stroke="red"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                            />
                        </svg>
                    )}
                </div>
            </div>

            {/* Distance input */}
            {scalePoints.length === 2 && (
                <div className="space-y-4 bg-gray-800 p-4 rounded">
                    <h3 className="font-medium">Enter Real Distance</h3>
                    <div className="flex gap-4">
                        <div>
                            <label className="block mb-1">Feet</label>
                            <input
                                type="number"
                                min="0"
                                value={feet}
                                onChange={(e) => setFeet(Number(e.target.value))}
                                className="input"
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
                                className="input"
                            />
                        </div>
                    </div>
                </div>
            )}

            {scalePoints.length === 2 && (
                <button onClick={handleSave} disabled={saving} className="btn">
                    {saving ? "Saving…" : "Save Scale"}
                </button>
            )}
        </div>
    );
}
