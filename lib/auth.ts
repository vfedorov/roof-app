import { cookies } from "next/headers";
import { supabase } from "./supabase";
import { redirect } from "next/navigation";

export async function getUser() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) return null;

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.value)
        .single();

    if (error) return null;

    return data;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/login");
}
