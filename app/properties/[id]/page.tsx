import {supabase} from "@/lib/supabase";
import Link from "next/link";
import {deleteProperty} from "@/app/properties/actions";

export default async function PropertyDetailPage({params}: PageProps<'/properties/[id]'>) {
  const {id} = await params;

  const {data: property} = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) return <div>Property not found</div>;

  return (
    <div className="form-control">
      <h1 className="form-title">{property.name}</h1>

      <div className="space-y-2 mb-6">
        <div><strong>Address:</strong> {property.address}</div>
        <div><strong>City:</strong> {property.city}</div>
        <div><strong>State:</strong> {property.state}</div>
        <div><strong>ZIP:</strong> {property.zip}</div>
        <div><strong>Notes:</strong> {property.notes}</div>
      </div>

      <div className="flex gap-4">
        <Link href={`/properties/${id}/edit`} className="btn">
          Edit
        </Link>

        <Link href="#" onClick={deleteProperty.bind(null, id)} className="btn-danger">
          Delete
        </Link>

      </div>
    </div>
  );
}
