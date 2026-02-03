import { getUser } from "@/lib/auth/auth";
import EstimateForm from "@/app/components/estimate_form";
import { getEstimateById, updateEstimate } from "@/app/estimates/actions";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getUser();

    // if (!user || ![USER_ROLES.ADMIN].includes(user.role)) {
    //     return (
    //         <div className="flex justify-center p-6">
    //             <span className="text-lg font-semibold text-red-500">
    //                 <strong>
    //                     Access denied. Only administrators can edit estimates.
    //                 </strong>
    //             </span>
    //         </div>
    //     );
    // }

    const estimate = await getEstimateById(id);

    if (!estimate) {
        return (
            <div className="flex justify-center p-6">
                <span className="text-lg font-semibold text-red-500">Estimate not found</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Edit Estimate</h1>
            <EstimateForm
                user={user}
                action={updateEstimate}
                estimate={{
                    id: estimate.id,
                    inspection_id: estimate.inspection_id,
                    measurement_session_id: estimate.measurement_session_id,
                    is_finalize: estimate.is_finalized,
                }}
            />
        </div>
    );
}
