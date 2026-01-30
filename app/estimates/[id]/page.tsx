import { getUser } from "@/lib/auth/auth";

export default async function EstimateDetailPage() {
    const user = await getUser();

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Estimate</h1>
        </div>
    );
}
