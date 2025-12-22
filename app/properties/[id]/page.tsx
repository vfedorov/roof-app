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

    if (!property) return <div>Property not found</div>;

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
