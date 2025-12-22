import { supabase } from "@/lib/supabase/supabase";
import { EditUserForm } from "@/app/components/edit-user-form";

export default async function EditUserPage({ params }: PageProps<"/users/[id]/edit">) {
    const { id } = await params;

    const { data: user } = await supabase.from("users").select("*").eq("id", id).single();

    if (!user) {
        throw new Error("User not found");
    }

    return (
        <div className="form-control">
            <h1 className="form-title">Edit User</h1>
            <EditUserForm id={id} user={user} />
        </div>
    );
}
