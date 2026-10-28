
import Image from "next/image";
import Navbar from "@/components/Navbar";
import BusinessFooter from "@/components/BusinessFooter";

const collections = [
  {
    name: "Bridal Henna",
    description:
      "Exquisite bridal designs for your unforgettable day.",
    color: "bg-[#f4e4dc]",
    symbol: "✿",
  },
  {
    name: "Arabic Mehndi",
    description:
      "Graceful patterns inspired by timeless traditions.",
    color: "bg-[#f2e8d7]",
    symbol: "❀",
  },
  {
    name: "Natural Henna",
    description:
      "Premium natural henna products made with care.",
    color: "bg-[#efe4d6]",
    symbol: "✾",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#44271f]">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:px-12 lg:grid-cols-2 lg:gap-16 lg:py-24">

          {/* LEFT CONTENT */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-[#b77b5b]">
              <span className="h-px w-8 bg-[#b77b5b]" />
              Timeless Henna Art
            </div>

            <h1 className="font-serif text-5xl leading-[1.15] font-medium tracking-tight md:text-6xl lg:text-7xl">
              Beauty in
              <span className="block italic text-[#b77b5b]">
                Every Detail.
              </span>
              Art in Every
              <span className="block">Tradition.</span>
            </h1>

            <p className="max-w-lg text-base leading-8 text-[#80685b] md:text-lg">
              Celebrate your special moments with exquisite
              bridal mehndi designs, handcrafted artistry,
              and premium natural henna products.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#collections"
                className="inline-flex items-center justify-center rounded-full bg-[#693f31] px-8 py-4 text-sm font-medium text-white transition hover:bg-[#875441]"
              >
                Explore Collections
                <span className="ml-3">→</span>
              </a>

              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-full border border-[#b77b5b] px-8 py-4 text-sm font-medium text-[#693f31] transition hover:bg-[#f3e9e1]"
              >
                Discover Our Story
              </a>
            </div>

            <div className="flex items-center gap-4 border-t border-[#e9ddd5] pt-7">
              <span className="text-3xl text-[#b77b5b]">
                ✿
              </span>
              <div>
                <p className="font-semibold">
                  Crafted with Passion
                </p>
                <p className="text-sm text-[#80685b]">
                  Traditional art, modern elegance
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-5 -top-5 hidden h-32 w-32 rounded-full border border-[#cba78f] md:block" />

            <div className="absolute -bottom-6 -right-5 hidden h-40 w-40 rounded-full bg-[#f2e5da] md:block" />

            <div className="relative aspect-[5/4] overflow-hidden rounded-t-[180px] rounded-b-3xl shadow-xl shadow-[#694a3a]/10 md:aspect-[4/5]">
              <Image
                src="/henna-hero.jpg"
                alt="Elegant bridal henna art on hands"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                priority
              />
            </div>

            <div className="absolute bottom-5 left-3 rounded-xl border border-[#e9ddd5] bg-[#fffaf6]/95 px-5 py-4 shadow-lg backdrop-blur-sm md:-left-7">
              <p className="text-xl text-[#b77b5b]">✦</p>
              <p className="font-serif text-lg font-semibold">
                Timeless Elegance
              </p>
              <p className="text-xs text-[#80685b]">
                The beauty of henna
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section
        id="collections"
        className="scroll-mt-28 bg-[#f8f0e9] px-6 py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#b77b5b]">
              Curated with Love
            </p>

            <h2 className="font-serif text-4xl md:text-5xl">
              Explore Our Collections
            </h2>

            <p className="mx-auto mt-5 max-w-lg leading-7 text-[#80685b]">
              Discover the perfect blend of tradition,
              artistry, and natural beauty.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {collections.map((item) => (
              <div
                key={item.name}
                className={`${item.color} rounded-3xl p-10 text-center transition duration-300 hover:-translate-y-2 hover:shadow-xl`}
              >
                <div className="mb-7 text-6xl text-[#b77b5b]">
                  {item.symbol}
                </div>

                <h3 className="mb-4 font-serif text-3xl">
                  {item.name}
                </h3>

                <p className="mx-auto max-w-xs leading-7 text-[#80685b]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section
        id="about"
        className="mx-auto max-w-4xl scroll-mt-28 px-6 py-24 text-center"
      >
        <p className="mb-5 text-sm uppercase tracking-[0.25em] text-[#b77b5b]">
          Our Passion
        </p>

        <h2 className="mb-7 font-serif text-4xl md:text-5xl">
          The Art of Beautiful Henna
        </h2>

        <p className="mx-auto max-w-2xl text-lg leading-9 text-[#80685b]">
          We believe henna is more than a design.
          It is an expression of beauty, tradition,
          and celebration. Every detail is created
          with care to make your moments unforgettable.
        </p>
      </section>

      <BusinessFooter />
    </main>
  );
}
