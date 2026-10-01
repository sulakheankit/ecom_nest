import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db, transaction } from "../config/db.js";
import { auth } from "../middleware/auth.js";
import { id, parse, addressSchema } from "../validators/index.js";
import {
  cartItems,
  totals,
  HttpError,
  settings,
  catalogSelect,
} from "../services/catalog.js";
import { requireCashOnDelivery } from "../services/payments.js";
export const shopRoutes = Router();
shopRoutes.use(auth);
const itemSchema = z.object({
  variant_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});
async function checkVariant(variantId: number, qty: number, tx = db) {
  const v = (
    await tx.query(
      "SELECT v.*,p.active product_active,c.active category_active FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id WHERE v.id=$1 FOR UPDATE OF v",
      [variantId],
    )
  ).rows[0];
  if (!v || !v.active || !v.product_active || !v.category_active)
    throw new HttpError(400, "This product is unavailable.");
  if (qty > v.stock)
    throw new HttpError(400, `Only ${v.stock} units are available.`);
}
shopRoutes.get("/cart", async (req, res) =>
  res.json({ items: await cartItems(req.user!.id) }),
);
shopRoutes.post("/cart", async (req, res) => {
  const data = parse(itemSchema, req.body);
  await transaction(async (tx) => {
    const cart = (
      await tx.query("SELECT id FROM cart WHERE user_id=$1 FOR UPDATE", [
        req.user!.id,
      ])
    ).rows[0];
    const existing = (
      await tx.query(
        "SELECT quantity FROM cart_items WHERE cart_id=$1 AND variant_id=$2",
        [cart.id, data.variant_id],
      )
    ).rows[0];
    const quantity = (existing?.quantity || 0) + data.quantity;
    if (quantity > 99) throw new HttpError(400, "Maximum quantity is 99.");
    await checkVariant(data.variant_id, quantity, tx);
    await tx.query(
      "INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=EXCLUDED.quantity",
      [cart.id, data.variant_id, quantity],
    );
  });
  res.json({ items: await cartItems(req.user!.id) });
});
shopRoutes.post("/cart/merge", async (req, res) => {
  const items = parse(z.array(itemSchema).max(50), req.body.items);
  await transaction(async (tx) => {
    const cart = (
      await tx.query("SELECT id FROM cart WHERE user_id=$1 FOR UPDATE", [
        req.user!.id,
      ])
    ).rows[0];
    for (const item of items) {
      const v = (
        await tx.query(
          "SELECT v.*,p.active product_active,c.active category_active FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id WHERE v.id=$1",
          [item.variant_id],
        )
      ).rows[0];
      if (
        !v ||
        !v.active ||
        !v.product_active ||
        !v.category_active ||
        !v.stock
      )
        continue;
      const current = (
        await tx.query(
          "SELECT quantity FROM cart_items WHERE cart_id=$1 AND variant_id=$2",
          [cart.id, item.variant_id],
        )
      ).rows[0];
      await tx.query(
        "INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=EXCLUDED.quantity",
        [
          cart.id,
          item.variant_id,
          Math.min(99, v.stock, item.quantity + (current?.quantity || 0)),
        ],
      );
    }
  });
  res.json({ items: await cartItems(req.user!.id) });
});
shopRoutes.put("/cart/:itemId", async (req, res) => {
  const quantity = parse(z.number().int().min(1).max(99), req.body.quantity);
  await transaction(async (tx) => {
    const item = (
      await tx.query(
        "SELECT ci.* FROM cart_items ci JOIN cart c ON c.id=ci.cart_id WHERE ci.id=$1 AND c.user_id=$2 FOR UPDATE OF ci",
        [id(req.params.itemId), req.user!.id],
      )
    ).rows[0];
    if (!item) throw new HttpError(404, "Cart item not found.");
    await checkVariant(item.variant_id, quantity, tx);
    await tx.query("UPDATE cart_items SET quantity=$1 WHERE id=$2", [
      quantity,
      item.id,
    ]);
  });
  res.json({ items: await cartItems(req.user!.id) });
});
shopRoutes.delete("/cart/:itemId", async (req, res) => {
  await db.query(
    "DELETE FROM cart_items WHERE id=$1 AND cart_id=(SELECT id FROM cart WHERE user_id=$2)",
    [id(req.params.itemId), req.user!.id],
  );
  res.json({ items: await cartItems(req.user!.id) });
});
shopRoutes.post("/checkout/quote", async (req, res) => {
  const data = parse(
    z.object({
      coupon: z.string().max(30).default(""),
      delivery: z.enum(["STANDARD", "EXPRESS"]).default("STANDARD"),
    }),
    req.body,
  );
  const items = await cartItems(req.user!.id);
  const quote = await totals(items, data.coupon, data.delivery);
  res.json({ ...quote, coupon: quote.coupon?.code || null });
});
shopRoutes.post("/coupons/validate", async (req, res) => {
  const quote = await totals(
    await cartItems(req.user!.id),
    parse(z.string().max(30), req.body.code),
    "STANDARD",
  );
  res.json({ ...quote, coupon: quote.coupon?.code || null });
});
shopRoutes.get("/wishlist", async (req, res) =>
  res.json(
    (
      await db.query(
        catalogSelect +
          " JOIN wishlist_items wi ON wi.product_id=p.id JOIN wishlist w ON w.id=wi.wishlist_id WHERE w.user_id=$1 AND p.active=TRUE AND c.active=TRUE",
        [req.user!.id],
      )
    ).rows,
  ),
);
shopRoutes.post("/wishlist", async (req, res) => {
  const productId = id(req.body.product_id);
  if (
    !(
      await db.query("SELECT id FROM products WHERE id=$1 AND active=TRUE", [
        productId,
      ])
    ).rows.length
  )
    throw new HttpError(404, "Product not found.");
  await db.query(
    "INSERT INTO wishlist_items(wishlist_id,product_id) SELECT id,$1 FROM wishlist WHERE user_id=$2 ON CONFLICT DO NOTHING",
    [productId, req.user!.id],
  );
  res.json({ message: "Saved to wishlist." });
});
shopRoutes.delete("/wishlist/:productId", async (req, res) => {
  await db.query(
    "DELETE FROM wishlist_items WHERE product_id=$1 AND wishlist_id=(SELECT id FROM wishlist WHERE user_id=$2)",
    [id(req.params.productId), req.user!.id],
  );
  res.json({ message: "Removed from wishlist." });
});
shopRoutes.get("/addresses", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC,id DESC",
        [req.user!.id],
      )
    ).rows,
  ),
);
shopRoutes.post("/addresses", async (req, res) => {
  const data = parse(addressSchema, req.body);
  const row = await transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      req.user!.id,
    ]);
    if (data.is_default)
      await tx.query("UPDATE addresses SET is_default=FALSE WHERE user_id=$1", [
        req.user!.id,
      ]);
    const keys = Object.keys(data);
    return (
      await tx.query(
        `INSERT INTO addresses(user_id,${keys.join(",")}) VALUES($1,${keys.map((_, i) => "$" + (i + 2)).join(",")}) RETURNING *`,
        [req.user!.id, ...Object.values(data)],
      )
    ).rows[0];
  });
  res.status(201).json(row);
});
shopRoutes.put("/addresses/:id", async (req, res) => {
  const data = parse(addressSchema, req.body);
  const row = await transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      req.user!.id,
    ]);
    if (data.is_default)
      await tx.query("UPDATE addresses SET is_default=FALSE WHERE user_id=$1", [
        req.user!.id,
      ]);
    const keys = Object.keys(data);
    const r = (
      await tx.query(
        `UPDATE addresses SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${keys.length + 1} AND user_id=$${keys.length + 2} RETURNING *`,
        [...Object.values(data), id(req.params.id), req.user!.id],
      )
    ).rows[0];
    if (!r) throw new HttpError(404, "Address not found.");
    return r;
  });
  res.json(row);
});
shopRoutes.delete("/addresses/:id", async (req, res) => {
  await db.query("DELETE FROM addresses WHERE id=$1 AND user_id=$2", [
    id(req.params.id),
    req.user!.id,
  ]);
  res.json({ message: "Address removed." });
});
shopRoutes.get("/orders", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
        [req.user!.id],
      )
    ).rows,
  ),
);
export async function getOrder(orderId: number, userId?: number) {
  const order = (
    await db.query(
      "SELECT o.*,u.name customer_name,u.email customer_email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1" +
        (userId ? " AND o.user_id=$2" : ""),
      userId ? [orderId, userId] : [orderId],
    )
  ).rows[0];
  if (!order) throw new HttpError(404, "Order not found.");
  order.items = (
    await db.query("SELECT * FROM order_items WHERE order_id=$1 ORDER BY id", [
      orderId,
    ])
  ).rows;
  order.payment = (
    await db.query("SELECT * FROM payments WHERE order_id=$1", [orderId])
  ).rows[0];
  return order;
}
shopRoutes.get("/orders/:id", async (req, res) =>
  res.json(await getOrder(id(req.params.id), req.user!.id)),
);
shopRoutes.post("/orders", async (req, res) => {
  const data = parse(
    z.object({
      shipping_address: addressSchema,
      billing_address: addressSchema.optional(),
      delivery: z.enum(["STANDARD", "EXPRESS"]),
      payment_method: z.enum(["COD", "ONLINE"]),
      coupon: z.string().max(30).default(""),
    }),
    req.body,
  );
  const order = await transaction(async (tx) => {
    await tx.query("SELECT id FROM cart WHERE user_id=$1 FOR UPDATE", [
      req.user!.id,
    ]);
    const items = await cartItems(req.user!.id, tx, true);
    if (!items.length) throw new HttpError(400, "Your cart is empty.");
    for (const i of items)
      if (
        !i.variant_active ||
        !i.product_active ||
        !i.category_active ||
        i.quantity > i.stock
      )
        throw new HttpError(
          409,
          `${i.name} is unavailable in the requested quantity. Update your cart.`,
        );
    const config = await settings(tx);
    requireCashOnDelivery(data.payment_method, config.cod_enabled);
    const quote = await totals(items, data.coupon, data.delivery, tx, true);
    const number =
      "NEST-" +
      new Date().getFullYear() +
      "-" +
      randomBytes(4).toString("hex").toUpperCase();
    const o = (
      await tx.query(
        `INSERT INTO orders(number,user_id,shipping_address,billing_address,delivery,subtotal,discount,shipping,tax,total,coupon_id,expected_delivery) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          number,
          req.user!.id,
          JSON.stringify(data.shipping_address),
          JSON.stringify(data.billing_address || data.shipping_address),
          data.delivery,
          quote.subtotal,
          quote.discount,
          quote.shipping,
          quote.tax,
          quote.total,
          quote.coupon?.id || null,
          new Date(
            Date.now() + (data.delivery === "EXPRESS" ? 2 : 5) * 86400000,
          ),
        ],
      )
    ).rows[0];
    for (const i of items) {
      await tx.query("UPDATE product_variants SET stock=stock-$1 WHERE id=$2", [
        i.quantity,
        i.variant_id,
      ]);
      await tx.query("UPDATE products SET sales=sales+$1 WHERE id=$2", [
        i.quantity,
        i.product_id,
      ]);
      await tx.query(
        "INSERT INTO order_items(order_id,product_id,variant_id,name,variant,sku,image,quantity,price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          o.id,
          i.product_id,
          i.variant_id,
          i.name,
          i.variant,
          i.sku,
          i.image,
          i.quantity,
          i.price,
        ],
      );
    }
    await tx.query("INSERT INTO payments(order_id,method) VALUES($1,'COD')", [
      o.id,
    ]);
    if (quote.coupon) {
      await tx.query("UPDATE coupons SET used_count=used_count+1 WHERE id=$1", [
        quote.coupon.id,
      ]);
      await tx.query(
        "INSERT INTO coupon_usage(coupon_id,user_id,order_id) VALUES($1,$2,$3)",
        [quote.coupon.id, req.user!.id, o.id],
      );
    }
    await tx.query(
      "DELETE FROM cart_items WHERE cart_id=(SELECT id FROM cart WHERE user_id=$1)",
      [req.user!.id],
    );
    return o;
  });
  res.status(201).json(await getOrder(order.id, req.user!.id));
});
