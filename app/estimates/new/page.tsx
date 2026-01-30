import { getUser } from "@/lib/auth/auth";
import EstimateForm from "@/app/components/estimate_form";
import { createEstimate } from "@/app/estimates/actions";

export default async function NewEstimatePage() {
    const user = await getUser();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">New Estimate</h1>
            <EstimateForm user={user} action={createEstimate} />
        </div>
    );
}
