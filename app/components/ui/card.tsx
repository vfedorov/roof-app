import { PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
    return (
        <div
            className={`
        border p-6 rounded 
        bg-white text-gray-900 
        dark:bg-gray-800 dark:text-gray-100 
        border-gray-200 dark:border-gray-700
        ${className}
      `}
        >
            {children}
        </div>
    );
}
