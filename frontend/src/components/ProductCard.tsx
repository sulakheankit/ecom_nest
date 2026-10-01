import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../store/Store";
import { asset, currency, message } from "../services/api";
import type { Product } from "../types";
import { Rating, Modal } from "./UI";
export function ProductCard({ product: p }: { product: Product }) {
  const { add, wish, wishlist } = useStore();
  const [quick, setQuick] = useState(false),
    [busy, setBusy] = useState(false);
  const discount = Math.round(
    (1 - Number(p.price) / Number(p.original_price)) * 100,
  );
  async function addItem() {
    setBusy(true);
    try {
      await add(p);
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={"/products/" + p.slug}>
          <img
            src={asset(p.images[0])}
            alt={p.name}
            loading="lazy"
            width="600"
            height="600"
          />
        </Link>
        {discount > 0 && <span className="discount">−{discount}%</span>}
        <button
          className={
            "wish-button " +
            (wishlist.some((i) => i.id === p.id) ? "saved" : "")
          }
          aria-label={"Save " + p.name}
          onClick={() => wish(p).catch((e) => toast.error(message(e)))}
        >
          <Heart size={18} />
        </button>
        <button className="quick-view" onClick={() => setQuick(true)}>
          <Eye size={16} /> Quick view
        </button>
        {p.stock === 0 && <span className="out-of-stock">Out of stock</span>}
      </div>
      <div className="card-meta">
        <span>{p.brand}</span>
        <Rating value={p.rating} count={p.review_count} />
      </div>
      <Link className="product-title" to={"/products/" + p.slug}>
        {p.name}
      </Link>
      <p className="product-desc">{p.short_description}</p>
      <div className="card-bottom">
        <div>
          <strong>{currency(p.price)}</strong>
          {Number(p.original_price) > Number(p.price) && (
            <del>{currency(p.original_price)}</del>
          )}
        </div>
        <button
          className="add-button"
          aria-label={"Add " + p.name + " to cart"}
          disabled={!p.stock || busy}
          onClick={addItem}
        >
          <Plus size={19} />
        </button>
      </div>
      <Modal open={quick} onClose={() => setQuick(false)} title={p.name}>
        <img className="quick-image" src={asset(p.images[0])} alt={p.name} />
        <p>{p.short_description}</p>
        <strong>{currency(p.price)}</strong>
        <div className="actions">
          <button className="btn" disabled={!p.stock || busy} onClick={addItem}>
            Add to bag
          </button>
          <Link
            className="btn secondary"
            to={"/products/" + p.slug}
            onClick={() => setQuick(false)}
          >
            View details
          </Link>
        </div>
      </Modal>
    </article>
  );
}
