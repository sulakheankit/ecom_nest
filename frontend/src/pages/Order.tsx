import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Package } from "lucide-react";
import { useData } from "../hooks/useData";
import type { Order as OrderType } from "../types";
import { currency, date, asset } from "../services/api";
import { Skeleton, ErrorState, Badge } from "../components/UI";
import { SEO } from "../components/SEO";
import { Summary } from "./Cart";
export function Order({
  success = false,
  admin = false,
}: {
  success?: boolean;
  admin?: boolean;
}) {
  const { orderId } = useParams();
  const {
    data: o,
    loading,
    error,
    reload,
  } = useData<OrderType>((admin ? "/admin" : "") + "/orders/" + orderId);
  if (loading)
    return (
      <div className="container page">
        <Skeleton count={2} />
      </div>
    );
  if (error || !o)
    return (
      <div className="container page">
        <ErrorState text={error || "Order not found."} retry={reload} />
      </div>
    );
  return (
    <div className="container page order-page">
      <SEO title={"Order " + o.number} />
      {success ? (
        <div className="order-success">
          <CheckCircle2 size={52} />
          <span className="eyebrow">YOU HAVE GOOD TASTE.</span>
          <h1>Your good finds are on their way.</h1>
          <p>Thanks for making room for a little better everyday.</p>
        </div>
      ) : (
        <div className="page-heading">
          <span className="eyebrow">YOUR ORDER</span>
          <h1>{o.number}</h1>
        </div>
      )}
      <div className="order-meta">
        <div>
          <small>Order number</small>
          <strong>{o.number}</strong>
        </div>
        <div>
          <small>Placed on</small>
          <strong>{date(o.created_at)}</strong>
        </div>
        <div>
          <small>Order status</small>
          <Badge>{o.status}</Badge>
        </div>
        <div>
          <small>Payment</small>
          <Badge>{o.payment_status}</Badge>
        </div>
        <div>
          <small>Expected delivery</small>
          <strong>{date(o.expected_delivery)}</strong>
        </div>
      </div>
      <div className="cart-layout">
        <div>
          <h2>What’s in your order.</h2>
          {o.items.map((i) => (
            <div className="checkout-item large" key={i.id}>
              <img src={asset(i.image)} alt={i.name} />
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.variant} · Qty {i.quantity}
                </small>
                <small>{i.sku}</small>
              </div>
              <strong>{currency(Number(i.price) * i.quantity)}</strong>
            </div>
          ))}
          <div className="order-addresses">
            {[
              ["Delivering to", o.shipping_address],
              ["Billing address", o.billing_address],
            ].map(([label, a]: any) => (
              <div key={label}>
                <h3>{label}</h3>
                <p>
                  {a.first_name} {a.last_name}
                  <br />
                  {a.address}, {a.apartment}
                  <br />
                  {a.city}, {a.state} {a.pincode}
                  <br />
                  {a.country}
                </p>
                <p>
                  {a.mobile}
                  <br />
                  {a.email}
                </p>
              </div>
            ))}
          </div>
        </div>
        <Summary quote={o}>
          <p>Cash on Delivery · {o.delivery.toLowerCase()} delivery</p>
          <Link
            className="btn full"
            to={success ? "/account?tab=orders" : "/products"}
          >
            {success ? "View your orders" : "Continue shopping"}
          </Link>
        </Summary>
      </div>
      {success && (
        <Link className="text-link" to="/products">
          Find your next favourite
        </Link>
      )}
    </div>
  );
}
