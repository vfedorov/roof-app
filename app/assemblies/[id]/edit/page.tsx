import { getUser } from "@/lib/auth/auth";
import { supabase } from "@/lib/supabase/supabase";
import AssemblyForm from "@/app/components/assembly_form";
import { updateAssembly } from "@/app/assemblies/actions";

export default async function EditAssemblyPage({ params }: { params: { id: string } }) {
    const user = await getUser();

    const { data: assemblyData, error } = await supabase
        .from("assemblies")
        .select("*")
        .eq("id", params.id)
        .single();

    if (error || !assemblyData) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Assembly Not Found</h1>
                <p className="text-gray-600">The assembly you are looking for does not exist.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Edit Assembly</h1>
            <AssemblyForm user={user} action={updateAssembly} assembly={assemblyData} />
        </div>
    );
}
