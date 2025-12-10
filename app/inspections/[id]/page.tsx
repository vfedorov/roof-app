import Link from "next/link";
import {supabase} from "@/lib/supabase";
import {deleteInspection} from "../actions";

export default async function InspectionDetailPage({params}: PageProps<'/inspections/[id]'>) {
  const {id} = await params;

  const {data: inspection} = await supabase
    .from("inspections")
    .select("*, properties(name, address), users(name)")
    .eq("id", id)
    .single();

  if (!inspection) return <div>Inspection not found</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">
        Inspection — {inspection.properties.name}
      </h1>

      <div className="space-y-2 mb-6">
        <div><strong>Inspector:</strong> {inspection.users?.name}</div>
        <div><strong>Date:</strong> {inspection.date}</div>
        <div><strong>Roof Type:</strong> {inspection.roof_type}</div>
        <div><strong>Notes:</strong> {inspection.summary_notes}</div>
      </div>

      <div className="flex gap-4">
        <Link href={`/inspections/${id}/edit`} className="btn">
          Edit
        </Link>

        <form action={deleteInspection.bind(null, id)}>
          <button className="btn-danger">
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}
