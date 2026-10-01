import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData";
import { useStore } from "../store/Store";
import { asset } from "../services/api";
import type { Product } from "../types";
import { ProductCard } from "../components/ProductCard";
import { Skeleton, ErrorState } from "../components/UI";
import { SEO } from "../components/SEO";
const slides = [
  {
    tag: "A HOME FOR GOOD FINDS",
    heading: (
      <>
        A little better.
        <br />
        <em>Every day.</em>
      </>
    ),
    text: "Thoughtful essentials for your home, your routine and everything in between.",
    cta: "Find your everyday",
    to: "/products",
    image: "/catalog/photo-1555041469-a586c61ea9bc.jpg",
    alt: "A thoughtfully furnished living room with a green sofa",
    label: "The home edit",
  },
  {
    tag: "LESS NOISE. MORE YOU.",
    heading: (
      <>
        Tune in to
        <br />
        <em>your world.</em>
      </>
    ),
    text: "Sound, style and simple technology that feels right at home in your day.",
    cta: "Shop electronics",
    to: "/category/electronics",
    image: "/catalog/photo-1546435770-a3e426bf472b.jpg",
    alt: "Premium over-ear headphones",
    label: "Sound, considered",
  },
  {
    tag: "MADE FOR THE EVERYDAY",
    heading: (
      <>
        Go a little
        <br />
        <em>further.</em>
      </>
    ),
    text: "Reliable companions for early starts, slow weekends and your next adventure.",
    cta: "Explore the outdoors",
    to: "/category/move-outdoors",
    image: "/catalog/photo-1553062407-98eeb64c6a62.jpg",
    alt: "An everyday adventure backpack",
    label: "A fresh perspective",
  },
];
export function Home() {
  const [slide, setSlide] = useState(0);
  const { categories } = useStore();
  const { data, loading, error, reload } = useData<{ products: Product[] }>(
    "/products?limit=20",
  );
  const { data: newArrivals } = useData<{ products: Product[] }>(
    "/products?sort=newest&limit=4",
  );
  const { data: bestSellers } = useData<{ products: Product[] }>(
    "/products?sort=best-selling&limit=4",
  );
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, []);
  const s = slides[slide];
  function collection(
    title: string,
    kicker: string,
    products: Product[],
    link: string,
  ) {
    return (
      <section className="collection container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <Link className="text-link" to={link}>
            View all
          </Link>
        </div>
        {loading ? (
          <Skeleton />
        ) : error ? (
          <ErrorState text={error} retry={reload} />
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    );
  }
  const all = data?.products || [];
  return (
    <>
      <SEO title="Everyday, elevated" />
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{s.tag}</span>
          <h1>{s.heading}</h1>
          <p>{s.text}</p>
          <Link className="btn light" to={s.to}>
            {s.cta}
          </Link>
          <div className="hero-slides" aria-label="Hero slides">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={"Show slide " + (i + 1)}
                aria-pressed={i === slide}
                className={i === slide ? "active" : ""}
                onClick={() => setSlide(i)}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
            <span>Curated for a better everyday.</span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src={s.image}
            alt={s.alt}
            fetchPriority="high"
            width="1200"
            height="1000"
          />
          <div className="hero-caption">
            <span>NEST COLLECTION / 2026</span>
            <strong>{s.label}</strong>
          </div>
          <div className="hero-seal">
            Thoughtfully
            <br />
            <strong>chosen.</strong>
          </div>
        </div>
      </section>
      <section className="category-section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR EVERYDAY, REIMAGINED</span>
            <h2>Find your kind of good.</h2>
          </div>
          <Link className="text-link" to="/products">
            Shop all categories
          </Link>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={"/category/" + c.slug}
              className="category-card"
            >
              <div>
                <img src={asset(c.image)} alt={c.name} loading="lazy" />
              </div>
              <h3>{c.name}</h3>
              <span>Discover the collection</span>
            </Link>
          ))}
        </div>
      </section>
      {collection(
        "The favourites. For a reason.",
        "THOUGHTFULLY PICKED",
        all.filter((p) => p.featured).slice(0, 4),
        "/products?sort=featured",
      )}
      <section className="promo container">
        <div>
          <span className="eyebrow">SMALL DETAILS. BIG DIFFERENCE.</span>
          <h2>
            Make space
            <br />
            for the good things.
          </h2>
          <p>Comfort, character and a home that feels like you.</p>
          <Link className="btn" to="/category/home-living">
            Explore the home edit
          </Link>
        </div>
        <img
          src="/catalog/photo-1485955900006-10f4d324d411.jpg"
          alt="A green plant in a minimal white planter"
          loading="lazy"
        />
        <span className="promo-note">A little green goes a long way.</span>
      </section>
      {collection(
        "Just landed. Already loved.",
        "FRESH FINDS",
        newArrivals?.products || [],
        "/products?sort=newest",
      )}
      {collection(
        "Your most-loved essentials.",
        "BEST SELLERS",
        bestSellers?.products || [],
        "/products?sort=best-selling",
      )}
      <section className="offer-banner container">
        <div>
          <span className="eyebrow">HELLO, GOOD DEALS.</span>
          <h2>
            Your first order,
            <br />a little sweeter.
          </h2>
          <p>
            Save 10% with <strong>WELCOME10</strong> on orders over ₹999. Up to
            ₹1,000 off.
          </p>
        </div>
        <Link className="btn light" to="/offers">
          Shop the offers
        </Link>
      </section>
      {collection(
        "Good finds for your next chapter.",
        "MORE TO LOVE",
        all.slice(8, 12),
        "/products",
      )}
    </>
  );
}
