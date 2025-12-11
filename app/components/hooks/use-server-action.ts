"use client";

import {useTransition} from "react";
import {useToast} from "@/app/components/hooks/use-toast";

export function useServerAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const {toast} = useToast();
  const [isPending, startTransition] = useTransition();

  function run(...args: Parameters<T>) {
    startTransition(async () => {
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
    });
  }

  return {run, isPending};
}
