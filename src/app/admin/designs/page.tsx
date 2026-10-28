"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "draft" | "published";

type Design = {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: number | null;
  image_url: string | null;
  status: Status;
  created_at: string;
};

type DesignForm = {
  title: string;
  category: string;
  description: string;
  starting_price: string;
  status: Status;
};

const emptyForm: DesignForm = {
  title: "",
  category: "Bridal",
  description: "",
  starting_price: "",
  status: "published",
};

const BUCKET = "design-images";
const MAX_SIZE = 5 * 1024 * 1024;

const fileTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const inputStyle =
  "w-full rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 text-[#44271f] outline-none focus:border-[#b77b5b] focus:ring-2 focus:ring-[#b77b5b]/20";

export default function AdminDesignsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [designs, setDesigns] = useState<Design[]>([]);
  const [form, setForm] = useState<DesignForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load real designs from Supabase
  const loadDesigns = useCallback(async () => {
    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      setLoading(true);

      if (authError || !auth.user) {
        setAuthorized(false);
        router.replace("/admin-login");
        return;
      }

      const { data: admin, error: roleError } =
        await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", auth.user.id)
          .maybeSingle();

      if (
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        setAuthorized(false);
        throw new Error("Admin access denied.");
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("designs")
        .select(
          "id,title,category,description,starting_price,image_url,status,created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDesigns((data ?? []) as Design[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load designs."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDesigns();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDesigns]);

  function updateField(
    field: keyof DesignForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setErrorMessage("");
    setImageFile(null);

    if (!file) return;

    if (!fileTypes[file.type]) {
      setErrorMessage("Only JPG, PNG or WebP images allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      setErrorMessage("Image must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  // Add or edit design
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (busy || !authorized) return;

    const hasPrice = form.starting_price.trim() !== "";
    const price = hasPrice
      ? Number(form.starting_price)
      : null;

    if (
      !form.title.trim() ||
      !form.category ||
      (hasPrice &&
        (!/^\d+(\.\d{1,2})?$/.test(form.starting_price) ||
          price === null ||
          price < 0))
    ) {
      setErrorMessage("Please enter valid design details.");
      return;
    }

    setBusy(true);
    setSuccess("");
    setErrorMessage("");

    let uploadedPath: string | null = null;

    try {
      const existing = editingId
        ? designs.find((item) => item.id === editingId)
        : null;

      let imageUrl = existing?.image_url ?? null;

      // Upload a selected image
      if (imageFile) {
        const extension = fileTypes[imageFile.type];

        if (!extension || imageFile.size > MAX_SIZE) {
          throw new Error("Invalid image file.");
        }

        const path =
          `designs/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from(BUCKET)
            .upload(path, imageFile, {
              contentType: imageFile.type,
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) throw uploadError;

        uploadedPath = path;

        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);

        imageUrl = data.publicUrl;
      }

      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        starting_price: price,
        image_url: imageUrl,
        status: form.status,
      };

      if (editingId) {
        const { error } = await supabase
          .from("designs")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single();

        if (error) throw error;

        setSuccess("Design updated successfully!");
      } else {
        const { error } = await supabase
          .from("designs")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        setSuccess("Design added successfully!");
      }

      resetForm();
      await loadDesigns();
    } catch (error) {
      // Remove new upload if database save fails
      if (uploadedPath) {
        const { error: cleanupError } =
          await supabase.storage
            .from(BUCKET)
            .remove([uploadedPath]);

        if (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save design."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(design: Design) {
    setEditingId(design.id);

    setForm({
      title: design.title,
      category: design.category,
      description: design.description ?? "",
      starting_price:
        design.starting_price === null
          ? ""
          : String(design.starting_price),
      status: design.status,
    });

    setImageFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setErrorMessage("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(design: Design) {
    if (busy || !authorized) return;

    if (!window.confirm(`Delete "${design.title}"?`)) {
      return;
    }

    setBusy(true);
    setSuccess("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("designs")
        .delete()
        .eq("id", design.id)
        .select("id")
        .single();

      if (error) throw error;

      if (editingId === design.id) resetForm();

      setSuccess("Design deleted successfully!");
      await loadDesigns();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete design."
      );
    } finally {
      setBusy(false);
    }
  }

  const editingDesign = designs.find(
    (design) => design.id === editingId
  );

  return (
    <main className="min-h-screen bg-[#faf6f3] px-5 py-10 text-[#44271f] md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-[#b77b5b]">
              Gallery Management
            </p>
            <h1 className="font-serif text-4xl">
              Mehndi Design Management
            </h1>
            <p className="mt-3 text-sm text-[#80685b]">
              Manage designs, galleries and pricing.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-[#d9c3b5] px-6 py-3 text-sm hover:bg-white"
          >
            ← Dashboard
          </Link>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        {loading ? (
          <p>Loading designs...</p>
        ) : !authorized ? (
          <p>Admin authorization required.</p>
        ) : (
          <>
            {/* ADD / EDIT DESIGN */}
            <section className="mb-10 rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-7 font-serif text-3xl">
                {editingId ? "Edit Design" : "Add New Design"}
              </h2>

              <form
                onSubmit={handleSubmit}
                className="grid gap-5 md:grid-cols-2"
              >
                <div>
                  <label
                    htmlFor="design-title"
                    className="mb-2 block text-sm font-medium"
                  >
                    Design Title *
                  </label>
                  <input
                    id="design-title"
                    required
                    maxLength={150}
                    className={inputStyle}
                    placeholder="Royal Bridal Henna"
                    value={form.title}
                    onChange={(e) =>
                      updateField("title", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="design-category"
                    className="mb-2 block text-sm font-medium"
                  >
                    Category *
                  </label>
                  <select
                    id="design-category"
                    className={inputStyle}
                    value={form.category}
                    onChange={(e) =>
                      updateField("category", e.target.value)
                    }
                  >
                    <option value="Bridal">Bridal</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Traditional">
                      Traditional
                    </option>
                    <option value="Party">Party</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="design-description"
                    className="mb-2 block text-sm font-medium"
                  >
                    Description
                  </label>
                  <textarea
                    id="design-description"
                    rows={3}
                    className={inputStyle}
                    placeholder="Describe this mehndi design..."
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="design-price"
                    className="mb-2 block text-sm font-medium"
                  >
                    Starting Price (BDT)
                  </label>
                  <input
                    id="design-price"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputStyle}
                    placeholder="Optional"
                    value={form.starting_price}
                    onChange={(e) =>
                      updateField("starting_price", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="design-status"
                    className="mb-2 block text-sm font-medium"
                  >
                    Design Status
                  </label>
                  <select
                    id="design-status"
                    className={inputStyle}
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                  >
                    <option value="published">
                      Published — Public Gallery
                    </option>
                    <option value="draft">
                      Draft — Hidden
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="design-image"
                    className="mb-2 block text-sm font-medium"
                  >
                    Design Image
                  </label>

                  <input
                    id="design-image"
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="w-full rounded-xl border border-[#e6d6cc] bg-white p-3 text-sm"
                  />

                  <p className="mt-2 text-xs text-[#80685b]">
                    JPG, PNG, WebP — maximum 5 MB
                  </p>

                  {imageFile && (
                    <p className="mt-2 text-sm text-[#875441]">
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>

                {editingDesign?.image_url && (
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm">
                      Current Image:
                    </p>
                    <Image
                      src={editingDesign.image_url}
                      alt={editingDesign.title}
                      width={128}
                      height={128}
                      unoptimized
                      className="h-32 w-32 rounded-xl object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-[#693f31] px-8 py-3 font-medium text-white hover:bg-[#875441] disabled:opacity-50"
                  >
                    {busy
                      ? "Saving..."
                      : editingId
                        ? "Update Design"
                        : "+ Add Design"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={resetForm}
                      className="rounded-full border px-8 py-3"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* ALL DESIGNS */}
            <section className="rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-serif text-2xl">
                  All Designs
                </h2>
                <span className="rounded-full bg-[#f1e2d8] px-4 py-2 text-sm">
                  {designs.length} Designs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eaded5]">
                      <th className="p-4">Image</th>
                      <th className="p-4">Design</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {designs.map((design) => (
                      <tr
                        key={design.id}
                        className="border-b border-[#f0e7e1]"
                      >
                        <td className="p-4">
                          {design.image_url ? (
                            <Image
                              src={design.image_url}
                              alt={design.title}
                              width={64}
                              height={64}
                              unoptimized
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#f4e4dc] text-3xl">
                              ✿
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <p className="font-medium">
                            {design.title}
                          </p>
                          <p className="text-xs text-[#80685b]">
                            {design.category}
                          </p>
                        </td>

                        <td className="p-4">
                          {design.starting_price !== null
                            ? `৳${Number(
                                design.starting_price
                              ).toFixed(2)}`
                            : "On Request"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-2 text-xs ${
                              design.status === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {design.status}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleEdit(design)}
                              className="rounded-lg bg-[#f1e2d8] px-4 py-2 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleDelete(design)
                              }
                              className="rounded-lg bg-red-50 px-4 py-2 text-red-700 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {designs.length === 0 && (
                  <p className="py-10 text-center text-[#80685b]">
                    No designs found. Add your first design.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
