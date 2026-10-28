"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Product information
export type CartProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  category?: string;
};

// Cart product with quantity
export type CartItem = CartProduct & {
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  cartGeneration: number;
  isLoaded: boolean;
  totalItems: number;
  totalPrice: number;
  addToCart: (product: CartProduct) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "henna_studio_cart_v1";

const CartContext = createContext<CartContextType | null>(
  null
);

// Validate locally saved cart data
function parseSavedCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const uniqueIds = new Set<string>();
  const validItems: CartItem[] = [];

  for (const rawItem of value) {
    if (
      !rawItem ||
      typeof rawItem !== "object" ||
      typeof rawItem.id !== "string" ||
      !rawItem.id ||
      typeof rawItem.name !== "string" ||
      !rawItem.name ||
      typeof rawItem.price !== "number" ||
      !Number.isFinite(rawItem.price) ||
      rawItem.price < 0 ||
      !Number.isSafeInteger(rawItem.stock) ||
      rawItem.stock <= 0 ||
      !Number.isSafeInteger(rawItem.quantity) ||
      rawItem.quantity <= 0 ||
      uniqueIds.has(rawItem.id)
    ) {
      continue;
    }

    uniqueIds.add(rawItem.id);

    validItems.push({
      id: rawItem.id,
      name: rawItem.name,
      price: rawItem.price,
      stock: rawItem.stock,
      quantity: Math.min(rawItem.quantity, rawItem.stock),
      image_url:
        typeof rawItem.image_url === "string"
          ? rawItem.image_url
          : null,
      category:
        typeof rawItem.category === "string"
          ? rawItem.category
          : "",
    });
  }

  return validItems;
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartGeneration, setCartGeneration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore cart after page reload
  useEffect(() => {
    let restoredItems: CartItem[] = [];

    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);

      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        restoredItems = parseSavedCart(parsed);
      }
    } catch (error) {
      console.error("Unable to restore shopping cart:", error);
    }

    const timeoutId = window.setTimeout(() => {
      setItems(restoredItems);
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Save cart automatically
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error("Unable to save shopping cart:", error);
    }
  }, [items, isLoaded]);

  // Add product or increase quantity
  const addToCart = useCallback(
    (product: CartProduct) => {
      if (
        !isLoaded ||
        !product.id ||
        !product.name ||
        !Number.isFinite(product.price) ||
        product.price < 0 ||
        !Number.isSafeInteger(product.stock) ||
        product.stock <= 0
      ) {
        return;
      }

      setCartGeneration((generation) => generation + 1);

      setItems((currentItems) => {
        const existing = currentItems.find(
          (item) => item.id === product.id
        );

        if (existing) {
          const nextQuantity = Math.min(
            existing.quantity + 1,
            product.stock
          );

          return currentItems.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  price: product.price,
                  stock: product.stock,
                  image_url: product.image_url,
                  quantity: nextQuantity,
                }
              : item
          );
        }

        return [
          ...currentItems,
          {
            ...product,
            quantity: 1,
          },
        ];
      });
    },
    [isLoaded]
  );

  // Change quantity without exceeding stock
  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (!Number.isSafeInteger(quantity)) return;

      setItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== id) return item;

          return {
            ...item,
            quantity: Math.max(
              1,
              Math.min(quantity, item.stock)
            ),
          };
        })
      );
    },
    []
  );

  // Remove one product
  const removeFromCart = useCallback(
    (id: string) => {
      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== id)
      );
    },
    []
  );

  // Empty the entire cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Total quantity
  const totalItems = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    [items]
  );

  // Cart subtotal
  const totalPrice = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0
      ),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      cartGeneration,
      isLoaded,
      totalItems,
      totalPrice,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [
      items,
      cartGeneration,
      isLoaded,
      totalItems,
      totalPrice,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Use this hook inside Cart components
export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}
