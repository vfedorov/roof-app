"use client";

import { useServerAction } from "@/app/components/hooks/use-server-action";
import { createProperty, updateProperty } from "@/app/properties/actions";
import { FormEvent } from "react";
import { redirect } from "next/navigation";
import { Measurement } from "@/lib/inspections/types";
import Link from "next/link";

export function EditPropertyForm({
    id,
    property,
    measurements,
}: {
    id?: string;
    property?: Record<string, any>;
    measurements?: Measurement[] | null;
}) {
    const { run, isPending } = useServerAction(id ? updateProperty : createProperty, {
        successMessage: `Property ${id ? "updated" : "created"} successfully`,
    });

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const res = id ? await run(id, formData) : await run(formData);

        redirect(`/properties/${id ? id : res?.data?.id}`);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                required
                name="name"
                placeholder="Name"
                defaultValue={property?.name}
                className="border p-2 w-full"
            />
            <input
                name="address"
                placeholder="Address"
                defaultValue={property?.address}
                className="border p-2 w-full"
            />
            <input
                name="city"
                placeholder="City"
                defaultValue={property?.city}
                className="border p-2 w-full"
            />
            <input
                name="state"
                placeholder="State"
                defaultValue={property?.state}
                className="border p-2 w-full"
            />
            <input
                name="zip"
                placeholder="ZIP"
                defaultValue={property?.zip}
                className="border p-2 w-full"
            />
            <textarea
                name="notes"
                placeholder="Notes"
                defaultValue={property?.notes || ""}
                className="border p-2 w-full"
            />
            {measurements && measurements.length > 0 && (
                <>
                    <h2 className="text-xl font-semibold mb-3">Measurements</h2>
                    <div className="space-y-3">
                        {measurements.map((p) => (
                            <Link
                                key={p.id}
                                href={`/measurements/${p.id}`}
                                className="block border p-4 rounded"
                            >
                                Inspector: {p.users?.name}
                                {" | "}
                                Date: {new Date(p.date).toLocaleDateString()}
                            </Link>
                        ))}
                    </div>
                </>
            )}
            <button type="submit" disabled={isPending} className="btn">
                {isPending ? "Saving..." : id ? "Update" : "Save"}
            </button>
        </form>
    );
}
