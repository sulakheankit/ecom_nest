import { useState } from "react";
import { Plus, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api, send, asset, currency, date, message } from "../services/api";
import { uploadImages } from "../services/api";
import {
  Modal,
  Confirm,
  Field,
  Badge,
  ErrorState,
  Skeleton,
} from "../components/UI";
import { SEO } from "../components/SEO";
const categoryEmpty = {
  name: "",
  slug: "",
  description: "",
  image: "",
  parent_id: null,
  active: true,
  seo_title: "",
  seo_description: "",
};
const couponEmpty = {
  code: "",
  discount_type: "PERCENT",
  value: 10,
  min_order: 0,
  max_discount: null,
  starts_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  usage_limit: 100,
  active: true,
};
export function AdminCollections({ kind }: { kind: "categories" | "coupons" }) {
  const category = kind === "categories";
  const { data, loading, error, reload } = useData<any[]>("/admin/" + kind);
  const [editing, setEditing] = useState<any>(null),
    [open, setOpen] = useState(false),
    [remove, setRemove] = useState<any>(null),
    [q, setQ] = useState("");
  const rows = (data || []).filter((r) =>
    String(category ? r.name : r.code)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const title = category
    ? "Categories."
    : "A little extra, for your customers.";
  return (
    <>
      <SEO title={"Manage " + kind} />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">
            {category
              ? "MAKE IT EASY TO EXPLORE"
              : "GOOD THINGS, BETTER PRICES"}
          </span>
          <h1>{title}</h1>
          <p>
            {category
              ? "Build and organise your store’s collections."
              : "Create offers, control limits and follow usage."}
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={18} />
          Add {category ? "category" : "coupon"}
        </button>
      </div>
      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            aria-label={"Search " + kind}
            placeholder={"Search " + kind + "…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
                  {(category
                    ? [
                        "Category",
                        "Parent",
                        "Products URL",
                        "Status",
                        "Actions",
                      ]
                    : [
                        "Code",
                        "Discount",
                        "Min. order",
                        "Expiry",
                        "Usage",
                        "Status",
                        "Actions",
                      ]
                  ).map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {category ? (
                      <>
                        <td>
                          <div className="table-product">
                            {r.image && <img src={asset(r.image)} alt="" />}
                            <strong>{r.name}</strong>
                          </div>
                        </td>
                        <td>
                          {data?.find((p) => p.id === r.parent_id)?.name || "—"}
                        </td>
                        <td>/category/{r.slug}</td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{r.code}</strong>
                        </td>
                        <td>
                          {r.discount_type === "PERCENT"
                            ? r.value + "%"
                            : currency(r.value)}
                          {r.max_discount && (
                            <small>Max {currency(r.max_discount)}</small>
                          )}
                        </td>
                        <td>{currency(r.min_order)}</td>
                        <td>{date(r.expires_at)}</td>
                        <td>
                          {r.used_count} / {r.usage_limit}
                        </td>
                      </>
                    )}
                    <td>
                      <Badge>{r.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          aria-label={"Edit " + (r.name || r.code)}
                          onClick={() => {
                            setEditing(r);
                            setOpen(true);
                          }}
                        >
                          <PenLine size={17} />
                        </button>
                        <button
                          aria-label={"Delete " + (r.name || r.code)}
                          onClick={() => setRemove(r)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="table-empty">No {kind} found.</p>}
          </div>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          (editing ? "Edit " : "Add ") + (category ? "category" : "coupon")
        }
        wide
      >
        {open && (
          <CollectionForm
            kind={kind}
            record={editing}
            categories={data || []}
            onSave={async (body) => {
              await send(
                "/admin/" + kind + (editing ? "/" + editing.id : ""),
                body,
                editing ? "PUT" : "POST",
              );
              setOpen(false);
              await reload();
              toast.success("Saved.");
            }}
          />
        )}
      </Modal>
      <Confirm
        open={!!remove}
        title={"Delete this " + (category ? "category" : "coupon") + "?"}
        text={
          category
            ? "Categories with products or child categories must be reorganised first."
            : "Used coupons will be deactivated to preserve order history."
        }
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (remove)
            api("/admin/" + kind + "/" + remove.id, { method: "DELETE" })
              .then(() => reload())
              .catch((e) => toast.error(message(e)));
          setRemove(null);
        }}
      />
    </>
  );
}
function CollectionForm({
  kind,
  record,
  categories,
  onSave,
}: {
  kind: string;
  record: any;
  categories: any[];
  onSave: (body: any) => Promise<void>;
}) {
  const cat = kind === "categories";
  const [form, setForm] = useState<any>(
      record
        ? {
            ...record,
            value: Number(record.value),
            min_order: Number(record.min_order),
            max_discount:
              record.max_discount === null ? null : Number(record.max_discount),
          }
        : structuredClone(cat ? categoryEmpty : couponEmpty),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (key: string, value: any) =>
    setForm({ ...form, [key]: value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(form);
        } catch (e) {
          setError(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {(cat
          ? [
              ["name", "Category name", "text"],
              ["slug", "URL slug", "text"],
              ["image", "Image URL", "text"],
              ["seo_title", "SEO title", "text"],
              ["seo_description", "SEO description", "text"],
            ]
          : [
              ["code", "Coupon code", "text"],
              ["value", "Discount value", "number"],
              ["min_order", "Minimum order", "number"],
              ["max_discount", "Maximum discount (optional)", "number"],
              ["usage_limit", "Usage limit", "number"],
              ["starts_at", "Starts at", "datetime-local"],
              ["expires_at", "Expires at", "datetime-local"],
            ]
        ).map(([key, label, type]) => (
          <Field key={key} label={label}>
            <input
              required={
                cat ? ["name", "slug"].includes(key) : key !== "max_discount"
              }
              type={type}
              min="0"
              value={
                type === "datetime-local"
                  ? new Date(form[key]).toISOString().slice(0, 16)
                  : (form[key] ?? "")
              }
              onChange={(e) => {
                if (type === "datetime-local") {
                  if (e.target.value)
                    change(key, new Date(e.target.value + "Z").toISOString());
                } else
                  change(
                    key,
                    type === "number"
                      ? e.target.value === ""
                        ? null
                        : Number(e.target.value)
                      : e.target.value,
                  );
              }}
            />
          </Field>
        ))}
        {cat ? (
          <Field label="Parent category">
            <select
              value={form.parent_id || ""}
              onChange={(e) =>
                change(
                  "parent_id",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">No parent (top-level)</option>
              {categories
                .filter((c) => c.id !== record?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        ) : (
          <Field label="Discount type">
            <select
              value={form.discount_type}
              onChange={(e) => change("discount_type", e.target.value)}
            >
              <option value="PERCENT">Percentage</option>
              <option value="FIXED">Fixed rupee amount</option>
            </select>
          </Field>
        )}
      </div>
      {cat && (
        <>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </Field>
          <Field label="Upload category image">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                try {
                  const r = await uploadImages(files);
                  change("image", r.urls[0]);
                } catch (err) {
                  toast.error(message(err));
                }
              }}
            />
          </Field>
        </>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => change("active", e.target.checked)}
        />
        Active
      </label>
      {!cat && <p className="muted">Coupon dates are entered in UTC.</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save " + (cat ? "category" : "coupon")}
      </button>
    </form>
  );
}
