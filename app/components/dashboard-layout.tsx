import { ReactNode } from "react";
import { getUser } from "@/lib/auth";
import NavLink from "@/app/components/ui/nav-link";
import LogoutButton from "@/app/components/ui/logout-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const user = await getUser();

    return (
        <div className="flex">
            {user && (
                <aside className="dashboard">
                    <div className="font-bold mb-6">Roof App</div>
                    <nav className="space-y-3">
                        {user.role === "admin" && (
                            <>
                                <NavLink href="/dashboard">Dashboard</NavLink>
                                <NavLink href="/properties">Properties</NavLink>
                                <NavLink href="/inspections">Inspections</NavLink>
                                <NavLink href="/users">Users</NavLink>
                            </>
                        )}
                        {user.role === "inspector" && (
                            <>
                                <NavLink href="/dashboard">Dashboard</NavLink>
                                <NavLink href="/properties">Properties</NavLink>
                                <NavLink href="/inspections">My Inspections</NavLink>
                            </>
                        )}
                    </nav>

                    <nav className="mt-10">
                        <LogoutButton />
                    </nav>
                </aside>
            )}

            <main className="flex-1 p-10">{children}</main>
        </div>
    );
}
