import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { send, message } from "../services/api";
import type { Settings } from "../types";
import { Field, ErrorState } from "../components/UI";
import { SEO } from "../components/SEO";
export function AdminSettings() {
  const { data, error } = useData<Settings>("/admin/settings");
  const [form, setForm] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  if (error) return <ErrorState text={error} />;
  return (
    <>
      <SEO title="Store settings" />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">MAKE NEST YOUR OWN</span>
          <h1>Store settings.</h1>
          <p>The details that keep everything running.</p>
        </div>
      </div>
      {form && (
        <form
          className="admin-panel settings-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              setForm(await send("/admin/settings", form, "PUT"));
              toast.success(
                "Store settings saved. Reload the storefront to see updates.",
              );
            } catch (e) {
              toast.error(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Your store</h2>
          <div className="form-grid">
            {[
              ["store_name", "Store name"],
              ["logo", "Logo image URL"],
              ["email", "Contact email"],
              ["phone", "Contact phone"],
              ["address", "Store address"],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  required={key !== "logo"}
                  type={key === "email" ? "email" : "text"}
                  value={String(form[key as keyof Settings])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <h2>Tax & shipping</h2>
          <p className="muted">
            Prices exclude GST. GST applies to the discounted product subtotal.
          </p>
          <div className="form-grid">
            {[
              ["gst", "GST percentage"],
              ["shipping_charge", "Standard shipping charge"],
              ["free_shipping_threshold", "Free shipping threshold"],
              ["express_charge", "Express shipping charge"],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  required
                  type="number"
                  min="0"
                  max={key === "gst" ? 100 : undefined}
                  step="0.01"
                  value={Number(form[key as keyof Settings])}
                  onChange={(e) =>
                    setForm({ ...form, [key]: Number(e.target.value) })
                  }
                />
              </Field>
            ))}
          </div>
          <h2>Payment</h2>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.cod_enabled}
              onChange={(e) =>
                setForm({ ...form, cod_enabled: e.target.checked })
              }
            />
            Enable Cash on Delivery
          </label>
          <label className="check-label">
            <input type="checkbox" disabled />
            Online payment — provider configuration required
          </label>
          <p className="muted">
            Online payment is deliberately disabled until a provider, signature
            verification and payment webhooks are implemented.
          </p>
          <h2>Email & integrations</h2>
          <p>
            Set SMTP credentials in the backend environment to send password
            recovery emails. In local demo mode, reset emails are written to
            .data/outbox. Store provider credentials on the server.
          </p>
          <button className="btn" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </>
  );
}
