import Link from "next/link";
import {supabase} from "@/lib/supabase";

export default async function InspectionsPage() {
  const {data: inspections} = await supabase
    .from("inspections")
    .select("*, properties(name), users(name)");

  return (
    <div className="page">
      <div className="header">
        <h1>Inspections</h1>
        <Link href="/inspections/new" className="btn">
          New Inspection
        </Link>
      </div>

      <div className="list">
        {inspections?.map((i) => (
          <Link key={i.id} href={`/inspections/${i.id}`} className="item">
            <span><strong>{i.properties?.name}</strong></span>
            <span className="details">
              Inspector: {i.users?.name} | Date: {i.date}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
