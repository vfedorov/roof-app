import {supabase} from "@/lib/supabase";
import {updateProperty} from "../../actions";

export default async function EditPropertyPage({params}: PageProps<'/properties/[id]/edit'>) {
  const {id} = await params;

  const {data: property} = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Edit Property</h1>

      <form action={updateProperty.bind(null, id)} className="space-y-4">
        <input name="name" defaultValue={property.name} className="border p-2 w-full"/>
        <input name="address" defaultValue={property.address} className="border p-2 w-full"/>
        <input name="city" defaultValue={property.city} className="border p-2 w-full"/>
        <input name="state" defaultValue={property.state} className="border p-2 w-full"/>
        <input name="zip" defaultValue={property.zip} className="border p-2 w-full"/>
        <textarea name="notes" defaultValue={property.notes} className="border p-2 w-full"/>

        <button type="submit" className="btn">Update</button>
      </form>
    </div>
  );
}
