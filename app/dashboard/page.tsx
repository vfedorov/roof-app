import { getUser } from "@/lib/auth";
import AdminDashboard from "./sections/admin-dashboard";
import InspectorDashboard from "./sections/inspector-dashboard";

export default async function DashboardPage() {
    const user = await getUser();

    if (user.role === "admin") {
        return <AdminDashboard />;
    } else {
        return <InspectorDashboard userId={user.id} />;
    }
}
