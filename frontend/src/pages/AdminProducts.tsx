import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, PenLine, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api, send, currency, asset, message } from "../services/api";
import { uploadImages } from "../services/api";
import type { Product, Category } from "../types";
import {
  Modal,
  Confirm,
  Field,
  Badge,
  ErrorState,
  Skeleton,
} from "../components/UI";
import { SEO } from "../components/SEO";
const empty = {
  name: "",
  slug: "",
  sku: "",
  category_id: 1,
  brand_id: 1,
  description: "",
  short_description: "",
  price: 0,
  original_price: 0,
  cost_price: 0,
  low_stock_threshold: 5,
  specifications: {},
  features: [],
  seo_title: "",
  seo_description: "",
  active: true,
  featured: false,
  images: [] as string[],
  variants: [
    {
      name: "Default",
      sku: "",
      attributes: {},
      price: 0,
      stock: 0,
      image: "",
      active: true,
    },
  ],
};
export function AdminProducts() {
  const [params, setParams] = useSearchParams(),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Product | null>(null),
    [remove, setRemove] = useState<Product | null>(null),
    [selected, setSelected] = useState<number[]>([]),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("newest");
  const { data, loading, error, reload } = useData<Product[]>(
    "/admin/products?q=" + encodeURIComponent(params.get("q") || ""),
  );
  const { data: categories } = useData<Category[]>("/admin/categories"),
    { data: brands, reload: reloadBrands } = useData<any[]>("/admin/brands");
  const rows = (data || [])
    .filter(
      (p) =>
        status === "all" ||
        (status === "active" && p.active) ||
        (status === "inactive" && !p.active) ||
        (status === "low" &&
          p.variants.some((v) => v.stock <= p.low_stock_threshold)),
    )
    .sort((a, b) =>
      sort === "price"
        ? Number(a.price) - Number(b.price)
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : b.id - a.id,
    );
  return (
    <>
      <SEO title="Manage products" />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR GOOD FINDS</span>
          <h1>Products.</h1>
          <p>Keep your collection fresh, organised and in stock.</p>
        </div>
        <button
          className="btn"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={18} />
          Add product
        </button>
      </div>
      <div className="admin-panel">
        <div className="admin-toolbar">
          <div className="input-search">
            <Search size={18} />
            <input
              aria-label="Search products"
              placeholder="Search name or SKU…"
              value={params.get("q") || ""}
              onChange={(e) => setParams({ q: e.target.value })}
            />
          </div>
          <select
            aria-label="Product status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All products</option>
            <option value="active">Active</option>
            <option value="inactive">Archived</option>
            <option value="low">Low stock</option>
          </select>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
          </select>
          {selected.length > 0 && (
            <>
              <span>{selected.length} selected</span>
              <button
                className="btn secondary small"
                onClick={() =>
                  send(
                    "/admin/products/bulk",
                    { ids: selected, active: true },
                    "PATCH",
                  )
                    .then(() => {
                      setSelected([]);
                      void reload();
                    })
                    .catch((e) => toast.error(message(e)))
                }
              >
                Enable
              </button>
              <button
                className="btn secondary small"
                onClick={() =>
                  send(
                    "/admin/products/bulk",
                    { ids: selected, active: false },
                    "PATCH",
                  )
                    .then(() => {
                      setSelected([]);
                      void reload();
                    })
                    .catch((e) => toast.error(message(e)))
                }
              >
                Archive
              </button>
            </>
          )}
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
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all products"
                      checked={
                        rows.length > 0 &&
                        rows.every((p) => selected.includes(p.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? rows.map((p) => p.id) : [],
                        )
                      }
                    />
                  </th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={"Select " + p.name}
                        checked={selected.includes(p.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, p.id]
                              : selected.filter((x) => x !== p.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="table-product">
                        <img src={asset(p.images[0])} alt="" />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.sku}</small>
                        </span>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>{currency(p.price)}</td>
                    <td
                      className={
                        p.stock <= p.low_stock_threshold ? "field-error" : ""
                      }
                    >
                      {p.stock} units
                    </td>
                    <td>
                      <Badge>{p.active ? "Active" : "Archived"}</Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          aria-label={"Edit " + p.name}
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                        >
                          <PenLine size={17} />
                        </button>
                        <button
                          aria-label={"Archive " + p.name}
                          onClick={() => setRemove(p)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="table-empty">No products match your filters.</p>
            )}
          </div>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit your good find" : "Add a new good find"}
        wide
      >
        {open && (
          <ProductForm
            product={editing}
            categories={categories || []}
            brands={brands || []}
            refreshBrands={reloadBrands}
            onSave={async (body) => {
              await send(
                "/admin/products" + (editing ? "/" + editing.id : ""),
                body,
                editing ? "PUT" : "POST",
              );
              setOpen(false);
              await reload();
              toast.success("Product saved.");
            }}
          />
        )}
      </Modal>
      <Confirm
        open={!!remove}
        title="Archive this product?"
        text="It will leave the storefront. Past orders remain available."
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (remove)
            api("/admin/products/" + remove.id, { method: "DELETE" })
              .then(() => reload())
              .catch((e) => toast.error(message(e)));
          setRemove(null);
        }}
      />
    </>
  );
}
function ProductForm({
  product,
  categories,
  brands,
  refreshBrands,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  brands: any[];
  refreshBrands: () => Promise<void>;
  onSave: (body: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>(
      product
        ? {
            ...product,
            price: Number(product.price),
            original_price: Number(product.original_price),
            cost_price: Number(product.cost_price),
            variants: product.variants.map((v) => ({
              ...v,
              price: Number(v.price),
            })),
          }
        : structuredClone(empty),
    ),
    [specs, setSpecs] = useState(
      JSON.stringify(product?.specifications || {}, null, 2),
    ),
    [features, setFeatures] = useState((product?.features || []).join("\n")),
    [imageUrl, setImageUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const field = (key: string, value: any) => setForm({ ...form, [key]: value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          const specifications = JSON.parse(specs);
          await onSave({
            ...form,
            specifications,
            features: features.split("\n").filter(Boolean),
          });
        } catch (e) {
          setErr(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <Field label="Product name">
          <input
            required
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </Field>
        <Field label="URL slug">
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(e) => field("slug", e.target.value)}
          />
        </Field>
        <Field label="SKU">
          <input
            required
            value={form.sku}
            onChange={(e) => field("sku", e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category_id}
            onChange={(e) => field("category_id", Number(e.target.value))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <select
            value={form.brand_id}
            onChange={(e) => field("brand_id", Number(e.target.value))}
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Add a brand">
          <input
            placeholder="New brand name, press Enter"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const input = e.currentTarget;
                try {
                  const b = await send("/admin/brands", { name: input.value });
                  await refreshBrands();
                  field("brand_id", b.id);
                  input.value = "";
                } catch (err) {
                  toast.error(message(err));
                }
              }
            }}
          />
        </Field>
      </div>
      <Field label="Short description">
        <input
          required
          maxLength={500}
          value={form.short_description}
          onChange={(e) => field("short_description", e.target.value)}
        />
      </Field>
      <Field label="Full description">
        <textarea
          required
          minLength={10}
          value={form.description}
          onChange={(e) => field("description", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        {[
          ["price", "Selling price"],
          ["original_price", "Original price"],
          ["cost_price", "Cost price"],
          ["low_stock_threshold", "Low stock threshold"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              required
              type="number"
              min="0"
              step={key === "low_stock_threshold" ? "1" : "0.01"}
              value={form[key]}
              onChange={(e) => field(key, Number(e.target.value))}
            />
          </Field>
        ))}
      </div>
      <h3>Product images</h3>
      <div className="image-editor">
        {form.images.map((url: string, i: number) => (
          <div key={i}>
            <img src={asset(url)} alt={"Product image " + (i + 1)} />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() =>
                field(
                  "images",
                  form.images.filter((_: any, j: number) => j !== i),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="coupon-form">
        <input
          placeholder="HTTPS image URL"
          aria-label="New product image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary small"
          onClick={() => {
            if (imageUrl) {
              field("images", [...form.images, imageUrl]);
              setImageUrl("");
            }
          }}
        >
          Add image
        </button>
      </div>
      <Field label="Upload images (JPG, PNG, WebP)">
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            setBusy(true);
            try {
              const r = await uploadImages(files);
              field("images", [...form.images, ...r.urls]);
            } catch (e) {
              toast.error(message(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </Field>
      <h3>Variants & inventory</h3>
      {form.variants.map((v: any, i: number) => {
        const change = (k: string, value: any) =>
          field(
            "variants",
            form.variants.map((x: any, j: number) =>
              j === i ? { ...x, [k]: value } : x,
            ),
          );
        return (
          <div className="variant-editor" key={i}>
            <div className="form-grid">
              {[
                ["name", "Variant name"],
                ["sku", "Variant SKU"],
                ["price", "Price"],
                ["stock", "Stock"],
                ["image", "Image URL"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    required={key !== "image"}
                    type={["price", "stock"].includes(key) ? "number" : "text"}
                    min="0"
                    step={key === "price" ? "0.01" : "1"}
                    value={v[key]}
                    onChange={(e) =>
                      change(
                        key,
                        ["price", "stock"].includes(key)
                          ? Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                </Field>
              ))}
              <Field label="Attributes (e.g. Color=Black, Size=M)">
                <input
                  value={Object.entries(v.attributes)
                    .map(([k, v]) => k + "=" + v)
                    .join(", ")}
                  onChange={(e) =>
                    change(
                      "attributes",
                      Object.fromEntries(
                        e.target.value
                          .split(",")
                          .filter((x) => x.includes("="))
                          .map((x) =>
                            x
                              .trim()
                              .split("=")
                              .map((s) => s.trim()),
                          ),
                      ),
                    )
                  }
                />
              </Field>
            </div>
            <button
              type="button"
              className="text-link"
              disabled={form.variants.length === 1}
              onClick={() =>
                field(
                  "variants",
                  form.variants.filter((_: any, j: number) => j !== i),
                )
              }
            >
              Remove variant
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="btn secondary small"
        onClick={() =>
          field("variants", [
            ...form.variants,
            {
              name: "",
              sku: "",
              attributes: {},
              price: form.price,
              stock: 0,
              image: "",
              active: true,
            },
          ])
        }
      >
        Add variant
      </button>
      <div className="form-grid">
        <Field label="Specifications (JSON object)">
          <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} />
        </Field>
        <Field label="Features (one per line)">
          <textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />
        </Field>
        <Field label="SEO title">
          <input
            value={form.seo_title}
            onChange={(e) => field("seo_title", e.target.value)}
          />
        </Field>
        <Field label="SEO description">
          <input
            value={form.seo_description}
            onChange={(e) => field("seo_description", e.target.value)}
          />
        </Field>
      </div>
      <div className="check-row">
        <label>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => field("active", e.target.checked)}
          />
          Active in storefront
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => field("featured", e.target.checked)}
          />
          Featured product
        </label>
      </div>
      {err && (
        <p className="field-error" role="alert">
          {err}
        </p>
      )}
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}
