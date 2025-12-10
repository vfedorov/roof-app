import {supabase} from "@/lib/supabase";
import {EditUserForm} from "@/app/components/edit-user-form";


export default async function EditUserPage({params}: PageProps<'/users/[id]/edit'>) {
  const {id} = await params;

  const {data: user} = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Edit User</h1>
      <EditUserForm id={id} user={user}/>
    </div>
  );
}
