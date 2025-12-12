"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "inspection-photos";
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

type StoredPhoto = {
    name: string;
    url: string;
    kind: "original" | "annotated";
};

export default function PhotoManager({ inspectionId }: { inspectionId: string }) {
    const [photos, setPhotos] = useState<StoredPhoto[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const originals = useMemo(() => photos.filter((p) => p.kind === "original"), [photos]);
    const annotated = useMemo(() => photos.filter((p) => p.kind === "annotated"), [photos]);

    useEffect(() => {
        refreshPhotos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inspectionId]);

    async function refreshPhotos() {
        const [originalList, annotatedList] = await Promise.all([
            supabase.storage.from(BUCKET).list(`inspections/${inspectionId}/original`),
            supabase.storage.from(BUCKET).list(`inspections/${inspectionId}/annotated`),
        ]);

        const next: StoredPhoto[] = [];

        if (!originalList.error) {
            for (const file of originalList.data ?? []) {
                const path = `inspections/${inspectionId}/original/${file.name}`;
                const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
                if (data?.publicUrl) {
                    next.push({ name: file.name, url: data.publicUrl, kind: "original" });
                }
            }
        }

        if (!annotatedList.error) {
            for (const file of annotatedList.data ?? []) {
                const path = `inspections/${inspectionId}/annotated/${file.name}`;
                const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
                if (data?.publicUrl) {
                    next.push({ name: file.name, url: data.publicUrl, kind: "annotated" });
                }
            }
        }

        setPhotos(next);
    }

    async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(event.target.files || []);
        setError(null);

        if (!selected.length) return;

        const currentCount = originals.length;
        if (currentCount + selected.length > MAX_FILES) {
            setError(`You can upload up to ${MAX_FILES} photos per inspection.`);
            return;
        }

        const invalid = selected.find(
            (file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE,
        );
        if (invalid) {
            setError("Use JPG/PNG up to 10 MB each.");
            return;
        }

        setIsUploading(true);
        try {
            for (const file of selected) {
                const extension = file.type === "image/png" ? "png" : "jpg";
                const filename = `${crypto.randomUUID()}.${extension}`;
                const path = `inspections/${inspectionId}/original/${filename}`;
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET)
                    .upload(path, file);
                if (uploadError) {
                    setError(uploadError.message);
                    break;
                }
            }
        } finally {
            setIsUploading(false);
            await refreshPhotos();
            event.target.value = "";
        }
    }

    return (
        <div className="card space-y-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm uppercase tracking-wide text-gray-500">
                        Inspection Photos
                    </p>
                    <h2 className="text-lg font-semibold">Upload & View</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        JPG/PNG up to 10 MB, max 20 photos. Annotated exports are stored separately.
                    </p>
                </div>
            </div>

            <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Add photos
                </span>
                <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg"
                    onChange={handleUpload}
                    disabled={isUploading}
                    className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Stored at inspections/{inspectionId}/original/
                </p>
            </label>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <div className="space-y-3">
                <SectionHeading label="Annotated" badge={annotated.length} />
                <PhotoGrid photos={annotated} placeholder="Annotated images will appear here." />

                <SectionHeading label="Original" badge={originals.length} />
                <PhotoGrid photos={originals} placeholder="Upload photos to get started." />
            </div>
        </div>
    );
}

function SectionHeading({ label, badge }: { label: string; badge: number }) {
    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <span>{label}</span>
            <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-white">
                {badge}
            </span>
        </div>
    );
}

function PhotoGrid({ photos, placeholder }: { photos: StoredPhoto[]; placeholder: string }) {
    if (!photos.length) {
        return <p className="text-sm text-gray-500">{placeholder}</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {photos.map((photo) => (
                <div
                    key={`${photo.kind}-${photo.name}`}
                    className="relative overflow-hidden rounded border border-gray-200 dark:border-gray-700"
                >
                    <div className="absolute left-2 top-2 rounded bg-white/80 px-2 py-1 text-[11px] font-semibold uppercase text-gray-700 dark:bg-gray-900/80 dark:text-gray-200">
                        {photo.kind}
                    </div>
                    <Image
                        src={photo.url}
                        alt={photo.name}
                        width={400}
                        height={260}
                        className="h-48 w-full object-cover"
                    />
                </div>
            ))}
        </div>
    );
}
