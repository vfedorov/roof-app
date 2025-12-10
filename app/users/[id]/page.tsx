import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { deleteUser } from "../actions";
import {PageParams} from "@/types/next";

export default async function UserDetailPage({ params }: PageParams) {
    const { id } = params;

    const { data: user } = await supabase.from("users").select("*").eq("id", id).single();

    if (!user) return <div>User not found</div>;

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">{user.name}</h1>

            <div className="space-y-2 mb-6">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Role:</strong> {user.role}</div>
                <div><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</div>
            </div>

            <div className="flex gap-4">
                <Link href={`/users/${id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Edit
                </Link>

                <form action={deleteUser.bind(null, id)}>
                    <button className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                </form>
            </div>
        </div>
    );
}
