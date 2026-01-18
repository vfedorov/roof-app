"use client";

import NavLink from "@/app/components/ui/nav-link";
import { usePathname } from "next/navigation";

export default function DesktopHeader() {
    const pathname = usePathname();

    const generateBreadcrumbs = () => {
        if (pathname === "/dashboard") {
            return [{ label: "Dashboard", href: "/dashboard" }];
        }

        const pathSegments = pathname.split("/").filter((segment) => segment !== "");
        const breadcrumbs = [];

        breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });

        let currentPath = "";
        for (let i = 0; i < pathSegments.length; i++) {
            let segment = pathSegments[i];
            const prevSegment = pathSegments[i - 1];
            currentPath += `/${segment}`;

            if (
                /^\d+$/.test(segment) ||
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
            ) {
                segment = "element";
            }

            let label = segment;
            switch (segment) {
                case "properties":
                    label = "Properties";
                    break;
                case "inspections":
                    label = "Inspections";
                    break;
                case "measurements":
                    label = "Measurements";
                    break;
                case "users":
                    label = "Users";
                    break;
                case "new":
                    label = "New";
                    break;
                case "edit":
                    label = "Edit";
                    break;
                case "element":
                    label = prevSegment.charAt(0).toUpperCase() + prevSegment.slice(1, -1);
                    break;
            }
            if (label != "login") {
                if (i === pathSegments.length - 1) {
                    breadcrumbs.push({ label, href: null });
                } else {
                    breadcrumbs.push({ label, href: currentPath });
                }
            } else {
                breadcrumbs.length = 0;
            }
        }

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    return (
        <div className="hidden lg:block border-b mb-4">
            <div className="flex items-center justify-between p-4">
                <div className="font-semibold h-8 flex items-center">
                    {pathname === "/dashboard" ? (
                        <span className="text-xl font-bold">Roof App</span>
                    ) : (
                        <nav
                            className="flex items-center space-x-2 text-sm"
                            aria-label="Breadcrumb"
                        >
                            {breadcrumbs.map((crumb, index) => (
                                <div key={index} className="flex items-center">
                                    {crumb.href ? (
                                        <>
                                            <NavLink href={crumb.href}>{crumb.label}</NavLink>
                                            {index < breadcrumbs.length - 1 && (
                                                <span className="mx-2 text-gray-400">
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="currentColor"
                                                        viewBox="0 0 16 16"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                                                        />
                                                    </svg>
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-gray-100 font-medium">
                                            {crumb.label}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </nav>
                    )}
                </div>
            </div>
        </div>
    );
}
