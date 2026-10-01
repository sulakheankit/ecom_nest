import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  TriangleAlert,
} from "lucide-react";
import { useData } from "../hooks/useData";
import { currency, date } from "../services/api";
import { ErrorState, Skeleton, Badge } from "../components/UI";
import { SEO } from "../components/SEO";
export function AdminDashboard({ reports = false }: { reports?: boolean }) {
  const [from, setFrom] = useState(
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const {
    data: d,
    loading,
    error,
    reload,
  } = useData<any>(
    "/admin/" +
      (reports ? "reports" : "dashboard") +
      "?from=" +
      from +
      "&to=" +
      to,
  );
  const { data: orders } = useData<any[]>("/admin/orders");
  const max = Math.max(
    1,
    ...(d?.daily || []).map((v: any) => Number(v.revenue)),
  );
  return (
    <>
      <SEO title={reports ? "Sales reports" : "Store overview"} />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">
            {reports ? "THE BIGGER PICTURE" : "YOUR STORE, AT A GLANCE"}
          </span>
          <h1>{reports ? "Reports & insights." : "A good day starts here."}</h1>
          <p>
            {reports
              ? "Understand what your customers love."
              : "Here’s what’s happening at Nest."}
          </p>
        </div>
        <div className="date-range">
          <input
            aria-label="Report start date"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>to</span>
          <input
            aria-label="Report end date"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorState text={error} retry={reload} />
      ) : (
        d && (
          <>
            <div className="dashboard-stats">
              {[
                [
                  IndianRupee,
                  "Collected revenue",
                  currency(d.stats.total_sales),
                  "Paid orders in selected range",
                ],
                [
                  ShoppingBag,
                  "Total orders",
                  d.stats.total_orders,
                  d.stats.pending_orders + " awaiting confirmation",
                ],
                [
                  Users,
                  "Customers",
                  d.stats.total_customers,
                  "Registered store customers",
                ],
                [
                  Package,
                  "Active products",
                  d.stats.total_products,
                  d.stats.low_stock_products + " variants low in stock",
                ],
              ].map(([Icon, label, value, note]: any) => (
                <div className="stat-card" key={label}>
                  <span>
                    {label}
                    <Icon size={19} />
                  </span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="admin-panel revenue-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Revenue overview</h2>
                    <p>Collected sales by day</p>
                  </div>
                  <strong>{currency(d.stats.total_sales)}</strong>
                </div>
                {d.daily.length ? (
                  <div
                    className="bar-chart"
                    role="img"
                    aria-label="Daily collected revenue"
                  >
                    {d.daily.map((v: any) => (
                      <div
                        key={v.day}
                        title={date(v.day) + ": " + currency(v.revenue)}
                      >
                        <small>{currency(v.revenue)}</small>
                        <span
                          style={{
                            height: (Number(v.revenue) / max) * 155 + 3 + "px",
                          }}
                        />
                        <label>
                          {new Date(v.day).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </label>
                        <em>{v.orders} orders</em>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-empty">
                    Sales will appear here when orders are delivered and paid.
                  </div>
                )}
              </section>
              <section className="admin-panel">
                <h2>Orders at a glance</h2>
                <div className="order-breakdown">
                  {[
                    ["Pending", d.stats.pending_orders],
                    ["Delivered", d.stats.completed_orders],
                    ["Cancelled", d.stats.cancelled_orders],
                  ].map(([label, n]: any) => (
                    <div key={label}>
                      <span>
                        <Badge>{label}</Badge>
                      </span>
                      <strong>{n}</strong>
                    </div>
                  ))}
                </div>
                <div className="mini-stat">
                  <span>Average paid order</span>
                  <strong>{currency(d.stats.average_order_value)}</strong>
                </div>
                <div className="mini-stat">
                  <span>Collected today (in range)</span>
                  <strong>{currency(d.stats.today_sales)}</strong>
                </div>
              </section>
            </div>
            <div className="dashboard-grid">
              <section className="admin-panel">
                <h2>Your most-loved products</h2>
                {d.top_products.length ? (
                  <div className="rank-list">
                    {d.top_products.map((p: any, i: number) => (
                      <div key={p.name}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <p>
                          <strong>{p.name}</strong>
                          <small>{p.units} units sold</small>
                        </p>
                        <strong>{currency(p.revenue)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No paid sales in this period.</p>
                )}
              </section>
              <section className="admin-panel">
                <h2>Category performance</h2>
                {d.categories.map((c: any) => (
                  <div className="category-performance" key={c.name}>
                    <div>
                      <strong>{c.name}</strong>
                      <span>{currency(c.revenue)}</span>
                    </div>
                    <progress
                      max={Math.max(
                        1,
                        ...d.categories.map((x: any) => Number(x.revenue)),
                      )}
                      value={Number(c.revenue)}
                    />
                    <small>{c.units} units sold</small>
                  </div>
                ))}
              </section>
            </div>
            {reports ? (
              <section className="admin-panel">
                <h2>Monthly performance</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Orders</th>
                        <th>Collected revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.monthly.map((m: any) => (
                        <tr key={m.month}>
                          <td>{m.month}</td>
                          <td>{m.orders}</td>
                          <td>{currency(m.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="admin-panel">
                <div className="panel-heading">
                  <h2>Latest orders</h2>
                  <Link className="text-link" to="/admin/orders">
                    Manage orders
                  </Link>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders?.slice(0, 5).map((o) => (
                        <tr key={o.id}>
                          <td>
                            <Link to={"/admin/orders?view=" + o.id}>
                              {o.number}
                            </Link>
                          </td>
                          <td>{o.customer_name}</td>
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
              </section>
            )}
            <div className="inventory-note">
              <TriangleAlert size={19} />
              <span>
                {d.stats.low_stock_products} variants need a little stock
                attention.
              </span>
              <Link to="/admin/products">View inventory</Link>
            </div>
          </>
        )
      )}
    </>
  );
}
