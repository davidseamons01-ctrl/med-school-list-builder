"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error === "email_already_registered" ? "Email already registered." : "Unable to create account.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/",
        redirect: false,
      });
      if (!result || result.error) {
        setError("Account created, but sign-in failed. Please use Sign in.");
        return;
      }
      window.location.href = result.url ?? "/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl">
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">Sign up first, then start building your med school strategy.</p>
        {error ? <p className="mt-3 rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-xs text-slate-300">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Password (min 8 chars)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/signin" className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
