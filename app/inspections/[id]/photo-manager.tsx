"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

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
    allowUpload,
}: {
    inspectionId: string;
    allowUpload: boolean;
}) {
    const [files, setFiles] = useState<File[]>([]);
    const [storedPhotos, setStoredPhotos] = useState<StoredPhoto[]>([]);
    const [loading, setLoading] = useState(false);

    // **************************
    // Load existing photos
    // **************************
    async function loadPhotos() {
        if (!inspectionId) return;

        const res = await fetch(`/api/inspections/${inspectionId}/photos`);
        if (!res.ok) return;
        const data = await res.json();
        setStoredPhotos(data);
    }

    useEffect(() => {
        async function init() {
            await loadPhotos(); // this calls setStoredPhotos safely
        }
        init();
    }, [inspectionId]);

    // **************************
    // Handle file selection
    // **************************
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selected = Array.from(e.target.files);

        const valid = selected.filter(
            (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE,
        );

        if (valid.length + storedPhotos.length > MAX_FILES) {
            alert(`You can only upload up to ${MAX_FILES} total photos.`);
            return;
        }

        setFiles(valid);
    };

    // Generate previews
    const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

    // **************************
    // Upload selected photos
    // **************************
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
            await loadPhotos(); // <-- refresh UI
        } else {
            const err = await res.json();
            alert("Upload failed: " + err.error);
        }
    };

    return (
        <div className="space-y-6">
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

            <hr />

            <div>
                <h2 className="text-xl font-semibold mb-4">Existing Photos</h2>

                {storedPhotos.length === 0 && (
                    <p className="text-gray-500">No photos uploaded yet.</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {storedPhotos.map((photo) => (
                        <div key={photo.name} className="space-y-2">
                            <div className="text-sm text-gray-600">{photo.kind}</div>
                            <Image
                                src={photo.url}
                                alt={photo.name}
                                width={400}
                                height={260}
                                className="h-48 w-full object-cover rounded"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
