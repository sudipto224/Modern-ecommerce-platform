"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "Your invitation link is invalid or expired. Please request a new invitation."
          );
        }

        const { data: admin, error: roleError } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          roleError ||
          !admin ||
          !["owner", "manager"].includes(admin.role)
        ) {
          throw new Error(
            "This account is not authorized for admin access."
          );
        }

        if (active) {
          setAuthorized(true);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify your invitation."
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || !authorized || success) return;

    setError("");

    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your session has expired. Please request a new link."
        );
      }

      const { data: admin, error: roleError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        throw new Error("Admin access verification failed.");
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);

      await supabase.auth.signOut();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf6] px-5 py-12 text-[#44271f]">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold tracking-wide">
              Mehedi By{" "}
              <span className="text-[#b77b5b]">Meherin</span>
            </h1>
          </Link>

          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[#a57964]">
            Business Management System
          </p>
        </div>

        <div className="rounded-3xl border border-[#eaded5] bg-white p-7 shadow-xl shadow-[#693f31]/5 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4e4dc] text-3xl text-[#b77b5b]">
              ✿
            </div>

            <h2 className="font-serif text-3xl">
              {success ? "Password Updated" : "Set Your Password"}
            </h2>

            <p className="mt-3 text-sm text-[#80685b]">
              {success
                ? "Your password has been saved successfully."
                : "Create a secure password for your admin account."}
            </p>
          </div>

          {checking && (
            <p role="status" className="text-center text-sm text-[#80685b]">
              Verifying your secure session...
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {!checking && authorized && !success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium"
                >
                  New Password
                </label>

                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter a strong password"
                  className="w-full rounded-xl border border-[#e6d6cc] px-4 py-3 outline-none focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm Password
                </label>

                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm your password"
                  className="w-full rounded-xl border border-[#e6d6cc] px-4 py-3 outline-none focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#80685b]">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) =>
                    setShowPassword(event.target.checked)
                  }
                />
                Show passwords
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#693f31] px-6 py-4 font-semibold text-white transition hover:bg-[#875441] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving Password..." : "Set Password"}
              </button>
            </form>
          )}

          {success && (
            <Link
              href="/admin-login"
              className="block rounded-full bg-[#693f31] px-6 py-4 text-center font-semibold text-white hover:bg-[#875441]"
            >
              Go to Admin Login
            </Link>
          )}

          <div className="mt-7 text-center">
            <Link
              href="/admin-login"
              className="text-sm text-[#875441] hover:underline"
            >
              Back to Admin Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
