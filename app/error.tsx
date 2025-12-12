"use client";

type ErrorPageProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps) {
    return (
        <div className="form-control">
            <h1 className="form-title">Something went wrong</h1>

            <p className="text-red-500 mb-4">Failed to load data. Please try again later.</p>

            <button onClick={reset} className="btn">
                Try again
            </button>
        </div>
    );
}
