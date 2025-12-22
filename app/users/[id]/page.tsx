import { supabase } from "@/lib/supabase/supabase";
import Link from "next/link";
import { deleteUser } from "../actions";

export default async function UserDetailPage({ params }: PageProps<"/users/[id]">) {
    const { id } = await params;

    const { data: user } = await supabase.from("users").select("*").eq("id", id).single();

    if (!user) return <div>User not found</div>;

    return (
        <div className="form-control">
            <h1 className="form-title">{user.name}</h1>

            <div className="space-y-2 mb-6">
                <div>
                    <strong>Email:</strong> {user.email}
                </div>
                <div>
                    <strong>Role:</strong> {user.role}
                </div>
                <div>
                    <strong>Created:</strong> {new Date(user.created_at).toLocaleString()}
                </div>
            </div>

            <div className="flex gap-4">
                <Link href={`/users/${id}/edit`} className="btn">
                    Edit
                </Link>

                <form action={deleteUser.bind(null, id)}>
                    <button className="btn-danger">Delete</button>
                </form>
            </div>
        </div>
    );
}
