import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import "./globals.css";

// Existing Next.js fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Website SEO Metadata
export const metadata: Metadata = {
  title: {
    default: "Mehedi By Meherin",
    template: "%s | Mehedi By Meherin",
  },

  description:
    "Discover beautiful Mehndi designs, premium natural Henna products, and professional bridal Henna services at Mehedi By Meherin.",

  applicationName: "Mehedi By Meherin",

  keywords: [
    "Mehedi By Meherin",
    "Mehedi by Meherin Mehndi",
    "Mehndi Design",
    "Bridal Henna",
    "Natural Henna",
    "Henna Products",
    "Henna Booking",
    "Bridal Mehndi",
    "Mehndi Artist",
  ],
};

// Root Layout
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global Shopping Cart Provider */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
