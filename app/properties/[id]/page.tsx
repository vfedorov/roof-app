import { supabase } from "@/lib/supabase/supabase";
import Link from "next/link";
import { deleteProperty } from "@/app/properties/actions";
import { getUser } from "@/lib/auth/auth";
import { DeleteButton } from "@/app/components/delete-button";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function PropertyDetailPage({ params }: PageProps<"/properties/[id]">) {
    const user = await getUser();
    const { id } = await params;

    const { data: property } = await supabase.from("properties").select("*").eq("id", id).single();
    const { data: measurements } = await supabase
        .from("measurement_sessions")
        .select("*, users(name)")
        .eq("property_id", id);

    if (!property) return <div>Property not found</div>;

    let visibleMeasurements = [];
    if (user.role === USER_ROLES.ADMIN) {
        visibleMeasurements = measurements || [];
    } else {
        visibleMeasurements = (measurements || []).filter(
            (session) => session.created_by === user.id,
        );
    }

    return (
        <div className="form-control">
            <h1 className="form-title">{property.name}</h1>

            <div className="space-y-2 mb-6">
                <div>
                    <strong>Address:</strong> {property.address}
                </div>
                <div>
                    <strong>City:</strong> {property.city}
                </div>
                <div>
                    <strong>State:</strong> {property.state}
                </div>
                <div>
                    <strong>ZIP:</strong> {property.zip}
                </div>
                <div>
                    <strong>Notes:</strong> {property.notes}
                </div>
                {visibleMeasurements && visibleMeasurements.length > 0 && (
                    <>
                        <h2 className="text-xl font-semibold mb-3">Measurements</h2>
                        <div className="space-y-3">
                            {visibleMeasurements.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/measurements/${p.id}`}
                                    className="block border p-4 rounded"
                                >
                                    Inspector: {p.users?.name}
                                    {" | "}
                                    Date: {new Date(p.date).toLocaleDateString()}
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {user.role === USER_ROLES.ADMIN && (
                <div className="flex gap-4">
                    <Link href={`/properties/${id}/edit`} className="btn">
                        Edit
                    </Link>
                    <DeleteButton id={id} action={deleteProperty} redirect_path="/properties" />
                </div>
            )}
        </div>
    );
}
