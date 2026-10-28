import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { Suspense } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
};

async function ProductList() {
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return (
      <p className="text-center text-red-700">
        Supabase configuration is missing.
      </p>
    );
  }

  const supabase = createClient(url, key);

  // Fetch published products from Supabase
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, price, stock, image_url"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product loading error:", error.message);

    return (
      <div className="rounded-xl bg-red-50 p-6 text-center text-red-700">
        Unable to load products.
      </div>
    );
  }

  const products = (data ?? []) as Product[];

  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center">
        <h2 className="font-serif text-2xl">
          No Products Available
        </h2>

        <p className="mt-3 text-[#80685b]">
          New products will appear here soon.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#80685b]">
          Showing {products.length} published product(s)
        </p>

        <Link
          href="/cart"
          className="text-sm font-semibold text-[#693f31] hover:underline"
        >
          🛒 View Shopping Cart →
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="group overflow-hidden rounded-2xl border border-[#eaded5] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* PRODUCT IMAGE */}
            <div className="relative h-64 overflow-hidden bg-[#f4e4dc]">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <span className="text-6xl text-[#b77b5b]">
                    ✿
                  </span>

                  <p className="mt-4 text-xs text-[#80685b]">
                    Product Image Coming Soon
                  </p>
                </div>
              )}
            </div>

            {/* PRODUCT DETAILS */}
            <div className="p-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-[#b77b5b]">
                {product.category}
              </p>

              <h2 className="font-serif text-2xl">
                {product.name}
              </h2>

              <p className="mt-4 text-xl font-semibold text-[#b77b5b]">
                ৳{Number(product.price).toFixed(2)}
              </p>

              <p className="mt-3 text-sm text-[#80685b]">
                {product.stock > 0
                  ? `In Stock: ${product.stock}`
                  : "Out of Stock"}
              </p>

              {/* ADD TO CART */}
              <div className="mt-6">
                <AddToCartButton
                  product={{
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    price: Number(product.price),
                    stock: Number(product.stock),
                    image_url: product.image_url,
                  }}
                />
              </div>

              {/* VIEW CART LINK */}
              <div className="mt-4 text-center">
                <Link
                  href="/cart"
                  className="text-sm font-medium text-[#80685b] transition hover:text-[#693f31] hover:underline"
                >
                  View Cart →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#44271f]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-16">
        {/* PAGE HEADING */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm uppercase tracking-widest text-[#b77b5b]">
            Our Products
          </p>

          <h1 className="font-serif text-4xl md:text-5xl">
            Shop Natural Henna
          </h1>

          <p className="mt-4 text-[#80685b]">
            Discover our premium natural henna collection.
          </p>
        </div>

        {/* DATABASE PRODUCTS */}
        <Suspense
          fallback={
            <p className="py-12 text-center text-[#80685b]">
              Loading products...
            </p>
          }
        >
          <ProductList />
        </Suspense>
      </section>
    </main>
  );
}
