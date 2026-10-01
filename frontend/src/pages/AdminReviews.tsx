import { useState } from "react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api, send, date, asset, message } from "../services/api";
import { Badge, Rating, Confirm, ErrorState, Skeleton } from "../components/UI";
import { SEO } from "../components/SEO";
export function AdminReviews() {
  const { data, loading, error, reload } = useData<any[]>("/admin/reviews");
  const [status, setStatus] = useState(""),
    [rating, setRating] = useState(""),
    [product, setProduct] = useState(""),
    [remove, setRemove] = useState<any>(null);
  async function moderate(r: any, s: string) {
    try {
      await send("/admin/reviews/" + r.id, { status: s }, "PATCH");
      await reload();
      toast.success("Review updated.");
    } catch (e) {
      toast.error(message(e));
    }
  }
  const rows = data?.filter(
    (r) =>
      (!status || r.status === status) &&
      (!rating || r.rating === Number(rating)) &&
      (!product || r.product.toLowerCase().includes(product.toLowerCase())),
  );
  return (
    <>
      <SEO title="Customer reviews" />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">LISTEN TO YOUR COMMUNITY</span>
          <h1>Reviews.</h1>
          <p>Verified purchases. Honest experiences.</p>
        </div>
      </div>
      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            placeholder="Filter by product…"
            aria-label="Filter reviews by product"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
          <select
            aria-label="Review status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {["PENDING", "APPROVED", "REJECTED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Review rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <Skeleton count={2} />
        ) : error ? (
          <ErrorState text={error} />
        ) : rows?.length ? (
          rows.map((r) => (
            <article className="admin-review" key={r.id}>
              <div>
                <Rating value={r.rating} />
                <Badge>{r.status}</Badge>
                <small>{date(r.created_at)}</small>
              </div>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
              <small>
                {r.customer} · {r.product}
              </small>
              <div className="review-images">
                {r.images?.map((url: string) => (
                  <img key={url} src={asset(url)} alt="Review attachment" />
                ))}
              </div>
              <div className="actions">
                <button
                  className="btn secondary small"
                  disabled={r.status === "APPROVED"}
                  onClick={() => moderate(r, "APPROVED")}
                >
                  Approve
                </button>
                <button
                  className="btn secondary small"
                  disabled={r.status === "REJECTED"}
                  onClick={() => moderate(r, "REJECTED")}
                >
                  Reject
                </button>
                <button className="text-link" onClick={() => setRemove(r)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="table-empty">No reviews match your filters.</p>
        )}
      </div>
      <Confirm
        open={!!remove}
        title="Delete this review?"
        text="This permanently removes the review and attached images from the record."
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (remove)
            api("/admin/reviews/" + remove.id, { method: "DELETE" })
              .then(() => reload())
              .catch((e) => toast.error(message(e)));
          setRemove(null);
        }}
      />
    </>
  );
}
