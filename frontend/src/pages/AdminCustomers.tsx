import { useState } from "react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api, send, currency, date, message } from "../services/api";
import { Modal, Confirm, Badge, ErrorState, Skeleton } from "../components/UI";
import { SEO } from "../components/SEO";
export function AdminCustomers() {
  const [q, setQ] = useState(""),
    [customer, setCustomer] = useState<any>(null),
    [toggle, setToggle] = useState<any>(null);
  const { data, loading, error, reload } = useData<any[]>(
    "/admin/customers?q=" + encodeURIComponent(q),
  );
  return (
    <>
      <SEO title="Customers" />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">THE PEOPLE BEHIND THE ORDERS</span>
          <h1>Your community.</h1>
          <p>Customer accounts, purchase history and access.</p>
        </div>
      </div>
      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            aria-label="Search customers"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {loading ? (
          <Skeleton count={2} />
        ) : error ? (
          <ErrorState text={error} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Customer",
                    "Mobile",
                    "Orders",
                    "Total spending",
                    "Status",
                    "Actions",
                  ].map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <small>{c.email}</small>
                    </td>
                    <td>{c.mobile}</td>
                    <td>{c.order_count}</td>
                    <td>{currency(c.total_spending)}</td>
                    <td>
                      <Badge>{c.active ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="text-link"
                          onClick={() =>
                            api("/admin/customers/" + c.id)
                              .then(setCustomer)
                              .catch((e) => toast.error(message(e)))
                          }
                        >
                          View
                        </button>
                        <button
                          className="text-link"
                          onClick={() => setToggle(c)}
                        >
                          {c.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal
        open={!!customer}
        onClose={() => setCustomer(null)}
        title={customer?.name || "Customer"}
        wide
      >
        {customer && (
          <>
            <p>
              {customer.email} · {customer.mobile}
              <br />
              Joined {date(customer.created_at)}
            </p>
            <h3>Order history</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td>{o.number}</td>
                      <td>{date(o.created_at)}</td>
                      <td>{currency(o.total)}</td>
                      <td>
                        <Badge>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!customer.orders.length && <p>No orders yet.</p>}
          </>
        )}
      </Modal>
      <Confirm
        open={!!toggle}
        title={(toggle?.active ? "Disable" : "Enable") + " this account?"}
        text={
          toggle?.active
            ? "Their active sessions will end and sign-in will be disabled."
            : "This customer will be able to sign in again."
        }
        onClose={() => setToggle(null)}
        onConfirm={() => {
          if (toggle)
            send(
              "/admin/customers/" + toggle.id,
              { active: !toggle.active },
              "PATCH",
            )
              .then(() => reload())
              .catch((e) => toast.error(message(e)));
          setToggle(null);
        }}
      />
    </>
  );
}
