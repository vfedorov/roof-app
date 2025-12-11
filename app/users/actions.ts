"use server";

import {supabase} from "@/lib/supabase";
import {revalidatePath} from "next/cache";
import bcrypt from "bcryptjs";
import {redirect} from "next/navigation";
import {getUser} from "@/lib/auth";

export async function createUser(formData: FormData) {
  const user = await getUser();
  if (!user || user.role !== "admin"){
    throw new Error("Not allowed");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({
      name,
      email,
      password_hash,
      role,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/users");
  redirect(`/users/${data.id}`);
}


export async function updateUser(id: string, formData: FormData) {
  const user = await getUser();
  if (!user || user.role !== "admin"){
    throw new Error("Not allowed");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  const {error} = await supabase
    .from("users")
    .update({name, email, role})
    .eq("id", id);

  if (error) {
    return {ok: false, message: error.message};
  }

  revalidatePath(`/users/${id}`);

  return {ok: true};
}

export async function deleteUser(id: string) {
  const user = await getUser();
  if (!user || user.role !== "admin"){
    throw new Error("Not allowed");
  }
  
  await supabase.from("users").delete().eq("id", id);
  revalidatePath("/users");
  redirect(`/users`);
}
