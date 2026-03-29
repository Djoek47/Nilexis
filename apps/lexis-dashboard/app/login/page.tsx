"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
    router.replace("/");
  }

  async function signUp() {
    setMessage(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Check your email if confirmation is required.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-center text-2xl font-semibold text-emerald-900 dark:text-emerald-400">
          Lexis
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Same account as the Nelexis mobile app
        </p>
        <form className="mt-8 space-y-4" onSubmit={signIn}>
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {message ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              {busy ? "…" : "Sign in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void signUp()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
            >
              Register
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link href="/" className="text-emerald-800 underline dark:text-emerald-400">
            Home
          </Link>{" "}
          requires sign-in.
        </p>
      </div>
    </div>
  );
}
