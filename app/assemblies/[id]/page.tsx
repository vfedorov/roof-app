import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";
import { deactivateAssembly } from "@/app/assemblies/actions";
import { USER_ROLES } from "@/lib/auth/roles";
import { getUser } from "@/lib/auth/auth";

export default async function AssemblyDetailPage({ params }: PageProps<"/assemblies/[id]">) {
    const { id } = await params;
    const user = await getUser();
    if (user.role != USER_ROLES.ADMIN) {
        return (
            <div className="flex justify-center">
                <span>
                    <strong>Hear me now. The administrator&#39;s domain, these pages are.</strong>
                </span>
            </div>
        );
    }
    const { data: assembly } = await supabase
        .from("assemblies")
        .select(
            "*, users(name), assembly_categories(type_name, category_name), assembly_companies(company_name)",
        )
        .eq("id", id)
        .single();
    if (!assembly) return <div>Assembly not found</div>;

    return (
        <div className="page gap-6">
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex-1 space-y-4">
                    <div className="card">
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-sm uppercase tracking-wide text-gray-500">
                                    Assembly
                                </p>
                                <h1 className="text-2xl font-bold">
                                    {assembly.assembly_name}{" "}
                                    {!assembly.is_active && (
                                        <span className="text-gray-400 font-normal">
                                            {" "}
                                            (Deactivated)
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {assembly.assembly_type} (
                                    {assembly.assembly_companies?.company_name})
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link key={id} href={`/assemblies/${id}/edit`} className="btn">
                                    Edit
                                </Link>
                                {assembly.is_active && (
                                    <form action={deactivateAssembly.bind(null, id)}>
                                        <button className="btn-danger">Deactivate</button>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Category:</p>
                                <p className="font-medium">
                                    {assembly.assembly_categories?.category_name ?? "Unassigned"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Price:</p>
                                {assembly.material_price && assembly.material_price > 0 && (
                                    <p className="font-medium">
                                        Material: {assembly.material_price} ($/
                                        {assembly.pricing_type})
                                    </p>
                                )}
                                {assembly.labor_price && assembly.labor_price > 0 && (
                                    <p className="font-medium">
                                        Labor: {assembly.labor_price} ($/{assembly.pricing_type})
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
