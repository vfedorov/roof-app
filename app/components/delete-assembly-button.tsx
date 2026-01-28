"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateAssembly } from "@/app/assemblies/actions";
import { useToast } from "@/app/components/providers/toast-provider";

interface DeleteAssemblyButtonProps {
    id: string;
    assemblyName: string;
}

export function DeleteAssemblyButton({ id, assemblyName }: DeleteAssemblyButtonProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDeactivate = async () => {
        if (
            !confirm(
                `Are you sure you want to deactivate "${assemblyName}"?\n\nThis will hide it from estimates but preserve all data.`,
            )
        ) {
            return;
        }

        startTransition(async () => {
            const result = await deactivateAssembly(id);

            if (result?.ok) {
                toast({
                    title: "Success",
                    description: `"${assemblyName}" has been deactivated.`,
                });
                router.push("/assemblies");
            } else {
                toast({
                    title: "Error",
                    description: result?.message || "Failed to deactivate assembly",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <button
            type="button"
            onClick={handleDeactivate}
            disabled={isPending}
            className="btn btn-danger hover:shadow-md transition-shadow disabled:opacity-50"
        >
            {isPending ? "Deactivating..." : "Deactivate"}
        </button>
    );
}
