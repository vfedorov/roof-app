import {supabase} from "@/lib/supabase";
import {EditPropertyForm} from "@/app/components/EditPropertyForm";

export default async function EditPropertyPage({params}: PageProps<'/properties/[id]/edit'>) {
  const { id } = await params;

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) throw new Error("Property not found");

  return (
    <div className="form-control">
      <h1 className="form-title">Edit Property</h1>
      <EditPropertyForm id={id} property={property} />
    </div>
  );
}
