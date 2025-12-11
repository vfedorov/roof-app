"use client";

import { useTransition } from "react";
import { useToast } from "@/app/components/hooks/use-toast";

export function useServerAction<T extends (...args: any[]) => Promise<any>>(
    action: T,
    options?: {
        successMessage?: string;
        errorMessage?: string;
    },
) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    async function run(...args: Parameters<T>): Promise<ReturnType<T> | undefined> {
        return new Promise((resolve) => {
            startTransition(async () => {
                try {
                    const res = await action(...args);

                    if (res?.ok) {
                        toast({
                            title: options?.successMessage || "Operation successful",
                            variant: "success",
                        });
                    } else {
                        toast({
                            title: options?.errorMessage || res?.message || "Operation failed",
                            variant: "destructive",
                        });
                    }

                    resolve(res);
                } catch (err: any) {
                    toast({
                        title: options?.errorMessage || err?.message || "Operation failed",
                        variant: "destructive",
                    });
                    resolve(undefined);
                }
            });
        });
    }

    return { run, isPending };
}
