"use client";

import { useCart, type CartProduct } from "./CartProvider";

type AddToCartButtonProps = {
  product: CartProduct;
};

export default function AddToCartButton({
  product,
}: AddToCartButtonProps) {
  const { items, addToCart, isLoaded } = useCart();

  const existingItem = items.find(
    (item) => item.id === product.id
  );

  const currentQuantity = existingItem?.quantity ?? 0;
  const outOfStock = product.stock <= 0;
  const stockLimitReached =
    !outOfStock && currentQuantity >= product.stock;

  const disabled =
    !isLoaded || outOfStock || stockLimitReached;

  const handleAddToCart = () => {
    if (disabled) return;
    addToCart(product);
  };

  const buttonText = !isLoaded
    ? "Loading..."
    : outOfStock
      ? "Out of Stock"
      : stockLimitReached
        ? "Stock Limit Reached"
        : currentQuantity > 0
          ? "Add Another"
          : "Add to Cart";

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={disabled}
      className="w-full rounded-full bg-[#693f31] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4f2c22] disabled:cursor-not-allowed disabled:opacity-50"
    >
      🛒 {buttonText}
    </button>
  );
}
