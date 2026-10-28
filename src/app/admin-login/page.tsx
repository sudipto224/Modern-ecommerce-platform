"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useBusinessProfile } from "@/lib/business-profile";

export default function AdminLoginPage() {
  const router = useRouter();

  // Dynamic business branding from Supabase Settings
  const { profile } = useBusinessProfile();

  const businessName =
    profile.businessName.trim() || "Mehedi By Meherin";

  // Preserve existing two-tone branding
  const brandWords = businessName.split(/\s+/).filter(Boolean);

  const primaryBrand =
    brandWords.length > 1
      ? brandWords.slice(0, -1).join(" ")
      : businessName;

  const highlightedWord =
    brandWords.length > 1
      ? brandWords[brandWords.length - 1]
      : "";

  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // Sign in using Supabase Authentication
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        setError("Invalid email or password.");
        return;
      }

      // Verify the user has an authorized admin role
      const { data: admin, error: roleError } =
        await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

      if (
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        await supabase.auth.signOut();

        setError("You do not have admin access.");
        return;
      }

      // Redirect after successful login
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf6] px-5 py-12 text-[#44271f]">
      <div className="w-full max-w-md">

        {/* DYNAMIC BUSINESS BRAND */}
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="inline-block max-w-full text-[#44271f]"
          >
            <span className="block break-words text-2xl font-bold leading-snug tracking-wide sm:text-3xl">
              {primaryBrand}

              {highlightedWord && (
                <>
                  {" "}
                  <span className="text-[#b77b5b]">
                    {highlightedWord}
                  </span>
                </>
              )}
            </span>
          </Link>

          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[#a57964]">
            Business Management System
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="rounded-3xl border border-[#eaded5] bg-white p-7 shadow-xl shadow-[#693f31]/5 sm:p-10">

          {/* LOGIN HEADING */}
          <div className="mb-9 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4e4dc] text-3xl text-[#b77b5b]">
              ✿
            </div>

            <h1 className="font-serif text-4xl">
              Welcome Back
            </h1>

            <p className="mt-3 text-sm text-[#80685b]">
              Sign in to manage {businessName}.
            </p>
          </div>

          {/* LOGIN FORM */}
          <form
            onSubmit={handleLogin}
            className="space-y-6"
          >

            {/* EMAIL ADDRESS */}
            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-medium"
              >
                Email Address
              </label>

              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-[#e6d6cc] px-4 py-3 outline-none transition focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#e6d6cc] px-4 py-3 pr-20 outline-none transition focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20"
                />

                {/* SHOW / HIDE PASSWORD */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#875441]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#693f31] px-6 py-4 font-semibold text-white transition hover:bg-[#875441] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Signing In..."
                : "Sign In to Dashboard →"}
            </button>

          </form>

          {/* ACCESS NOTICE */}
          <p className="mt-7 text-center text-xs text-[#80685b]">
            Authorized staff access only.
          </p>
        </div>

        {/* BACK TO WEBSITE */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-[#875441] hover:underline"
          >
            ← Back to Website
          </Link>
        </div>

      </div>
    </main>
  );
}
