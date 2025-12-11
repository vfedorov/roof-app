"use client";

export default function LogoutButton() {
    async function handleLogout() {
        await fetch("/logout");
        window.location.href = "/login";
    }

    return (
        <button onClick={handleLogout} className="btn-outline text-danger">
            Logout
        </button>
    );
}
