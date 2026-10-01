import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Heart, LockKeyhole, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../store/Store";
import { asset, currency, api, send, message } from "../services/api";
import { Quantity, Empty, Confirm } from "../components/UI";
import { SEO } from "../components/SEO";
import type { CartItem, Quote, Product } from "../types";
export function Summary({
  quote,
  children,
}: {
  quote: Quote;
  children?: React.ReactNode;
}) {
  return (
    <div className="order-summary">
      <h2>The little details.</h2>
      <div>
        <span>Subtotal</span>
        <strong>{currency(quote.subtotal)}</strong>
      </div>
      {Number(quote.discount) > 0 && (
        <div className="discount-line">
          <span>Discount</span>
          <strong>−{currency(quote.discount)}</strong>
        </div>
      )}
      <div>
        <span>Shipping</span>
        <strong>
          {Number(quote.shipping) === 0 ? "On us" : currency(quote.shipping)}
        </strong>
      </div>
      <div>
        <span>GST</span>
        <strong>{currency(quote.tax)}</strong>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{currency(quote.total)}</strong>
      </div>
      {children}
    </div>
  );
}
export function Cart() {
  const { cart, quantity, remove, wish, user, settings } = useStore();
  const [removeItem, setRemoveItem] = useState<CartItem | null>(null),
    [coupon, setCoupon] = useState(""),
    [quote, setQuote] = useState<Quote | null>(null),
    [busy, setBusy] = useState<number | null>(null);
  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0),
    shipping =
      subtotal >= settings.free_shipping_threshold
        ? 0
        : settings.shipping_charge,
    tax = Math.round(subtotal * settings.gst) / 100;
  const displayQuote =
    quote && quote.subtotal === subtotal
      ? quote
      : {
          subtotal,
          discount: 0,
          shipping,
          tax,
          total: subtotal + shipping + tax,
          coupon: null,
        };
  async function update(item: CartItem, q: number) {
    setBusy(item.id);
    try {
      await quantity(item, q);
      setQuote(null);
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(null);
    }
  }
  if (!cart.length)
    return (
      <div className="container page">
        <SEO title="Your bag" />
        <Empty
          title="Your bag is waiting for a good find."
          text="A little everyday upgrade is just around the corner."
        />
      </div>
    );
  return (
    <div className="container page">
      <SEO title="Your bag" />
      <div className="page-heading">
        <span className="eyebrow">GOOD CHOICES, ALL TOGETHER.</span>
        <h1>
          Your shopping bag
          <span className="heading-count">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </h1>
        <p>One step closer to a better everyday.</p>
      </div>
      <div className="cart-layout">
        <div>
          <div className="shipping-progress">
            <ShoppingBag size={19} />
            <span>
              {subtotal >= settings.free_shipping_threshold
                ? "Your order qualifies for free standard shipping."
                : `You’re ${currency(settings.free_shipping_threshold - subtotal)} away from free standard shipping.`}
            </span>
            <progress
              value={Math.min(subtotal, settings.free_shipping_threshold)}
              max={settings.free_shipping_threshold}
            />
          </div>
          <div className="cart-items">
            {cart.map((i) => (
              <article className="cart-item" key={i.id}>
                <Link to={"/products/" + i.slug}>
                  <img src={asset(i.image)} alt={i.name} />
                </Link>
                <div>
                  <Link className="product-title" to={"/products/" + i.slug}>
                    {i.name}
                  </Link>
                  <p>{i.variant}</p>
                  <strong>{currency(i.price)}</strong>
                  <div className="cart-item-tools">
                    <Quantity
                      value={i.quantity}
                      max={Math.min(i.stock, 99)}
                      disabled={busy === i.id}
                      onChange={(q) => update(i, q)}
                    />
                    <button
                      aria-label={"Remove " + i.name}
                      onClick={() => setRemoveItem(i)}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const p = await api<Product>("/products/" + i.slug);
                          await wish(p);
                          await remove(i);
                          toast.success("Saved for later in your wishlist.");
                        } catch (e) {
                          toast.error(message(e));
                        }
                      }}
                    >
                      <Heart size={15} />
                      Save for later
                    </button>
                  </div>
                </div>
                <strong className="item-total">
                  {currency(Number(i.price) * i.quantity)}
                </strong>
              </article>
            ))}
          </div>
          <Link className="text-link" to="/products">
            Continue exploring
          </Link>
        </div>
        <div>
          <Summary quote={displayQuote}>
            <form
              className="coupon-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) {
                  toast.error("Sign in to apply a coupon.");
                  return;
                }
                try {
                  setQuote(await send("/coupons/validate", { code: coupon }));
                  toast.success("A little extra saved.");
                } catch (err) {
                  setQuote(null);
                  toast.error(message(err));
                }
              }}
            >
              <input
                aria-label="Coupon code"
                placeholder="Have a coupon?"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              />
              <button className="btn secondary small">Apply</button>
            </form>
            {displayQuote.coupon && (
              <p className="in-stock">{displayQuote.coupon} applied</p>
            )}
            <Link
              className="btn full"
              to={
                "/checkout" +
                (displayQuote.coupon ? "?coupon=" + displayQuote.coupon : "")
              }
            >
              Proceed to checkout
            </Link>
            <p className="secure-note">
              <LockKeyhole size={14} />
              Secure checkout · Cash on Delivery
            </p>
          </Summary>
        </div>
      </div>
      <Confirm
        open={!!removeItem}
        onClose={() => setRemoveItem(null)}
        onConfirm={() => {
          if (removeItem)
            remove(removeItem).catch((e) => toast.error(message(e)));
          setRemoveItem(null);
        }}
      />
    </div>
  );
}
