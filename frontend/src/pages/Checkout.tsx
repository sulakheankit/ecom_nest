import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStore } from "../store/Store";
import { useData } from "../hooks/useData";
import { send, currency, asset, message } from "../services/api";
import { Field, Empty, ErrorState } from "../components/UI";
import { Summary } from "./Cart";
import { SEO } from "../components/SEO";
import type { Address, Quote } from "../types";
import { toast } from "sonner";
export const addressValidation = z.object({
  label: z.string(),
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.email("Enter a valid email"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  address: z.string().trim().min(5, "Enter your street address"),
  apartment: z.string(),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a six-digit pincode"),
  country: z.literal("India"),
  is_default: z.boolean(),
});
export const blankAddress: Address = {
  label: "Home",
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  address: "",
  apartment: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  country: "India",
  is_default: false,
};
export function AddressFields({
  form,
  prefix = "shipping_address",
}: {
  form: any;
  prefix?: string;
}) {
  const error = (key: string) => form.formState.errors[prefix]?.[key]?.message;
  return (
    <div className="form-grid">
      {[
        ["first_name", "First name"],
        ["last_name", "Last name"],
        ["email", "Email address"],
        ["mobile", "Mobile number"],
        ["address", "Street address"],
        ["apartment", "Apartment / flat (optional)"],
        ["city", "City"],
        ["state", "State"],
        ["pincode", "Pincode"],
      ].map(([key, label]) => (
        <Field key={key} label={label} error={error(key)}>
          <input
            type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"}
            autoComplete={
              key === "first_name"
                ? "given-name"
                : key === "last_name"
                  ? "family-name"
                  : key === "address"
                    ? "address-line1"
                    : key === "pincode"
                      ? "postal-code"
                      : key === "city"
                        ? "address-level2"
                        : key === "state"
                          ? "address-level1"
                          : key === "apartment"
                            ? "address-line2"
                            : key === "email"
                              ? "email"
                              : "tel-national"
            }
            {...form.register(prefix + "." + key)}
          />
        </Field>
      ))}
      <Field label="Country">
        <input value="India" readOnly />
      </Field>
    </div>
  );
}
export function Checkout() {
  const { cart, user, settings, refreshCart } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<"STANDARD" | "EXPRESS">("STANDARD"),
    [same, setSame] = useState(true),
    [coupon, setCoupon] = useState(params.get("coupon") || ""),
    [applied, setApplied] = useState(params.get("coupon") || ""),
    [quote, setQuote] = useState<Quote | null>(null),
    [quoteError, setQuoteError] = useState(""),
    [quoting, setQuoting] = useState(false);
  const { data: addresses } = useData<Address[]>("/addresses");
  const schema = z.object({
    shipping_address: addressValidation,
    billing_address: addressValidation.optional(),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      shipping_address: {
        ...blankAddress,
        first_name: user?.name.split(" ")[0] || "",
        last_name: user?.name.split(" ").slice(1).join(" ") || "",
        email: user?.email || "",
        mobile: user?.mobile || "",
      },
    },
  });
  useEffect(() => {
    let live = true;
    setQuoting(true);
    send("/checkout/quote", { coupon: applied, delivery })
      .then((q) => {
        if (live) {
          setQuote(q);
          setQuoteError("");
        }
      })
      .catch((e) => {
        if (live) {
          setQuote(null);
          setQuoteError(message(e));
        }
      })
      .finally(() => live && setQuoting(false));
    return () => {
      live = false;
    };
  }, [delivery, applied, cart]);
  function billing(value: boolean) {
    setSame(value);
    if (value) form.unregister("billing_address");
    else
      form.setValue("billing_address", {
        ...blankAddress,
        email: user?.email || "",
        mobile: user?.mobile || "",
      });
  }
  async function place(data: z.infer<typeof schema>) {
    try {
      const order = await send("/orders", {
        ...data,
        ...(same ? { billing_address: data.shipping_address } : {}),
        coupon: applied,
        delivery,
        payment_method: "COD",
      });
      await refreshCart();
      navigate("/order-success/" + order.id);
      toast.success("Your good finds are on their way.");
    } catch (e) {
      form.setError("root", { message: message(e) });
    }
  }
  if (!cart.length)
    return (
      <div className="container page">
        <Empty
          title="Your bag is empty."
          text="Find something you love before checking out."
        />
      </div>
    );
  return (
    <div className="container page">
      <SEO title="Checkout" />
      <div className="checkout-heading">
        <span className="eyebrow">ALMOST YOURS.</span>
        <h1>A better everyday, on its way.</h1>
        <p>
          <Link to="/cart">Shopping bag</Link>
          <span> / </span>Checkout
        </p>
      </div>
      <form
        onSubmit={form.handleSubmit(place)}
        noValidate
        className="checkout-layout"
      >
        <div>
          <section className="form-section">
            <h2>
              <span>01</span>Where should we deliver?
            </h2>
            {!!addresses?.length && (
              <Field label="Use a saved address">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const a = addresses.find(
                      (a) => a.id === Number(e.target.value),
                    );
                    if (a) form.setValue("shipping_address", a);
                  }}
                >
                  <option value="">Enter a new address</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.address}, {a.city}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <AddressFields form={form} />
            <label className="check-label">
              <input
                type="checkbox"
                checked={same}
                onChange={(e) => billing(e.target.checked)}
              />
              Billing address same as shipping
            </label>
            {!same && (
              <>
                <h3>Billing address</h3>
                <AddressFields form={form} prefix="billing_address" />
              </>
            )}
          </section>
          <section className="form-section">
            <h2>
              <span>02</span>Choose your delivery.
            </h2>
            <div className="delivery-options">
              {[
                [
                  "STANDARD",
                  "Standard delivery",
                  "4–6 business days",
                  quote?.subtotal &&
                  quote.subtotal >= settings.free_shipping_threshold
                    ? "Free"
                    : currency(settings.shipping_charge),
                ],
                [
                  "EXPRESS",
                  "Express delivery",
                  "1–3 business days",
                  currency(settings.express_charge),
                ],
              ].map(([value, title, text, price]) => (
                <label
                  className={delivery === value ? "selected" : ""}
                  key={value}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === value}
                    onChange={() => setDelivery(value as any)}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <strong>{price}</strong>
                </label>
              ))}
            </div>
          </section>
          <section className="form-section">
            <h2>
              <span>03</span>How would you like to pay?
            </h2>
            <label className="payment-option">
              <input type="radio" checked readOnly />{" "}
              <div>
                <strong>Cash on Delivery</strong>
                <p>Pay when your good finds arrive.</p>
              </div>
            </label>
            <label className="payment-option disabled">
              <input type="radio" disabled />{" "}
              <div>
                <strong>Online payment</strong>
                <p>Not available yet. Choose Cash on Delivery.</p>
              </div>
            </label>
          </section>
        </div>
        <div className="checkout-order">
          <h2>Your good finds.</h2>
          {cart.map((i) => (
            <div className="checkout-item" key={i.id}>
              <img src={asset(i.image)} alt={i.name} />
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.variant} · Qty {i.quantity}
                </small>
              </div>
              <strong>{currency(Number(i.price) * i.quantity)}</strong>
            </div>
          ))}
          <div className="coupon-form">
            <input
              aria-label="Checkout coupon"
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
            <button
              type="button"
              className="btn secondary small"
              onClick={() => setApplied(coupon.trim())}
            >
              Apply
            </button>
            {applied && (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setApplied("");
                  setCoupon("");
                }}
              >
                Remove
              </button>
            )}
          </div>
          {quoteError && <ErrorState text={quoteError} />}
          {quote && <Summary quote={quote} />}
          {form.formState.errors.root && (
            <p className="field-error" role="alert">
              {form.formState.errors.root.message}
            </p>
          )}
          <button
            className="btn full"
            disabled={
              form.formState.isSubmitting ||
              !quote ||
              quoting ||
              !settings.cod_enabled
            }
          >
            {form.formState.isSubmitting
              ? "Placing your order…"
              : "Place order" + (quote ? " · " + currency(quote.total) : "")}
          </button>
          <p className="checkout-consent">
            By placing your order, you agree to our{" "}
            <Link to="/shipping">shipping and return policy</Link>.
          </p>
        </div>
      </form>
    </div>
  );
}
