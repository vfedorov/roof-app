"use client";

import { createContext, ReactNode, useContext, useState } from "react";

export type ToastVariant = "default" | "destructive" | "success" | "warning";

export interface ToastOptions {
    title: string;
    description?: string;
    variant?: ToastVariant;
}

interface ToastContextValue {
    toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastOptions[]>([]);

    function toast(options: ToastOptions) {
        setToasts((prev) => [...prev, options]);
        // Автоудаление через 3 сек
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t !== options));
        }, 3000);
    }

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
                {toasts.map((t, i) => (
                    <div
                        key={i}
                        className={`rounded p-3 text-white shadow-md ${
                            t.variant === "destructive"
                                ? "bg-red-600"
                                : t.variant === "success"
                                  ? "bg-green-600"
                                  : t.variant === "warning"
                                    ? "bg-yellow-600 text-black"
                                    : "bg-gray-800"
                        }`}
                    >
                        <strong>{t.title}</strong>
                        {t.description && <div className="text-sm">{t.description}</div>}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
