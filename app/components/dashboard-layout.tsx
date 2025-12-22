import { ReactNode } from "react";
import { getUser } from "@/lib/auth/auth";
import NavLink from "@/app/components/ui/nav-link";
import LogoutButton from "@/app/components/ui/logout-button";

import MobileHeader from "@/app/components/mobile-header";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const user = await getUser();

    return (
        <div className="layout-container">
            {user && (
                <>
                    {/* Desktop sidebar */}
                    <aside className="dashboard hidden md:flex flex-col">
                        <div className="items-center gap-3 mb-8 sidebar-title">
                            <img src="/logo.png" alt="logo" className="h-14 w-auto" />
                            <span className="block mt-4 ml-2.5">Roof App</span>
                        </div>

                        <nav className="sidebar-nav">
                            {user.role === USER_ROLES.ADMIN && (
                                <>
                                    <NavLink href="/dashboard">Dashboard</NavLink>
                                    <NavLink href="/properties">Properties</NavLink>
                                    <NavLink href="/inspections">Inspections</NavLink>
                                    <NavLink href="/users">Users</NavLink>
                                </>
                            )}
                            {user.role === USER_ROLES.INSPECTOR && (
                                <>
                                    <NavLink href="/dashboard">Dashboard</NavLink>
                                    <NavLink href="/properties">Properties</NavLink>
                                    <NavLink href="/inspections">My Inspections</NavLink>
                                </>
                            )}
                        </nav>

                        <div className="mt-auto pt-8">
                            <LogoutButton />
                        </div>
                    </aside>
                </>
            )}

            <main className="main-content">
                {user && <MobileHeader role={user.role} />}
                {children}
            </main>
        </div>
    );
}
