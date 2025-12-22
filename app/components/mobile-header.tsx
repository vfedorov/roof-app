"use client";

import { useState } from "react";
import NavLink from "@/app/components/ui/nav-link";
import LogoutButton from "@/app/components/ui/logout-button";
import { usePathname } from "next/navigation";
import { USER_ROLES } from "@/lib/auth/roles";

export default function MobileHeader({ role }: { role: string }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const isDashboard = pathname === "/dashboard";

    return (
        <div className="md:hidden border-b mb-4">
            <div className="flex items-center justify-between p-4">
                <div className="font-semibold h-8 flex items-center">
                    {isDashboard ? (
                        <span>Roof App</span>
                    ) : (
                        <NavLink href="/dashboard">← Back to Dashboard</NavLink>
                    )}
                </div>

                <button
                    onClick={() => setOpen(!open)}
                    className="text-2xl leading-none transition-transform duration-200"
                    aria-label={open ? "Close menu" : "Open menu"}
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {/* Animated menu */}
            <div
                className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${open ? "max-h-96 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2"}
                `}
            >
                <nav className="p-4 pt-0 space-y-3">
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/properties">Properties</NavLink>
                    <NavLink href="/inspections">
                        {role === USER_ROLES.ADMIN ? "Inspections" : "My Inspections"}
                    </NavLink>
                    {role === USER_ROLES.ADMIN && <NavLink href="/users">Users</NavLink>}
                    <LogoutButton />
                </nav>
            </div>
        </div>
    );
}
