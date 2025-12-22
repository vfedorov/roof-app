import Link from "next/link";
import { supabase } from "@/lib/supabase/supabase";

export default async function UsersPage() {
    const { data: users } = await supabase.from("users").select("*").order("created_at");

    return (
        <div className="page">
            <div className="header">
                <h1>Users</h1>
                <Link href="/users/new" className="btn">
                    Add User
                </Link>
            </div>

            <div className="list">
                {users?.map((u) => (
                    <Link key={u.id} href={`/users/${u.id}`} className="item">
                        <span>
                            <strong>{u.name}</strong>
                        </span>
                        <span className="details">
                            {u.email} — {u.role}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
