import Link from "next/link";
import {supabase} from "@/lib/supabase";

export default async function PropertiesPage() {
  const {data: properties} = await supabase.from("properties").select("*").order("created_at", {ascending: false});

  return (
    <div className="page">
      <div className="header">
        <h1>Properties</h1>
        <Link href="/properties/new" className="btn">
          Add Property
        </Link>
      </div>

      <div className="list">
        {properties?.map((p) => (
          <Link
            key={p.id}
            href={`/properties/${p.id}`}
            className="item"
          >
            <span><strong>{p.name}</strong></span>
            <span className="details">{p.address}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
