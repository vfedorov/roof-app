import { getUser } from "@/lib/auth/auth";
import AdminDashboard from "./sections/admin-dashboard";
import InspectorDashboard from "./sections/inspector-dashboard";
import { USER_ROLES } from "@/lib/auth/roles";

export default async function DashboardPage() {
    const user = await getUser();

    if (user?.role === USER_ROLES.ADMIN) {
        return <AdminDashboard />;
    } else {
        return <InspectorDashboard userId={user.id} />;
    }
}
