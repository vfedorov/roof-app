import { createUser } from "../actions";

export default function NewUserPage() {
    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Add New User</h1>

            <form action={createUser} className="space-y-4">
                <input name="name" placeholder="Name" className="border p-2 w-full" required />
                <input name="email" placeholder="Email" className="border p-2 w-full" required />
                <input name="password" placeholder="Password" type="password" className="border p-2 w-full" required />

                <select name="role" className="border p-2 w-full" required>
                    <option value="inspector">Inspector</option>
                    <option value="admin">Admin</option>
                </select>

                <button className="bg-black text-white px-4 py-2 rounded">Create</button>
            </form>
        </div>
    );
}
