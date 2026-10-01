import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { useStore } from "../store/Store";
import { asset, currency, send, message, api, date } from "../services/api";
import type { Product as ProductType, Variant } from "../types";
import {
  Rating,
  Quantity,
  Skeleton,
  ErrorState,
  Field,
} from "../components/UI";
import { ProductCard } from "../components/ProductCard";
import { SEO } from "../components/SEO";
export function Product() {
  const { slug } = useParams();
  const {
    data: p,
    loading,
    error,
    reload,
  } = useData<ProductType>("/products/" + slug);
  const { data: reviews, reload: reloadReviews } = useData<any[]>(
    "/products/" + slug + "/reviews",
  );
  const [variant, setVariant] = useState<Variant | null>(null),
    [image, setImage] = useState(""),
    [quantity, setQuantity] = useState(1),
    [tab, setTab] = useState("Description"),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState({
      rating: 5,
      title: "",
      description: "",
      images: [] as string[],
    });
  const { add, wish, user, wishlist } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (p) {
      const v = p.variants.find((v) => v.stock > 0) || p.variants[0];
      setVariant(v);
      setImage(v?.image || p.images[0]);
      setQuantity(1);
    }
  }, [p]);
  const { data: related } = useData<{ products: ProductType[] }>(
    "/products?category=" + (p?.category_slug || "") + "&limit=4",
  );
  if (loading)
    return (
      <div className="container page">
        <Skeleton count={2} />
      </div>
    );
  if (error || !p)
    return (
      <div className="container page">
        <ErrorState text={error || "Product not found."} retry={reload} />
      </div>
    );
  async function addItem(buy = false) {
    setBusy(true);
    try {
      await add(p!, variant || undefined, quantity);
      if (buy) navigate("/checkout");
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  const price = Number(variant?.price ?? p.price),
    discount = Math.max(
      0,
      Math.round((1 - price / Number(p.original_price)) * 100),
    );
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description,
      image: p.images,
      sku: variant?.sku || p.sku,
      brand: { "@type": "Brand", name: p.brand },
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "INR",
        availability: variant?.stock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: location.origin + "/products/" + p.slug,
      },
      ...(p.review_count
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: p.rating,
              reviewCount: p.review_count,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Shop",
          item: location.origin + "/products",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: p.category,
          item: location.origin + "/category/" + p.category_slug,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: p.name,
          item: location.origin + "/products/" + p.slug,
        },
      ],
    },
  ];
  return (
    <div className="container page">
      <SEO
        title={p.seo_title || p.name}
        description={p.seo_description || p.short_description}
        schema={schema}
      />
      <div className="breadcrumb">
        <Link to="/products">Shop</Link>
        <span>/</span>
        <Link to={"/category/" + p.category_slug}>{p.category}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <section className="product-detail">
        <div className="gallery">
          <div className="main-image">
            <img src={asset(image)} alt={p.name} />
            <span className="image-hint">Hover to explore the details</span>
          </div>
          <div className="thumbnails">
            {[
              ...new Set([
                ...p.images,
                ...p.variants.map((v) => v.image).filter(Boolean),
              ]),
            ].map((src, i) => (
              <button
                className={image === src ? "selected" : ""}
                key={src}
                onClick={() => setImage(src)}
                aria-label={"View image " + (i + 1)}
              >
                <img src={asset(src)} alt={p.name + " view " + (i + 1)} />
              </button>
            ))}
          </div>
        </div>
        <div className="product-info">
          <span className="eyebrow">{p.brand}</span>
          <h1>{p.name}</h1>
          <div className="detail-rating">
            <Rating value={p.rating} count={p.review_count} />
            <button
              onClick={() => {
                setTab("Reviews");
                document
                  .getElementById("product-tabs")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Read reviews
            </button>
          </div>
          <p>{p.short_description}</p>
          <div className="detail-price">
            <strong>{currency(price)}</strong>
            {Number(p.original_price) > price && (
              <del>{currency(p.original_price)}</del>
            )}
            {discount > 0 && <span className="badge">Save {discount}%</span>}
          </div>
          <small>
            GST calculated at checkout · SKU {variant?.sku || p.sku}
          </small>
          <div className="variant-section">
            <span>
              Choose your option <strong>{variant?.name}</strong>
            </span>
            <div>
              {p.variants.map((v) => (
                <button
                  className={variant?.id === v.id ? "selected" : ""}
                  key={v.id}
                  onClick={() => {
                    setVariant(v);
                    setImage(v.image || p.images[0]);
                    setQuantity(1);
                  }}
                >
                  {v.name}
                  {!v.stock ? " · Sold out" : ""}
                </button>
              ))}
            </div>
          </div>
          <p className={variant?.stock ? "in-stock" : "field-error"}>
            {variant?.stock ? (
              <>
                <Check size={16} /> In stock · {variant.stock} available
              </>
            ) : (
              "Currently out of stock"
            )}
          </p>
          <div className="add-row">
            <Quantity
              value={quantity}
              max={variant?.stock || 1}
              onChange={setQuantity}
            />
            <button
              className="btn"
              disabled={!variant?.stock || busy}
              onClick={() => addItem()}
            >
              Add to bag
            </button>
            <button
              className="icon-button outlined"
              aria-label="Save to wishlist"
              onClick={() => wish(p).catch((e) => toast.error(message(e)))}
            >
              <Heart
                fill={
                  wishlist.some((w) => w.id === p.id) ? "currentColor" : "none"
                }
              />
            </button>
          </div>
          <button
            className="btn secondary full"
            disabled={!variant?.stock || busy}
            onClick={() => addItem(true)}
          >
            Buy it now
          </button>
          <div className="detail-benefits">
            <p>
              <Truck size={18} /> Standard delivery in 4–6 business days
            </p>
            <p>
              <RotateCcw size={18} /> Easy returns within 7 days
            </p>
            <p>
              <ShieldCheck size={18} /> Quality checked, carefully packed
            </p>
          </div>
        </div>
      </section>
      <section className="product-tabs" id="product-tabs">
        <div role="tablist">
          {[
            "Description",
            "Specifications",
            "Shipping & returns",
            "Reviews",
          ].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "Reviews" ? " (" + p.review_count + ")" : ""}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {tab === "Description" ? (
            <>
              <h2>The details that matter.</h2>
              <p>{p.description}</p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : tab === "Specifications" ? (
            <table className="spec-table">
              <tbody>
                {Object.entries(p.specifications).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "Shipping & returns" ? (
            <>
              <h2>A good find, delivered with care.</h2>
              <p>
                Standard delivery takes 4–6 business days. Express delivery
                takes 1–3 business days. Delivery estimates are confirmed when
                you place your order.
              </p>
              <p>
                Return unused items in their original packaging within 7 days of
                delivery. Contact the store with your order number to request a
                return. Personal-care products must remain sealed.
              </p>
            </>
          ) : (
            <div className="reviews-layout">
              <div>
                <h2>From our community.</h2>
                {reviews?.length ? (
                  reviews.map((r) => (
                    <article className="review" key={r.id}>
                      <Rating value={r.rating} />
                      <h3>{r.title}</h3>
                      <p>{r.description}</p>
                      <small>
                        {r.name} · Verified purchase · {date(r.created_at)}
                      </small>
                      <div className="review-images">
                        {r.images?.map((url: string) => (
                          <img
                            key={url}
                            src={asset(url)}
                            alt="Customer review"
                          />
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <p>No reviews yet. Be the first to share your experience.</p>
                )}
              </div>
              <form
                className="review-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const r = await send(
                      "/products/" + slug + "/reviews",
                      review,
                    );
                    toast.success(r.message);
                    setReview({
                      rating: 5,
                      title: "",
                      description: "",
                      images: [],
                    });
                    void reloadReviews();
                  } catch (err) {
                    toast.error(message(err));
                  }
                }}
              >
                <h3>Share your experience</h3>
                <p>
                  Available after your purchase is delivered. Reviews are
                  checked before publication.
                </p>
                {user ? (
                  <>
                    <Field label="Rating">
                      <select
                        value={review.rating}
                        onChange={(e) =>
                          setReview({
                            ...review,
                            rating: Number(e.target.value),
                          })
                        }
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} stars
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Review title">
                      <input
                        required
                        minLength={3}
                        maxLength={200}
                        value={review.title}
                        onChange={(e) =>
                          setReview({ ...review, title: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Your review">
                      <textarea
                        required
                        minLength={10}
                        maxLength={5000}
                        value={review.description}
                        onChange={(e) =>
                          setReview({ ...review, description: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Photos (optional, up to four)">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 4)
                            return toast.error("Choose up to four images.");
                          const form = new FormData();
                          files.forEach((f) => form.append("images", f));
                          try {
                            const r = await api("/uploads", {
                              method: "POST",
                              body: form,
                            });
                            setReview({ ...review, images: r.urls });
                            toast.success("Photos uploaded.");
                          } catch (err) {
                            toast.error(message(err));
                          }
                        }}
                      />
                    </Field>
                    <button className="btn">Submit review</button>
                  </>
                ) : (
                  <Link className="btn" to="/login">
                    Sign in to review
                  </Link>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
      <section className="collection">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD TOGETHER</span>
            <h2>You might also love.</h2>
          </div>
        </div>
        <div className="product-grid">
          {related?.products
            .filter((x) => x.id !== p.id)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </div>
  );
}
