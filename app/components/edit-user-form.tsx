"use client";

import { useServerAction } from "@/app/components/hooks/use-server-action";
import { updateUser } from "@/app/users/actions";
import { USER_ROLES } from "@/lib/auth/roles";

export function EditUserForm({ id, user }: { id: string; user: Record<string, string> }) {
    const { run, isPending } = useServerAction(updateUser, {
        successMessage: "User updated successfully",
    });

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        run(id, formData);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" defaultValue={user.name} className="border p-2 w-full" />
            <input name="email" defaultValue={user.email} className="border p-2 w-full" />

            <select name="role" defaultValue={user.role} className="border p-2 w-full">
                <option value={USER_ROLES.INSPECTOR}>Inspector</option>
                <option value={USER_ROLES.ADMIN}>Admin</option>
            </select>

            <button type="submit" disabled={isPending} className="btn">
                {isPending ? "Saving..." : "Update"}
            </button>
        </form>
    );
}
