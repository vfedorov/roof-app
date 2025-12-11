"use client";

import { useServerAction } from "@/app/components/hooks/use-server-action";
import { redirect } from "next/navigation";

export function DeleteButton({
    id,
    action,
    redirect_path,
}: {
    id: string;
    action: any;
    redirect_path?: string;
}) {
    const { run, isPending } = useServerAction(action, {
        successMessage: "Item was deleted",
        errorMessage: "Failed to delete item",
    });

    async function handleClick() {
        await run(id);
        redirect_path && redirect(redirect_path);
    }

    return (
        <button onClick={handleClick} className="btn-danger" disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
        </button>
    );
}
