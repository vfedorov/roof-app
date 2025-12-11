"use client";

import { useState } from "react";
import { useServerAction } from "@/app/components/hooks/use-server-action";
import { createUser } from "@/app/users/actions";

export function CreateUserForm() {
    const { run, isPending } = useServerAction(createUser, {
        successMessage: "User created successfully",
    });

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);

    function validateEmail(value: string) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(value);
    }

    function onEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setEmail(value);

        if (!validateEmail(value)) {
            setEmailError("Invalid email format");
        } else {
            setEmailError(null);
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (emailError) return;

        const formData = new FormData(e.currentTarget);
        run(formData);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" placeholder="Name" className="border p-2 w-full" required />

            <div>
                <input
                    name="email"
                    placeholder="Email"
                    className={`border p-2 w-full ${emailError ? "border-red-500" : ""}`}
                    autoComplete="new-email"
                    value={email}
                    onChange={onEmailChange}
                    required
                />
                {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
            </div>

            <input
                name="password"
                placeholder="Password"
                type="password"
                className="border p-2 w-full"
                autoComplete="new-password"
                required
            />

            <select name="role" className="border p-2 w-full" required>
                <option value="inspector">Inspector</option>
                <option value="admin">Admin</option>
            </select>

            <button
                type="submit"
                disabled={isPending || emailError !== null}
                className="bg-black text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
                {isPending ? "Creating..." : "Create"}
            </button>
        </form>
    );
}
