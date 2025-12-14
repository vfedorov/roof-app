"use client";

import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/providers/toast-provider";

export default function AnnotatePage({
    params,
}: {
    params: Promise<{ id: string; photo: string }>;
}) {
    const router = useRouter();
    const { toast } = useToast();

    const [inspectionId, setInspectionId] = useState("");
    const [photoName, setPhotoName] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [strokeColor, setStrokeColor] = useState("#ff0000");

    const canvasWrapperRef = useRef<HTMLDivElement>(null); // NEW WRAPPER
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);

    // ---------------------------------------------------
    // Load parameters
    // ---------------------------------------------------
    useEffect(() => {
        async function load() {
            const p = await params;
            setInspectionId(p.id);
            setPhotoName(p.photo);

            const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const url = `${base}/storage/v1/object/public/inspection-photos/inspections/${p.id}/original/${p.photo}`;
            setImageUrl(url);
        }
        load();
    }, [params]);

    // ---------------------------------------------------
    // Init Fabric.js canvas
    // ---------------------------------------------------
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            preserveObjectStacking: true,
            selection: true,
        });

        fabricRef.current = canvas;

        // Resize canvas when wrapper changes
        const resizeCanvas = () => {
            if (!canvasWrapperRef.current) return;

            const width = canvasWrapperRef.current.clientWidth;
            const height = window.innerHeight * 0.7;

            canvas.setWidth(width);
            canvas.setHeight(height);
            canvas.renderAll();
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            canvas.dispose();
        };
    }, []);

    // ---------------------------------------------------
    // Load base image (locked)
    // ---------------------------------------------------
    useEffect(() => {
        if (!fabricRef.current || !imageUrl) return;

        const loadImage = async () => {
            const canvas = fabricRef.current!;
            canvas.clear();

            const img = await fabric.Image.fromURL(imageUrl, {
                crossOrigin: "anonymous",
            });

            // LOCK IMAGE
            img.selectable = false;
            img.evented = false;
            img.lockMovementX = true;
            img.lockMovementY = true;
            img.lockRotation = true;
            img.lockScalingX = true;
            img.lockScalingY = true;
            img.hoverCursor = "default";

            // Scale to fit
            const scale = Math.min(
                canvas.getWidth()! / img.width!,
                canvas.getHeight()! / img.height!,
            );

            img.scale(scale);

            canvas.add(img);
            canvas.sendObjectToBack(img);
        };

        loadImage();
    }, [imageUrl]);

    // ---------------------------------------------------
    // Toolbar actions
    // ---------------------------------------------------
    const addRect = () => {
        const rect = new fabric.Rect({
            width: 120,
            height: 60,
            fill: "transparent",
            stroke: strokeColor,
            strokeWidth: 3,
        });
        fabricRef.current?.add(rect);
    };

    const addCircle = () => {
        const circ = new fabric.Circle({
            radius: 40,
            fill: "transparent",
            stroke: strokeColor,
            strokeWidth: 3,
        });
        fabricRef.current?.add(circ);
    };

    const addText = () => {
        const textbox = new fabric.Textbox("Label", {
            fontSize: 24,
            fill: strokeColor,
        });
        fabricRef.current?.add(textbox);
    };

    const addArrow = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const line = new fabric.Line([0, 0, 150, 0], {
            stroke: strokeColor,
            strokeWidth: 3,
        });

        const head = new fabric.Triangle({
            width: 12,
            height: 16,
            fill: strokeColor,
            left: 150,
            top: -8,
            angle: 90,
        });

        const group = new fabric.Group([line, head], {
            left: 100,
            top: 100,
        });

        canvas.add(group);
    };

    // ---------------------------------------------------
    // Save annotated image
    // ---------------------------------------------------
    const saveAnnotated = async () => {
        if (!fabricRef.current) return;

        setSaving(true);

        const dataUrl = fabricRef.current!.toDataURL({
            multiplier: 1,
            format: "png",
            quality: 1,
        });

        const blob = await (await fetch(dataUrl)).blob();
        const formData = new FormData();
        formData.append("file", blob, photoName);

        const res = await fetch(`/api/inspections/${inspectionId}/photos/annotated/${photoName}`, {
            method: "POST",
            body: formData,
        });

        setSaving(false);

        if (res.ok) {
            // alert("Annotated image saved!");
            toast({
                title: "Annotated image saved!",
                variant: "success",
            });
            router.push(`/inspections/${inspectionId}`);
        } else {
            const err = await res.json();
            toast({
                title: "Annotation save failed",
                variant: "destructive",
            });
        }
    };

    // ---------------------------------------------------
    // UI
    // ---------------------------------------------------
    return (
        <div className="p-4 space-y-4">
            {/* Toolbar - Now includes Back button */}
            <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => router.back()} className="btn">
                    ← Back
                </button>

                <button className="btn" onClick={addRect}>
                    Rectangle
                </button>
                <button className="btn" onClick={addCircle}>
                    Circle
                </button>
                <button className="btn" onClick={addArrow}>
                    Arrow
                </button>
                <button className="btn" onClick={addText}>
                    Text
                </button>

                {/* Color Picker */}
                <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-8 h-8 p-1 border rounded cursor-pointer"
                />
            </div>

            {/* Canvas Wrapper - NEW */}
            <div ref={canvasWrapperRef} className="border shadow-md w-full">
                <canvas ref={canvasRef} />
            </div>

            <button onClick={saveAnnotated} disabled={saving} className="btn mt-4">
                {saving ? "Saving…" : "Save Annotation"}
            </button>
        </div>
    );
}
