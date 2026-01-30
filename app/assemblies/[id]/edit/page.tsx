import { getUser } from "@/lib/auth/auth";
import { supabase } from "@/lib/supabase/supabase";
import AssemblyForm from "@/app/components/assembly_form";
import { updateAssembly } from "@/app/assemblies/actions";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function EditAssemblyPage({ params }: PageProps<"/assemblies/[id]/edit">) {
    const user = await getUser();
    const { id } = await params;

    if (user.role != USER_ROLES.ADMIN) {
        return (
            <div className="flex justify-center">
                <span>
                    <strong>Again, you must hear: to the administrator, belong these pages.</strong>
                </span>
            </div>
        );
    }
    const { data: assemblyData, error } = await supabase
        .from("assemblies")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !assemblyData) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Assembly Not Found</h1>
                <p className="text-gray-600">The assembly you are looking for does not exist.</p>
            </div>
        );
    }

    const assemblyForForm = {
        id: assemblyData.id,
        assembly_name: assemblyData.assembly_name,
        assembly_type: assemblyData.assembly_type,
        assembly_category: assemblyData.assembly_category,
        assembly_company: assemblyData.company_id,
        pricing_type: assemblyData.pricing_type,
        material_price: assemblyData.material_price ?? "",
        labor_price: assemblyData.labor_price ?? "",
        is_active: assemblyData.is_active,
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Edit Assembly</h1>
            <AssemblyForm user={user} action={updateAssembly} assembly={assemblyForForm} />
        </div>
    );
}
