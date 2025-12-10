import { supabase } from "@/lib/supabase";
import { updateUser } from "../../actions";
import {PageParams} from "@/types/next";

export default async function EditUserPage({ params }: PageParams) {
    const { id } = params;

    const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Edit User</h1>

            <form action={updateUser.bind(null, id)} className="space-y-4">
                <input name="name" defaultValue={user.name} className="border p-2 w-full" />
                <input name="email" defaultValue={user.email} className="border p-2 w-full" />

                <select name="role" defaultValue={user.role} className="border p-2 w-full">
                    <option value="inspector">Inspector</option>
                    <option value="admin">Admin</option>
                </select>

                <button className="bg-black text-white px-4 py-2 rounded">Update</button>
            </form>
        </div>
    );
}
