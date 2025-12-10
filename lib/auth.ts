import { cookies } from "next/headers";
import { supabase } from "./supabase";

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
