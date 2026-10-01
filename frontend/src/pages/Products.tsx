import { useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useData } from "../hooks/useData";
import { useStore } from "../store/Store";
import type { Product } from "../types";
import { ProductCard } from "../components/ProductCard";
import { Skeleton, ErrorState, Empty } from "../components/UI";
import { SEO } from "../components/SEO";
import { asset } from "../services/api";
export function Products({ offers = false }: { offers?: boolean }) {
  const [search, setSearch] = useSearchParams();
  const { slug } = useParams();
  const { categories } = useStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const params = new URLSearchParams(search);
  if (slug) params.set("category", slug);
  if (offers) params.set("offers", "true");
  const { data, loading, error, reload } = useData<{
    products: Product[];
    total: number;
    pages: number;
    page: number;
  }>("/products?" + params);
  const { data: brands } = useData<{ id: number; name: string }[]>("/brands");
  const category = categories.find((c) => c.slug === slug);
  const title = offers
    ? "Good finds. Better prices."
    : category?.name || "Find your everyday.";
  function update(key: string, value: string) {
    const s = new URLSearchParams(search);
    if (value) s.set(key, value);
    else s.delete(key);
    if (key !== "page") s.delete("page");
    setSearch(s);
  }
  const filters = (
    <>
      <div className="filter-heading">
        <strong>Filters</strong>
        <button onClick={() => setSearch(new URLSearchParams())}>
          Clear all
        </button>
      </div>
      {!slug && (
        <fieldset>
          <legend>Categories</legend>
          <label>
            <input
              type="radio"
              name="category"
              checked={!search.get("category")}
              onChange={() => update("category", "")}
            />
            All categories
          </label>
          {categories.map((c) => (
            <label key={c.id}>
              <input
                type="radio"
                name="category"
                checked={search.get("category") === c.slug}
                onChange={() => update("category", c.slug)}
              />
              {c.name}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend>Brand</legend>
        <select
          value={search.get("brand") || ""}
          onChange={(e) => update("brand", e.target.value)}
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands?.map((b) => (
            <option key={b.id}>{b.name}</option>
          ))}
        </select>
      </fieldset>
      <fieldset>
        <legend>Price range</legend>
        <div className="price-filter">
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            aria-label="Minimum price"
            value={search.get("min") || ""}
            onChange={(e) => update("min", e.target.value)}
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            aria-label="Maximum price"
            value={search.get("max") || ""}
            onChange={(e) => update("max", e.target.value)}
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>Customer rating</legend>
        {[0, 4, 3, 2].map((n) => (
          <label key={n}>
            <input
              type="radio"
              name="rating"
              checked={Number(search.get("rating") || 0) === n}
              onChange={() => update("rating", String(n))}
            />
            {n ? n + " stars & above" : "All ratings"}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Availability</legend>
        <label>
          <input
            type="checkbox"
            checked={search.get("stock") === "true"}
            onChange={(e) => update("stock", e.target.checked ? "true" : "")}
          />
          In stock only
        </label>
      </fieldset>
    </>
  );
  return (
    <div className="container page">
      <SEO title={title} description={category?.description} />
      <div className={"listing-heading " + (category ? "with-category" : "")}>
        <div>
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>
              {category?.name || (offers ? "Offers" : "All products")}
            </span>
          </div>
          <span className="eyebrow">
            {offers ? "A LITTLE SOMETHING SPECIAL" : "THE NEST COLLECTION"}
          </span>
          <h1>{title}</h1>
          <p>
            {category?.description ||
              (offers
                ? "Thoughtfully chosen essentials, with a little extra to love."
                : "Thoughtful essentials. Lasting quality. Good things for every day.")}
          </p>
        </div>
        {category && <img src={asset(category.image)} alt={category.name} />}
      </div>
      {offers && (
        <div className="coupon-strip">
          Your first find deserves 10% off. Use <strong>WELCOME10</strong> ·
          Minimum ₹999 · Max discount ₹1,000
        </div>
      )}
      <div className="shop-layout">
        <aside className="filters desktop-only">{filters}</aside>
        <section className="shop-results">
          <div className="results-toolbar">
            <span>
              {loading
                ? "Finding good things…"
                : `${data?.total || 0} good finds`}
              {search.get("q") && <> for “{search.get("q")}”</>}
            </span>
            <button
              className="filter-toggle"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <div>
              <label className="sr-only" htmlFor="sort">
                Sort products
              </label>
              <select
                id="sort"
                value={search.get("sort") || "featured"}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
                <option value="best-selling">Best selling</option>
              </select>
            </div>
          </div>
          <form className="listing-search" onSubmit={(e) => e.preventDefault()}>
            <input
              aria-label="Search this collection"
              placeholder="Search this collection…"
              value={search.get("q") || ""}
              onChange={(e) => update("q", e.target.value)}
            />
          </form>
          {loading ? (
            <Skeleton count={6} />
          ) : error ? (
            <ErrorState text={error} retry={reload} />
          ) : !data?.products.length ? (
            <Empty
              title="No finds just yet."
              text="Try a different search or clear a filter."
            />
          ) : (
            <div className="product-grid listing-grid">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <div className="pagination">
            <label>
              Show{" "}
              <select
                value={search.get("limit") || "12"}
                onChange={(e) => update("limit", e.target.value)}
              >
                <option>12</option>
                <option>24</option>
                <option>48</option>
              </select>{" "}
              per page
            </label>
            <div>
              <button
                className="btn secondary small"
                disabled={(data?.page || 1) <= 1}
                onClick={() => update("page", String((data?.page || 1) - 1))}
              >
                Previous
              </button>
              <span>
                Page {data?.page || 1} of {Math.max(data?.pages || 1, 1)}
              </span>
              <button
                className="btn secondary small"
                disabled={(data?.page || 1) >= (data?.pages || 1)}
                onClick={() => update("page", String((data?.page || 1) + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
      {filterOpen && (
        <div className="filter-mobile">
          <button
            className="icon-button"
            onClick={() => setFilterOpen(false)}
            aria-label="Close filters"
          >
            <X />
          </button>
          {filters}
          <button className="btn" onClick={() => setFilterOpen(false)}>
            Show results
          </button>
        </div>
      )}
    </div>
  );
}
