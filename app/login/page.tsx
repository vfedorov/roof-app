"use client";

import { useState } from "react";

export default function LoginPage() {
    const [error, setError] = useState("");

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const email = (form.elements.namedItem("email") as HTMLInputElement).value;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;

        const res = await fetch("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            setError("Invalid login credentials");
            return;
        }

        window.location.href = "/dashboard";
    }

    return (
        <div className="max-w-sm mx-auto mt-20">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {error && <p className="text-red-500">{error}</p>}
                <input name="email" placeholder="Email" className="border p-2" />
                <input
                    name="password"
                    placeholder="Password"
                    type="password"
                    className="border p-2"
                />
                <button className="btn bg-black text-white p-2">Login</button>
            </form>
        </div>
    );
}
