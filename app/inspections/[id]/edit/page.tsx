import {supabase} from "@/lib/supabase";
import {EditInspectionForm} from "@/app/components/edit-inspection-form";

export default async function EditInspectionPage({params}: PageProps<'/inspections/[id]/edit'>) {
  const {id} = await params;

  const {data: inspection} = await supabase
    .from("inspections")
    .select("*")
    .eq("id", id)
    .single();

  const {data: properties} = await supabase.from("properties").select("id, name");
  const {data: inspectors} = await supabase.from("users").select("id, name").eq("role", "inspector");

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Edit Inspection</h1>


      <EditInspectionForm id={id} inspection={inspection} inspectors={inspectors} properties={properties}/>
    </div>
  );
}
