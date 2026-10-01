import { db, type DB } from "../config/db.js";
export const catalogSelect = `SELECT p.*,c.name category,c.slug category_slug,b.name brand,
 COALESCE((SELECT jsonb_agg(i.url ORDER BY i.position,i.id) FROM product_images i WHERE i.product_id=p.id),'[]'::jsonb) images,
 COALESCE((SELECT jsonb_agg(v ORDER BY v.id) FROM product_variants v WHERE v.product_id=p.id AND v.active=TRUE),'[]'::jsonb) variants,
 COALESCE((SELECT sum(stock) FROM product_variants v WHERE v.product_id=p.id AND v.active=TRUE),0)::int stock,
 COALESCE((SELECT round(avg(rating),1) FROM reviews r WHERE r.product_id=p.id AND r.status='APPROVED'),0) rating,
 (SELECT count(*)::int FROM reviews r WHERE r.product_id=p.id AND r.status='APPROVED') review_count
 FROM products p JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id`;
export async function productById(id: number, tx: DB = db) {
  return (await tx.query(catalogSelect + " WHERE p.id=$1", [id])).rows[0];
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const money = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export async function settings(tx: DB = db) {
  return (
    (await tx.query("SELECT value FROM settings WHERE key='store'")).rows[0]
      ?.value || {
      store_name: "Nest",
      gst: 18,
      shipping_charge: 79,
      free_shipping_threshold: 1499,
      express_charge: 149,
      cod_enabled: true,
      online_enabled: false,
    }
  );
}
export async function couponDiscount(
  code: string,
  subtotal: number,
  tx: DB = db,
  lock = false,
) {
  if (!code) return { discount: 0, coupon: null };
  const c = (
    await tx.query(
      "SELECT * FROM coupons WHERE code=$1" + (lock ? " FOR UPDATE" : ""),
      [code.toUpperCase().trim()],
    )
  ).rows[0];
  if (
    !c ||
    !c.active ||
    Date.parse(c.starts_at) > Date.now() ||
    Date.parse(c.expires_at) < Date.now() ||
    c.used_count >= c.usage_limit
  )
    throw new HttpError(
      400,
      "This coupon is invalid, expired or fully redeemed.",
    );
  if (subtotal < Number(c.min_order))
    throw new HttpError(
      400,
      `Spend at least ₹${c.min_order} to use this coupon.`,
    );
  return {
    coupon: c,
    discount: money(
      Math.min(
        subtotal,
        c.discount_type === "PERCENT"
          ? (subtotal * Number(c.value)) / 100
          : Number(c.value),
        c.max_discount === null ? Infinity : Number(c.max_discount),
      ),
    ),
  };
}
export async function totals(
  items: any[],
  code: string,
  delivery: string,
  tx: DB = db,
  lock = false,
) {
  const config = await settings(tx);
  const subtotal = money(
    items.reduce((s, i) => s + Number(i.price) * i.quantity, 0),
  );
  const { discount, coupon } = await couponDiscount(code, subtotal, tx, lock);
  const shipping =
    delivery === "EXPRESS"
      ? Number(config.express_charge)
      : subtotal >= Number(config.free_shipping_threshold)
        ? 0
        : Number(config.shipping_charge);
  const tax = money(((subtotal - discount) * Number(config.gst)) / 100);
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: money(subtotal - discount + shipping + tax),
    coupon,
  };
}
export async function cartItems(userId: number, tx: DB = db, lock = false) {
  return (
    await tx.query(
      `SELECT ci.id,ci.quantity,v.id variant_id,v.name variant,v.sku,v.price,v.stock,v.active variant_active,p.id product_id,p.name,p.slug,p.active product_active,c.active category_active,COALESCE(NULLIF(v.image,''),(SELECT url FROM product_images WHERE product_id=p.id ORDER BY position LIMIT 1),'') image FROM cart_items ci JOIN cart ct ON ct.id=ci.cart_id JOIN product_variants v ON v.id=ci.variant_id JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id WHERE ct.user_id=$1 ` +
        (lock ? " ORDER BY v.id FOR UPDATE OF ci,v,p" : " ORDER BY ci.id"),
      [userId],
    )
  ).rows;
}
