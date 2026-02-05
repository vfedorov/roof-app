"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function NavLink({
    href,
    children,
    onClickAction,
}: {
    href: string;
    children: React.ReactNode;
    onClickAction?: () => void;
}) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            onClick={onClickAction}
            className={clsx(
                "block px-2 py-1 rounded transition-colors duration-200",
                "text-gray-700 dark:text-gray-300",
                "hover:text-blue-600 dark:hover:text-blue-400",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                {
                    "font-semibold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800":
                        isActive,
                },
            )}
        >
            {children}
        </Link>
    );
}
