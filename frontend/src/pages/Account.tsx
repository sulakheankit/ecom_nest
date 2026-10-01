import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  UserRound,
  MapPin,
  Package,
  Heart,
  LogOut,
  Plus,
  PenLine,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useStore } from "../store/Store";
import { useData } from "../hooks/useData";
import { api, send, currency, date, message } from "../services/api";
import type { Order, Address } from "../types";
import {
  Field,
  Modal,
  Confirm,
  Badge,
  Empty,
  ErrorState,
} from "../components/UI";
import { SEO } from "../components/SEO";
import { Wishlist } from "./Wishlist";
import { AddressFields, addressValidation, blankAddress } from "./Checkout";
export function Account() {
  const { user, logout, setUser, wishlist } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const navigate = useNavigate();
  const { data: orders, error: orderError } = useData<Order[]>("/orders");
  const { data: addresses, reload: reloadAddresses } =
    useData<Address[]>("/addresses");
  const [editing, setEditing] = useState<Address | null>(null),
    [addressOpen, setAddressOpen] = useState(false),
    [removeAddress, setRemoveAddress] = useState<Address | null>(null),
    [profile, setProfile] = useState({
      name: user?.name || "",
      email: user?.email || "",
      mobile: user?.mobile || "",
    }),
    [password, setPassword] = useState({ current_password: "", password: "" });
  const form = useForm<{ shipping_address: Address }>({
    resolver: zodResolver(z.object({ shipping_address: addressValidation })),
    defaultValues: { shipping_address: blankAddress },
  });
  function edit(a: Address | null) {
    setEditing(a);
    form.reset({
      shipping_address: a || {
        ...blankAddress,
        first_name: user!.name.split(" ")[0],
        last_name: user!.name.split(" ").slice(1).join(" "),
        email: user!.email,
        mobile: user!.mobile,
      },
    });
    setAddressOpen(true);
  }
  if (!user) return null;
  const nav = [
    ["overview", "My account", UserRound],
    ["orders", "My orders", Package],
    ["addresses", "My addresses", MapPin],
    ["profile", "Profile & security", UserRound],
    ["wishlist", "My wishlist", Heart],
  ] as const;
  return (
    <div className="container page">
      <SEO title="Your account" />
      <div className="page-heading">
        <span className="eyebrow">YOUR LITTLE CORNER.</span>
        <h1>Hello, {user.name.split(" ")[0]}.</h1>
        <p>Good to have you home.</p>
      </div>
      <div className="account-layout">
        <aside className="account-nav">
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setParams({ tab: key })}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
          {user.role === "ADMIN" && <Link to="/admin">Store dashboard</Link>}
          <button
            onClick={() =>
              logout()
                .then(() => navigate("/"))
                .catch((e) => toast.error(message(e)))
            }
          >
            <LogOut size={18} />
            Sign out
          </button>
        </aside>
        <section className="account-content">
          {tab === "overview" ? (
            <>
              <div className="account-stats">
                <div>
                  <Package />
                  <strong>{orders?.length || 0}</strong>
                  <span>Orders placed</span>
                </div>
                <div>
                  <Heart />
                  <strong>{wishlist.length}</strong>
                  <span>Favourite finds</span>
                </div>
                <div>
                  <MapPin />
                  <strong>{addresses?.length || 0}</strong>
                  <span>Saved addresses</span>
                </div>
              </div>
              <div className="section-heading">
                <h2>Your recent orders.</h2>
                <button
                  className="text-link"
                  onClick={() => setParams({ tab: "orders" })}
                >
                  View all orders
                </button>
              </div>
              {orders?.length ? (
                <OrderTable orders={orders.slice(0, 3)} />
              ) : (
                <Empty
                  title="Your next good find is waiting."
                  text="Orders will appear here once you check out."
                />
              )}
              <div className="profile-preview">
                <h3>Your profile</h3>
                <p>
                  {user.name}
                  <br />
                  {user.email}
                  <br />
                  +91 {user.mobile}
                </p>
                <button
                  className="text-link"
                  onClick={() => setParams({ tab: "profile" })}
                >
                  Edit your details
                </button>
              </div>
            </>
          ) : tab === "orders" ? (
            <>
              <h2>Every good find, in one place.</h2>
              {orderError ? (
                <ErrorState text={orderError} />
              ) : orders?.length ? (
                <OrderTable orders={orders} />
              ) : (
                <Empty
                  title="No orders yet."
                  text="Your first everyday upgrade is waiting in the shop."
                />
              )}
            </>
          ) : tab === "addresses" ? (
            <>
              <div className="section-heading">
                <h2>Your addresses.</h2>
                <button className="btn small" onClick={() => edit(null)}>
                  <Plus size={16} />
                  Add address
                </button>
              </div>
              <div className="address-grid">
                {addresses?.map((a) => (
                  <article className="address-card" key={a.id}>
                    <div>
                      <strong>{a.label}</strong>
                      {a.is_default && <Badge>Default</Badge>}
                    </div>
                    <p>
                      {a.first_name} {a.last_name}
                      <br />
                      {a.address}, {a.apartment}
                      <br />
                      {a.city}, {a.state} {a.pincode}
                      <br />
                      {a.mobile}
                    </p>
                    <div className="actions">
                      <button onClick={() => edit(a)}>
                        <PenLine size={16} />
                        Edit
                      </button>
                      <button onClick={() => setRemoveAddress(a)}>
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!addresses?.length && (
                <p>Add an address to make checkout a little easier.</p>
              )}
            </>
          ) : tab === "profile" ? (
            <div className="profile-forms">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const r = await send("/auth/profile", profile, "PUT");
                    setUser(r.user);
                    toast.success("Your details are updated.");
                  } catch (err) {
                    toast.error(message(err));
                  }
                }}
              >
                <h2>Your details.</h2>
                {[
                  ["name", "Name"],
                  ["email", "Email address"],
                  ["mobile", "Mobile number"],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type={key === "email" ? "email" : "text"}
                      required
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) =>
                        setProfile({ ...profile, [key]: e.target.value })
                      }
                    />
                  </Field>
                ))}
                <button className="btn">Save changes</button>
              </form>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const r = await send("/auth/change-password", password);
                    toast.success(r.message);
                    setPassword({ current_password: "", password: "" });
                  } catch (err) {
                    toast.error(message(err));
                  }
                }}
              >
                <h2>A little extra security.</h2>
                <Field label="Current password">
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password.current_password}
                    onChange={(e) =>
                      setPassword({
                        ...password,
                        current_password: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="New password">
                  <input
                    required
                    type="password"
                    minLength={10}
                    autoComplete="new-password"
                    value={password.password}
                    onChange={(e) =>
                      setPassword({ ...password, password: e.target.value })
                    }
                  />
                </Field>
                <button className="btn secondary">Change password</button>
              </form>
            </div>
          ) : (
            <Wishlist />
          )}
        </section>
      </div>
      <Modal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        title={editing ? "Edit address" : "A new place to call home"}
        wide
      >
        <form
          onSubmit={form.handleSubmit(async (data) => {
            try {
              await send(
                "/addresses" + (editing ? "/" + editing.id : ""),
                data.shipping_address,
                editing ? "PUT" : "POST",
              );
              await reloadAddresses();
              setAddressOpen(false);
              toast.success("Address saved.");
            } catch (err) {
              toast.error(message(err));
            }
          })}
        >
          <Field label="Address label">
            <input {...form.register("shipping_address.label")} />
          </Field>
          <AddressFields form={form} />
          <label className="check-label">
            <input
              type="checkbox"
              {...form.register("shipping_address.is_default")}
            />
            Make this my default address
          </label>
          <button className="btn" disabled={form.formState.isSubmitting}>
            Save address
          </button>
        </form>
      </Modal>
      <Confirm
        open={!!removeAddress}
        title="Remove this address?"
        onClose={() => setRemoveAddress(null)}
        onConfirm={() => {
          if (removeAddress)
            api("/addresses/" + removeAddress.id, { method: "DELETE" })
              .then(() => reloadAddresses())
              .catch((e) => toast.error(message(e)));
          setRemoveAddress(null);
        }}
      />
    </div>
  );
}
export function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.number}</strong>
              </td>
              <td>{date(o.created_at)}</td>
              <td>{currency(o.total)}</td>
              <td>
                <Badge>{o.payment_status}</Badge>
              </td>
              <td>
                <Badge>{o.status}</Badge>
              </td>
              <td>
                <Link className="text-link" to={"/account/orders/" + o.id}>
                  View order
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
