import { Router } from "express";
import { z } from "zod";
import { db, transaction, type DB } from "../config/db.js";
import { auth, admin } from "../middleware/auth.js";
import {
  productSchema,
  categorySchema,
  couponSchema,
  id,
  parse,
} from "../validators/index.js";
import {
  catalogSelect,
  productById,
  HttpError,
  settings,
} from "../services/catalog.js";
import { getOrder } from "./shop.js";
export const adminRoutes = Router();
adminRoutes.use(auth, admin);
export async function saveProduct(data: any, productId?: number) {
  return transaction(async (tx) => {
    const { images, variants, ...fields } = data;
    const keys = Object.keys(fields);
    let p: any;
    if (productId) {
      p = (
        await tx.query(
          `UPDATE products SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING *`,
          [
            ...keys.map((k) =>
              typeof fields[k] === "object"
                ? JSON.stringify(fields[k])
                : fields[k],
            ),
            productId,
          ],
        )
      ).rows[0];
      if (!p) throw new HttpError(404, "Product not found.");
    } else
      p = (
        await tx.query(
          `INSERT INTO products(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
          keys.map((k) =>
            typeof fields[k] === "object"
              ? JSON.stringify(fields[k])
              : fields[k],
          ),
        )
      ).rows[0];
    await tx.query("DELETE FROM product_images WHERE product_id=$1", [p.id]);
    for (let i = 0; i < images.length; i++)
      await tx.query(
        "INSERT INTO product_images(product_id,url,position) VALUES($1,$2,$3)",
        [p.id, images[i], i],
      );
    const retained: number[] = [];
    for (const v of variants) {
      if (v.id) {
        const row = (
          await tx.query(
            "UPDATE product_variants SET name=$1,sku=$2,attributes=$3,price=$4,stock=$5,image=$6,active=$7 WHERE id=$8 AND product_id=$9 RETURNING id",
            [
              v.name,
              v.sku,
              JSON.stringify(v.attributes),
              v.price,
              v.stock,
              v.image,
              v.active,
              v.id,
              p.id,
            ],
          )
        ).rows[0];
        if (!row) throw new HttpError(400, "Invalid product variant.");
        retained.push(row.id);
      } else {
        const row = (
          await tx.query(
            "INSERT INTO product_variants(product_id,name,sku,attributes,price,stock,image,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
            [
              p.id,
              v.name,
              v.sku,
              JSON.stringify(v.attributes),
              v.price,
              v.stock,
              v.image,
              v.active,
            ],
          )
        ).rows[0];
        retained.push(row.id);
      }
    }
    await tx.query(
      "UPDATE product_variants SET active=FALSE WHERE product_id=$1 AND NOT(id=ANY($2::int[]))",
      [p.id, retained],
    );
    return await productById(p.id, tx);
  });
}
adminRoutes.get("/products", async (req, res) => {
  const q = String(req.query.q || "").slice(0, 200);
  res.json(
    (
      await db.query(
        catalogSelect +
          " WHERE p.name ILIKE $1 OR p.sku ILIKE $1 ORDER BY p.id DESC",
        ["%" + q + "%"],
      )
    ).rows,
  );
});
adminRoutes.post("/products", async (req, res) =>
  res.status(201).json(await saveProduct(parse(productSchema, req.body))),
);
adminRoutes.put("/products/:id", async (req, res) =>
  res.json(
    await saveProduct(parse(productSchema, req.body), id(req.params.id)),
  ),
);
adminRoutes.patch("/products/bulk", async (req, res) => {
  const data = parse(
    z.object({
      ids: z.array(z.number().int().positive()).min(1).max(100),
      active: z.boolean(),
    }),
    req.body,
  );
  await db.query(
    "UPDATE products SET active=$1,updated_at=now() WHERE id=ANY($2::int[])",
    [data.active, data.ids],
  );
  res.json({ message: "Products updated." });
});
adminRoutes.delete("/products/:id", async (req, res) => {
  await db.query(
    "UPDATE products SET active=FALSE,updated_at=now() WHERE id=$1",
    [id(req.params.id)],
  );
  res.json({ message: "Product archived. Existing orders are preserved." });
});
adminRoutes.get("/categories", async (_req, res) =>
  res.json((await db.query("SELECT * FROM categories ORDER BY id")).rows),
);
async function saveCategory(data: any, categoryId?: number) {
  if (categoryId && data.parent_id) {
    const ancestors = (
      await db.query(
        "WITH RECURSIVE parents AS (SELECT id,parent_id FROM categories WHERE id=$1 UNION ALL SELECT c.id,c.parent_id FROM categories c JOIN parents p ON c.id=p.parent_id) SELECT id FROM parents",
        [data.parent_id],
      )
    ).rows;
    if (ancestors.some((x) => x.id === categoryId))
      throw new HttpError(400, "Category nesting cannot form a cycle.");
  }
  const keys = Object.keys(data);
  const query = categoryId
    ? `UPDATE categories SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING *`
    : `INSERT INTO categories(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`;
  return (
    await db.query(query, [
      ...Object.values(data),
      ...(categoryId ? [categoryId] : []),
    ])
  ).rows[0];
}
adminRoutes.post("/categories", async (req, res) =>
  res.status(201).json(await saveCategory(parse(categorySchema, req.body))),
);
adminRoutes.put("/categories/:id", async (req, res) =>
  res.json(
    await saveCategory(parse(categorySchema, req.body), id(req.params.id)),
  ),
);
adminRoutes.delete("/categories/:id", async (req, res) => {
  await db.query("DELETE FROM categories WHERE id=$1", [id(req.params.id)]);
  res.json({ message: "Category deleted." });
});
adminRoutes.get("/brands", async (_req, res) =>
  res.json((await db.query("SELECT * FROM brands ORDER BY name")).rows),
);
adminRoutes.post("/brands", async (req, res) => {
  const name = parse(z.string().trim().min(1).max(100), req.body.name);
  res
    .status(201)
    .json(
      (
        await db.query("INSERT INTO brands(name) VALUES($1) RETURNING *", [
          name,
        ])
      ).rows[0],
    );
});
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
adminRoutes.get("/orders", async (req, res) => {
  res.json(
    (
      await db.query(
        "SELECT o.*,u.name customer_name,u.email customer_email,(SELECT sum(quantity)::int FROM order_items WHERE order_id=o.id) items_count FROM orders o JOIN users u ON u.id=o.user_id WHERE o.number ILIKE $1 OR u.name ILIKE $1 ORDER BY o.created_at DESC",
        ["%" + String(req.query.q || "").slice(0, 200) + "%"],
      )
    ).rows,
  );
});
adminRoutes.get("/orders/:id", async (req, res) =>
  res.json(await getOrder(id(req.params.id))),
);
adminRoutes.patch("/orders/:id", async (req, res) => {
  const status = parse(
    z.enum([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ]),
    req.body.status,
  );
  await transaction(async (tx) => {
    const o = (
      await tx.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
        id(req.params.id),
      ])
    ).rows[0];
    if (!o) throw new HttpError(404, "Order not found.");
    if (!transitions[o.status]?.includes(status))
      throw new HttpError(400, `Cannot change ${o.status} to ${status}.`);
    if (status === "CANCELLED" || status === "RETURNED") {
      const items = (
        await tx.query("SELECT * FROM order_items WHERE order_id=$1", [o.id])
      ).rows;
      for (const i of items) {
        await tx.query(
          "UPDATE product_variants SET stock=stock+$1 WHERE id=$2",
          [i.quantity, i.variant_id],
        );
        await tx.query(
          "UPDATE products SET sales=GREATEST(0,sales-$1) WHERE id=$2",
          [i.quantity, i.product_id],
        );
      }
    }
    const payment =
      status === "DELIVERED"
        ? "PAID"
        : status === "REFUNDED"
          ? "REFUNDED"
          : o.payment_status;
    await tx.query(
      "UPDATE orders SET status=$1,payment_status=$2,updated_at=now() WHERE id=$3",
      [status, payment, o.id],
    );
    await tx.query(
      "UPDATE payments SET status=$1,updated_at=now() WHERE order_id=$2",
      [payment, o.id],
    );
  });
  res.json(await getOrder(id(req.params.id)));
});
adminRoutes.get("/customers", async (req, res) =>
  res.json(
    (
      await db.query(
        `SELECT u.id,u.name,u.email,u.mobile,u.active,u.created_at,(SELECT count(*)::int FROM orders o WHERE o.user_id=u.id) order_count,(SELECT COALESCE(sum(total),0) FROM orders o WHERE o.user_id=u.id AND o.payment_status='PAID') total_spending FROM users u WHERE role='CUSTOMER' AND (name ILIKE $1 OR email ILIKE $1) ORDER BY id DESC`,
        ["%" + String(req.query.q || "").slice(0, 200) + "%"],
      )
    ).rows,
  ),
);
adminRoutes.get("/customers/:id", async (req, res) => {
  const customer = (
    await db.query(
      "SELECT id,name,email,mobile,active,created_at FROM users WHERE id=$1 AND role='CUSTOMER'",
      [id(req.params.id)],
    )
  ).rows[0];
  if (!customer) throw new HttpError(404, "Customer not found.");
  customer.orders = (
    await db.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
      [customer.id],
    )
  ).rows;
  res.json(customer);
});
adminRoutes.patch("/customers/:id", async (req, res) => {
  const active = parse(z.boolean(), req.body.active);
  await db.query(
    "UPDATE users SET active=$1,updated_at=now() WHERE id=$2 AND role='CUSTOMER'",
    [active, id(req.params.id)],
  );
  if (!active)
    await db.query("DELETE FROM sessions WHERE user_id=$1", [
      id(req.params.id),
    ]);
  res.json({ message: "Customer updated." });
});
adminRoutes.get("/coupons", async (_req, res) =>
  res.json((await db.query("SELECT * FROM coupons ORDER BY id DESC")).rows),
);
async function saveCoupon(data: any, couponId?: number) {
  const keys = Object.keys(data);
  const query = couponId
    ? `UPDATE coupons SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${keys.length + 1} RETURNING *`
    : `INSERT INTO coupons(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`;
  return (
    await db.query(query, [
      ...Object.values(data),
      ...(couponId ? [couponId] : []),
    ])
  ).rows[0];
}
adminRoutes.post("/coupons", async (req, res) =>
  res.status(201).json(await saveCoupon(parse(couponSchema, req.body))),
);
adminRoutes.put("/coupons/:id", async (req, res) =>
  res.json(await saveCoupon(parse(couponSchema, req.body), id(req.params.id))),
);
adminRoutes.delete("/coupons/:id", async (req, res) => {
  const couponId = id(req.params.id);
  if (
    (
      await db.query("SELECT id FROM orders WHERE coupon_id=$1 LIMIT 1", [
        couponId,
      ])
    ).rows.length
  ) {
    await db.query("UPDATE coupons SET active=FALSE WHERE id=$1", [couponId]);
    res.json({ message: "Used coupon archived." });
  } else {
    await db.query("DELETE FROM coupons WHERE id=$1", [couponId]);
    res.json({ message: "Coupon deleted." });
  }
});
adminRoutes.get("/reviews", async (_req, res) =>
  res.json(
    (
      await db.query(
        `SELECT r.*,p.name product,u.name customer,COALESCE((SELECT jsonb_agg(url) FROM review_images WHERE review_id=r.id),'[]'::jsonb) images FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC`,
      )
    ).rows,
  ),
);
adminRoutes.patch("/reviews/:id", async (req, res) => {
  const status = parse(
    z.enum(["APPROVED", "REJECTED", "PENDING"]),
    req.body.status,
  );
  await db.query("UPDATE reviews SET status=$1,updated_at=now() WHERE id=$2", [
    status,
    id(req.params.id),
  ]);
  res.json({ message: "Review updated." });
});
adminRoutes.delete("/reviews/:id", async (req, res) => {
  await db.query("DELETE FROM reviews WHERE id=$1", [id(req.params.id)]);
  res.json({ message: "Review deleted." });
});
adminRoutes.get("/settings", async (_req, res) => res.json(await settings()));
adminRoutes.put("/settings", async (req, res) => {
  const data = parse(
    z.object({
      store_name: z.string().min(1).max(100),
      logo: z.string().max(2000),
      email: z.email(),
      phone: z.string().max(30),
      address: z.string().max(500),
      gst: z.number().min(0).max(100),
      shipping_charge: z.number().nonnegative(),
      free_shipping_threshold: z.number().nonnegative(),
      express_charge: z.number().nonnegative(),
      cod_enabled: z.boolean(),
      online_enabled: z.literal(false),
    }),
    req.body,
  );
  await db.query(
    "INSERT INTO settings(key,value) VALUES('store',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
    [JSON.stringify(data)],
  );
  res.json(data);
});
adminRoutes.get(["/dashboard", "/reports"], async (req, res) => {
  const dates = parse(
    z
      .object({
        from: z.iso
          .date()
          .default(
            new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
          ),
        to: z.iso.date().default(new Date().toISOString().slice(0, 10)),
      })
      .refine(
        (d) =>
          d.from <= d.to &&
          Date.parse(d.to) - Date.parse(d.from) <= 366 * 86400000,
        { message: "Choose a date range of up to one year" },
      ),
    req.query,
  );
  const params = [dates.from, dates.to];
  const scope =
    "created_at >= $1::date AND created_at < ($2::date+INTERVAL '1 day')";
  const stats = (
    await db.query(
      `SELECT count(*)::int total_orders,COALESCE(sum(total) FILTER(WHERE payment_status='PAID'),0) total_sales,COALESCE(sum(total) FILTER(WHERE payment_status='PAID' AND created_at::date=CURRENT_DATE),0) today_sales,count(*) FILTER(WHERE status='PENDING')::int pending_orders,count(*) FILTER(WHERE status='DELIVERED')::int completed_orders,count(*) FILTER(WHERE status='CANCELLED')::int cancelled_orders,COALESCE(avg(total) FILTER(WHERE payment_status='PAID'),0) average_order_value FROM orders WHERE ${scope}`,
      params,
    )
  ).rows[0];
  stats.total_customers = (
    await db.query("SELECT count(*)::int n FROM users WHERE role='CUSTOMER'")
  ).rows[0].n;
  stats.total_products = (
    await db.query("SELECT count(*)::int n FROM products WHERE active=TRUE")
  ).rows[0].n;
  stats.low_stock_products = (
    await db.query(
      "SELECT count(*)::int n FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active=TRUE AND p.active=TRUE AND v.stock<=p.low_stock_threshold",
    )
  ).rows[0].n;
  const daily = (
    await db.query(
      `SELECT created_at::date::text AS "day",count(*)::int orders,COALESCE(sum(total) FILTER(WHERE payment_status='PAID'),0) revenue FROM orders WHERE ${scope} GROUP BY created_at::date ORDER BY "day"`,
      params,
    )
  ).rows;
  const top_products = (
    await db.query(
      `SELECT p.name,sum(oi.quantity)::int units,sum(oi.price*oi.quantity) revenue FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN orders o ON o.id=oi.order_id WHERE o.payment_status='PAID' AND ${scope.replaceAll("created_at", "o.created_at")} GROUP BY p.id,p.name ORDER BY revenue DESC LIMIT 8`,
      params,
    )
  ).rows;
  const categories = (
    await db.query(
      `SELECT c.name,sum(oi.quantity)::int units,sum(oi.price*oi.quantity) revenue FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id JOIN orders o ON o.id=oi.order_id WHERE o.payment_status='PAID' AND ${scope.replaceAll("created_at", "o.created_at")} GROUP BY c.id,c.name ORDER BY revenue DESC`,
      params,
    )
  ).rows;
  const monthly = (
    await db.query(
      `SELECT to_char(created_at,'YYYY-MM') AS "month",count(*)::int orders,COALESCE(sum(total) FILTER(WHERE payment_status='PAID'),0) revenue FROM orders WHERE ${scope} GROUP BY to_char(created_at,'YYYY-MM') ORDER BY "month"`,
      params,
    )
  ).rows;
  res.json({
    stats,
    daily,
    monthly,
    top_products,
    categories,
    from: dates.from,
    to: dates.to,
  });
});
