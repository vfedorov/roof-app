import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function UsersPage() {
    const { data: users } = await supabase.from("users").select("*").order("created_at");

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <h1 className="text-xl font-bold">Users</h1>
                <Link href="/users/new" className="bg-black text-white px-4 py-2 rounded">
                    + Add User
                </Link>
            </div>

            <div className="space-y-3">
                {users?.map((u) => (
                    <Link
                        key={u.id}
                        href={`/users/${u.id}`}
                        className="block border p-4 rounded hover:bg-gray-50"
                    >
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email} — {u.role}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
