import { getUser } from "@/lib/auth/auth";
import AssemblyForm from "@/app/components/assembly_form";
import { createAssembly } from "@/app/assemblies/actions";

export default async function NewAssemblyPage() {
    const user = await getUser();

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Create New Assembly</h1>
            <AssemblyForm user={user} action={createAssembly} />
        </div>
    );
}
