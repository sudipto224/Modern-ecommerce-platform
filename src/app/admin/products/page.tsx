"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProductStatus = "draft" | "published";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  image_url: string | null;
  created_at: string;
};

type ProductForm = {
  name: string;
  category: string;
  price: string;
  stock: string;
  status: ProductStatus;
};

const emptyForm: ProductForm = {
  name: "",
  category: "Henna",
  price: "",
  stock: "",
  status: "published",
};

const BUCKET = "product-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const inputStyle =
  "w-full rounded-xl border border-[#e6d6cc] bg-white px-4 py-3 outline-none focus:border-[#b77b5b]";

export default function AdminProductsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      setLoading(true);

      if (authError || !authData.user) {
        setAuthorized(false);
        router.replace("/admin-login");
        return;
      }

      const { data: admin, error: roleError } =
        await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", authData.user.id)
          .maybeSingle();

      if (
        roleError ||
        !admin ||
        !["owner", "manager"].includes(admin.role)
      ) {
        setAuthorized(false);
        setErrorMessage("Admin access denied.");
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts((data ?? []) as Product[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProducts]);

  function updateField(
    field: keyof ProductForm,
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
    setErrorMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!allowedTypes[file.type]) {
      setErrorMessage(
        "Only JPG, PNG and WebP images are allowed."
      );
      event.target.value = "";
      setImageFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("Image must be 5 MB or smaller.");
      event.target.value = "";
      setImageFile(null);
      return;
    }

    setImageFile(file);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (
      !form.name.trim() ||
      !/^\d+(\.\d{1,2})?$/.test(form.price) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      form.stock.trim() === "" ||
      !Number.isSafeInteger(stock) ||
      stock < 0
    ) {
      setErrorMessage("Please enter valid product details.");
      return;
    }

    setBusy(true);
    setSuccess("");
    setErrorMessage("");

    let uploadedPath: string | null = null;

    try {
      const existingProduct = editingId
        ? products.find((product) => product.id === editingId)
        : null;

      let imageUrl = existingProduct?.image_url ?? null;

      // Upload a new image if selected
      if (imageFile) {
        const extension = allowedTypes[imageFile.type];

        if (!extension || imageFile.size > MAX_FILE_SIZE) {
          throw new Error("Invalid image file.");
        }

        const filePath =
          `products/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, imageFile, {
            contentType: imageFile.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPath = filePath;

        const { data: imageData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(filePath);

        imageUrl = imageData.publicUrl;
      }

      const payload = {
        name: form.name.trim(),
        category: form.category,
        price,
        stock,
        status: form.status,
        image_url: imageUrl,
      };

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single();

        if (error) throw error;

        setSuccess("Product updated successfully!");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        setSuccess("Product added successfully!");
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      // Clean up a newly uploaded file if database save fails
      if (uploadedPath) {
        const { error: cleanupError } =
          await supabase.storage
            .from(BUCKET)
            .remove([uploadedPath]);

        if (cleanupError) {
          console.error("Image cleanup failed:", cleanupError);
        }
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save product."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      status: product.status,
    });

    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setErrorMessage("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(product: Product) {
    if (busy) return;

    if (!window.confirm(`Delete "${product.name}"?`)) {
      return;
    }

    setBusy(true);
    setSuccess("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .select("id")
        .single();

      if (error) throw error;

      if (editingId === product.id) {
        resetForm();
      }

      setSuccess("Product deleted successfully!");
      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete product."
      );
    } finally {
      setBusy(false);
    }
  }

  const editingProduct = products.find(
    (product) => product.id === editingId
  );

  return (
    <main className="min-h-screen bg-[#faf6f3] px-5 py-10 text-[#44271f] md:px-10">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-[#b77b5b]">
              Store Management
            </p>

            <h1 className="font-serif text-4xl">
              Product Management
            </h1>

            <p className="mt-3 text-sm text-[#80685b]">
              Manage products, stock and images.
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
          <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {success && (
          <div role="status" className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {loading ? (
          <p>Loading products...</p>
        ) : !authorized ? (
          <p>Admin authorization required.</p>
        ) : (
          <>
            {/* PRODUCT FORM */}
            <section className="mb-10 rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-7 font-serif text-3xl">
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>

              <form
                onSubmit={handleSubmit}
                className="grid gap-5 md:grid-cols-2"
              >
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium">
                    Product Name *
                  </label>

                  <input
                    id="name"
                    required
                    maxLength={150}
                    className={inputStyle}
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label htmlFor="category" className="mb-2 block text-sm font-medium">
                    Category *
                  </label>

                  <select
                    id="category"
                    className={inputStyle}
                    value={form.category}
                    onChange={(e) =>
                      updateField("category", e.target.value)
                    }
                  >
                    <option value="Henna">Henna</option>
                    <option value="Powder">Powder</option>
                    <option value="Kits">Kits</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="price" className="mb-2 block text-sm font-medium">
                    Price (BDT) *
                  </label>

                  <input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className={inputStyle}
                    value={form.price}
                    onChange={(e) =>
                      updateField("price", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label htmlFor="stock" className="mb-2 block text-sm font-medium">
                    Stock Quantity *
                  </label>

                  <input
                    id="stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    className={inputStyle}
                    value={form.stock}
                    onChange={(e) =>
                      updateField("stock", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label htmlFor="status" className="mb-2 block text-sm font-medium">
                    Product Status
                  </label>

                  <select
                    id="status"
                    className={inputStyle}
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* IMAGE UPLOAD */}
                <div>
                  <label htmlFor="image" className="mb-2 block text-sm font-medium">
                    Product Image
                  </label>

                  <input
                    id="image"
                    ref={fileInputRef}
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

                {editingProduct?.image_url && (
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm">Current Image:</p>
                    <Image
                      src={editingProduct.image_url}
                      alt={editingProduct.name}
                      width={120}
                      height={120}
                      unoptimized
                      className="h-28 w-28 rounded-xl object-cover"
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
                      ? "Uploading / Saving..."
                      : editingId
                        ? "Update Product"
                        : "+ Add Product"}
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

            {/* PRODUCT LIST */}
            <section className="rounded-3xl border border-[#eaded5] bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-serif text-2xl">
                  All Products
                </h2>

                <span className="rounded-full bg-[#f1e2d8] px-4 py-2 text-sm">
                  {products.length} Products
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eaded5]">
                      <th className="p-4">Image</th>
                      <th className="p-4">Product</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-[#f0e7e1]">
                        <td className="p-4">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              width={64}
                              height={64}
                              unoptimized
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#f4e4dc] text-2xl">
                              ✿
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-[#80685b]">{product.category}</p>
                        </td>

                        <td className="p-4">
                          ৳{Number(product.price).toFixed(2)}
                        </td>

                        <td className="p-4">{product.stock}</td>

                        <td className="p-4">{product.status}</td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleEdit(product)}
                              className="rounded-lg bg-[#f1e2d8] px-4 py-2 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDelete(product)}
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

                {products.length === 0 && (
                  <p className="py-8 text-center text-[#80685b]">
                    No products found.
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
