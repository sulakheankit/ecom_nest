import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api, send, currency, date, asset, message } from "../services/api";
import { Modal, Badge, ErrorState, Skeleton } from "../components/UI";
import { Summary } from "./Cart";
import { SEO } from "../components/SEO";
const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: [],
};
export function AdminOrders() {
  const [params, setParams] = useSearchParams(),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [order, setOrder] = useState<any>(null),
    [next, setNext] = useState(""),
    [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useData<any[]>(
    "/admin/orders?q=" + encodeURIComponent(q),
  );
  async function view(orderId: number) {
    try {
      const o = await api("/admin/orders/" + orderId);
      setOrder(o);
      setNext(transitions[o.status]?.[0] || "");
    } catch (e) {
      toast.error(message(e));
    }
  }
  useEffect(() => {
    if (params.get("view")) void view(Number(params.get("view")));
  }, [params]);
  return (
    <>
      <SEO title="Manage orders" />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">FROM YOUR STORE TO THEIR DOOR</span>
          <h1>Orders.</h1>
          <p>Keep every good find moving.</p>
        </div>
      </div>
      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            aria-label="Search orders"
            placeholder="Search order or customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            aria-label="Filter order status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.keys(transitions).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <Skeleton count={2} />
        ) : error ? (
          <ErrorState text={error} retry={reload} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Order",
                    "Customer",
                    "Date",
                    "Items",
                    "Amount",
                    "Payment",
                    "Status",
                    "",
                  ].map((s, i) => (
                    <th key={i}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data
                  ?.filter((o) => !status || o.status === status)
                  .map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.number}</strong>
                      </td>
                      <td>
                        {o.customer_name}
                        <small>{o.customer_email}</small>
                      </td>
                      <td>{date(o.created_at)}</td>
                      <td>{o.items_count}</td>
                      <td>{currency(o.total)}</td>
                      <td>
                        <Badge>{o.payment_status}</Badge>
                      </td>
                      <td>
                        <Badge>{o.status}</Badge>
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => setParams({ view: String(o.id) })}
                        >
                          View order
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!data?.length && <p className="table-empty">No orders yet.</p>}
          </div>
        )}
      </div>
      <Modal
        open={!!order}
        onClose={() => {
          setOrder(null);
          setParams({});
        }}
        title={order?.number || "Order details"}
        wide
      >
        {order && (
          <>
            <div className="order-meta">
              <div>
                <small>Customer</small>
                <strong>{order.customer_name}</strong>
              </div>
              <div>
                <small>Order status</small>
                <Badge>{order.status}</Badge>
              </div>
              <div>
                <small>Payment</small>
                <Badge>{order.payment_status}</Badge>
              </div>
            </div>
            {order.items.map((i: any) => (
              <div className="checkout-item" key={i.id}>
                <img src={asset(i.image)} alt={i.name} />
                <div>
                  <strong>{i.name}</strong>
                  <small>
                    {i.variant} · {i.quantity} units
                  </small>
                  <small>{i.sku}</small>
                </div>
                <strong>{currency(Number(i.price) * i.quantity)}</strong>
              </div>
            ))}
            <div className="order-addresses">
              <div>
                <h3>Shipping address</h3>
                <p>
                  {order.shipping_address.first_name}{" "}
                  {order.shipping_address.last_name}
                  <br />
                  {order.shipping_address.address},{" "}
                  {order.shipping_address.apartment}
                  <br />
                  {order.shipping_address.city}, {order.shipping_address.state}{" "}
                  {order.shipping_address.pincode}
                  <br />
                  {order.shipping_address.mobile}
                </p>
              </div>
              <div>
                <h3>Order details</h3>
                <p>
                  {date(order.created_at)}
                  <br />
                  {order.delivery} delivery
                  <br />
                  Expected: {date(order.expected_delivery)}
                  <br />
                  Cash on Delivery
                </p>
              </div>
            </div>
            <Summary quote={order} />
            {!!transitions[order.status]?.length && (
              <div className="status-editor">
                <select
                  aria-label="Next order status"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                >
                  {transitions[order.status].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const o = await send(
                        "/admin/orders/" + order.id,
                        { status: next },
                        "PATCH",
                      );
                      setOrder(o);
                      setNext(transitions[o.status]?.[0] || "");
                      await reload();
                      toast.success("Order updated.");
                    } catch (e) {
                      toast.error(message(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Update status
                </button>
              </div>
            )}
            <p className="muted">
              For COD, marking delivery confirms payment collection. Mark
              REFUNDED only after returning the funds. Refund recording does not
              move money.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
