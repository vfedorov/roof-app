import {ReactNode} from "react";
import {getUser} from "@/lib/auth";
import NavLink from "@/app/components/ui/nav-link";

export default async function DashboardLayout({children}: { children: ReactNode }) {
  const user = await getUser();

  return (
    <div className="flex">

      {user && <aside
          className="
                    w-64 h-screen p-6 border-r
                    bg-gray-50 text-gray-900
                    dark:bg-gray-900 dark:text-gray-100
                    border-gray-200 dark:border-gray-700
                  "
      >
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

          <form className="mt-10" action="/api/auth/logout" method="post">
              <button className="btn-outline text-danger">Logout</button>
          </form>
      </aside>}

      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
