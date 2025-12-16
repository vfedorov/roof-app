"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/providers/toast-provider";
import ConfirmDialog from "@/app/components/ui/confirm-dialog";

const BUCKET = "inspection-photos";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

type StoredPhoto = {
    name: string;
    url: string;
    kind: "original" | "annotated";
};

export default function PhotoManager({
    inspectionId,
    allowUpload = false,
}: {
    inspectionId: string;
    allowUpload: boolean;
}) {
    const { toast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [storedPhotos, setStoredPhotos] = useState<StoredPhoto[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmPhoto, setConfirmPhoto] = useState<StoredPhoto | null>(null);

    // --------------------------------------------------
    // Load photos
    // --------------------------------------------------
    async function loadPhotos() {
        if (!inspectionId) return;

        const res = await fetch(`/api/inspections/${inspectionId}/photos`);
        if (!res.ok) return;

        const data = await res.json();
        setStoredPhotos(data);
    }

    useEffect(() => {
        if (!inspectionId) return;

        let cancelled = false;

        (async () => {
            const res = await fetch(`/api/inspections/${inspectionId}/photos`);
            if (!res.ok) return;

            const data = await res.json();
            if (!cancelled) {
                setStoredPhotos(data);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [inspectionId]);

    // --------------------------------------------------
    // Group photos by name (original + annotated)
    // --------------------------------------------------
    const groupedPhotos = useMemo(() => {
        const map = new Map<string, { original?: StoredPhoto; annotated?: StoredPhoto }>();

        for (const photo of storedPhotos) {
            if (!map.has(photo.name)) {
                map.set(photo.name, {});
            }

            if (photo.kind === "original") {
                map.get(photo.name)!.original = photo;
            } else {
                map.get(photo.name)!.annotated = photo;
            }
        }

        return Array.from(map.values());
    }, [storedPhotos]);

    // --------------------------------------------------
    // File selection
    // --------------------------------------------------
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selected = Array.from(e.target.files);

        const valid = selected.filter(
            (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE,
        );

        if (valid.length + storedPhotos.length > MAX_FILES) {
            toast({
                title: `You can only upload up to ${MAX_FILES} total photos.`,
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

        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));

        setLoading(true);

        const res = await fetch(`/api/inspections/${inspectionId}/photos`, {
            method: "POST",
            body: formData,
        });

        setLoading(false);
        setFiles([]);

        if (res.ok) {
            toast({ title: "Images uploaded", variant: "success" });
            await loadPhotos();
        } else {
            toast({ title: "Upload failed", variant: "destructive" });
        }
    };

    // --------------------------------------------------
    // Delete / Clear annotation
    // --------------------------------------------------
    async function performDelete(photo: StoredPhoto) {
        const res = await fetch(
            `/api/inspections/${inspectionId}/photos?name=${photo.name}&kind=${photo.kind}`,
            { method: "DELETE" },
        );

        if (res.ok) {
            toast({
                title: photo.kind === "original" ? "Photo deleted" : "Annotation removed",
                variant: "success",
            });
            await loadPhotos();
        } else {
            toast({
                title: "Delete failed",
                variant: "destructive",
            });
        }
    }

    // --------------------------------------------------
    // Render
    // --------------------------------------------------
    return (
        <div className="space-y-6">
            {/* Upload section */}
            {allowUpload && (
                <div>
                    <label className="block font-semibold mb-2">Add Photos</label>

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
                                    className="h-48 w-full object-cover rounded border"
                                    unoptimized
                                />
                            ))}
                        </div>
                    )}

                    <button
                        disabled={loading || files.length === 0}
                        onClick={handleUpload}
                        className="bg-blue-600 text-white px-4 py-2 rounded mt-4 disabled:bg-gray-400"
                    >
                        {loading ? "Uploading..." : "Upload Photos"}
                    </button>
                </div>
            )}

            {allowUpload && <hr />}

            {/* Existing photos */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Existing Photos</h2>

                {groupedPhotos.length === 0 && (
                    <p className="text-gray-500">No photos uploaded yet.</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {groupedPhotos.map((group) => (
                        <React.Fragment key={group.original?.name ?? group.annotated?.name}>
                            {[group.original, group.annotated].filter(Boolean).map((photo) => (
                                <div
                                    key={`${photo!.kind}-${photo!.name}`}
                                    className={`group space-y-2 ${
                                        allowUpload ? "cursor-pointer" : "cursor-default"
                                    }`}
                                    onClick={() => {
                                        if (!allowUpload) return;
                                        window.location.href = `/inspections/${inspectionId}/annotate/${photo!.name}`;
                                    }}
                                >
                                    <div className="text-sm text-gray-600">
                                        {photo!.kind === "annotated" ? (
                                            <span className="text-green-600 font-semibold">
                                                Annotated ✔
                                            </span>
                                        ) : (
                                            "Original"
                                        )}
                                    </div>

                                    <div className="relative">
                                        <Image
                                            src={photo!.url}
                                            alt={photo!.name}
                                            width={400}
                                            height={260}
                                            className="h-48 w-full object-cover rounded border group-hover:opacity-90 transition"
                                            unoptimized
                                        />

                                        {/* Mobile actions */}
                                        {allowUpload && (
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `/inspections/${inspectionId}/annotate/${photo!.name}`;
                                                    }}
                                                    className="flex-1 text-sm border rounded py-1 text-center"
                                                >
                                                    ✏️ Edit
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmPhoto(photo!);
                                                    }}
                                                    className="flex-1 text-sm border border-red-500 text-red-600 rounded py-1"
                                                >
                                                    {photo!.kind === "original"
                                                        ? "🗑 Delete"
                                                        : "🗑 Clear"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <ConfirmDialog
                open={!!confirmPhoto}
                title={confirmPhoto?.kind === "original" ? "Delete photo?" : "Remove annotation?"}
                description={
                    confirmPhoto?.kind === "original"
                        ? "This will permanently delete the original photo and its annotation. This action cannot be undone."
                        : "This will remove the annotation but keep the original photo."
                }
                confirmLabel={
                    confirmPhoto?.kind === "original" ? "Delete Photo" : "Remove Annotation"
                }
                destructive
                onCancel={() => setConfirmPhoto(null)}
                onConfirm={async () => {
                    if (!confirmPhoto) return;
                    await performDelete(confirmPhoto);
                    setConfirmPhoto(null);
                }}
            />
        </div>
    );
}
