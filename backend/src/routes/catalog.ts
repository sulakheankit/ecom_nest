import { Router } from "express";
import { z } from "zod";
import { db } from "../config/db.js";
import { auth } from "../middleware/auth.js";
import { catalogSelect, HttpError, settings } from "../services/catalog.js";
import { id, parse, safeImage } from "../validators/index.js";
export const catalogRoutes = Router();
catalogRoutes.get("/products", async (req, res) => {
  const q = parse(
    z.object({
      q: z.string().max(200).default(""),
      category: z.string().max(100).default(""),
      brand: z.string().max(100).default(""),
      min: z.coerce.number().nonnegative().default(0),
      max: z.coerce.number().nonnegative().default(1000000),
      rating: z.coerce.number().min(0).max(5).default(0),
      stock: z.enum(["", "true"]).default(""),
      sort: z
        .enum([
          "featured",
          "newest",
          "price-asc",
          "price-desc",
          "rating",
          "best-selling",
        ])
        .default("featured"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(48).default(12),
      offers: z.enum(["", "true"]).default(""),
    }),
    req.query,
  );
  const params: any[] = [];
  const clause = (sql: string, value: any) => {
    params.push(value);
    return sql.replace("?", `$${params.length}`);
  };
  const where = [
    "p.active=TRUE",
    "c.active=TRUE",
    clause(
      "(p.name ILIKE ? OR p.sku ILIKE $1 OR b.name ILIKE $1 OR c.name ILIKE $1 OR p.description ILIKE $1)",
      `%${q.q}%`,
    ),
    clause("p.price>=?", q.min),
    clause("p.price<=?", q.max),
  ];
  if (q.category) where.push(clause("c.slug=?", q.category));
  if (q.brand) where.push(clause("b.name=?", q.brand));
  if (q.rating)
    where.push(
      clause(
        "COALESCE((SELECT avg(rating) FROM reviews WHERE product_id=p.id AND status='APPROVED'),0)>=?",
        q.rating,
      ),
    );
  if (q.stock)
    where.push(
      "EXISTS(SELECT 1 FROM product_variants WHERE product_id=p.id AND active=TRUE AND stock>0)",
    );
  if (q.offers) where.push("p.original_price>p.price");
  const filter = " WHERE " + where.join(" AND ");
  const count = (
    await db.query(
      "SELECT count(*)::int count FROM products p JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id" +
        filter,
      params,
    )
  ).rows[0].count;
  const sorts: Record<string, string> = {
    featured: "p.featured DESC,p.id DESC",
    newest: "p.created_at DESC,p.id DESC",
    "price-asc": "p.price ASC,p.id",
    "price-desc": "p.price DESC,p.id",
    rating: "rating DESC,p.id",
    "best-selling": "p.sales DESC,p.id",
  };
  params.push(q.limit, (q.page - 1) * q.limit);
  const rows = (
    await db.query(
      catalogSelect +
        filter +
        ` ORDER BY ${sorts[q.sort]} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
  ).rows;
  res.json({
    products: rows,
    total: count,
    page: q.page,
    pages: Math.ceil(count / q.limit),
  });
});
catalogRoutes.get("/products/:slug", async (req, res) => {
  const product = (
    await db.query(
      catalogSelect + " WHERE p.slug=$1 AND p.active=TRUE AND c.active=TRUE",
      [req.params.slug],
    )
  ).rows[0];
  if (!product) throw new HttpError(404, "Product not found.");
  res.json(product);
});
catalogRoutes.get("/categories", async (_req, res) =>
  res.json(
    (await db.query("SELECT * FROM categories WHERE active=TRUE ORDER BY id"))
      .rows,
  ),
);
catalogRoutes.get("/brands", async (_req, res) =>
  res.json((await db.query("SELECT * FROM brands ORDER BY name")).rows),
);
catalogRoutes.get("/settings", async (_req, res) => {
  const s = await settings();
  const { smtp, ...publicSettings } = s;
  res.json(publicSettings);
});
catalogRoutes.get("/products/:slug/reviews", async (req, res) => {
  res.json(
    (
      await db.query(
        `SELECT r.id,r.rating,r.title,r.description,r.created_at,u.name,COALESCE((SELECT jsonb_agg(url) FROM review_images ri WHERE ri.review_id=r.id),'[]'::jsonb) images FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id WHERE p.slug=$1 AND r.status='APPROVED' ORDER BY r.created_at DESC LIMIT 100`,
        [req.params.slug],
      )
    ).rows,
  );
});
catalogRoutes.post("/products/:slug/reviews", auth, async (req, res) => {
  const data = parse(
    z.object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().min(3).max(200),
      description: z.string().trim().min(10).max(5000),
      images: z.array(safeImage).max(4).default([]),
    }),
    req.body,
  );
  const product = (
    await db.query("SELECT id FROM products WHERE slug=$1", [req.params.slug])
  ).rows[0];
  if (!product) throw new HttpError(404, "Product not found.");
  const purchased = (
    await db.query(
      "SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=$1 AND o.user_id=$2 AND o.status='DELIVERED' LIMIT 1",
      [product.id, req.user!.id],
    )
  ).rows.length;
  if (!purchased)
    throw new HttpError(
      403,
      "You can review this product after your order is delivered.",
    );
  const review = (
    await db.query(
      "INSERT INTO reviews(product_id,user_id,rating,title,description) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [product.id, req.user!.id, data.rating, data.title, data.description],
    )
  ).rows[0];
  for (const url of data.images)
    await db.query("INSERT INTO review_images(review_id,url) VALUES($1,$2)", [
      review.id,
      url,
    ]);
  res
    .status(201)
    .json({ message: "Thank you! Your review is awaiting approval." });
});
catalogRoutes.post("/newsletter", async (req, res) => {
  const { email } = parse(
    z.object({ email: z.email().transform((s) => s.toLowerCase()) }),
    req.body,
  );
  await db.query(
    "INSERT INTO newsletter(email) VALUES($1) ON CONFLICT DO NOTHING",
    [email],
  );
  res.json({ message: "You’re on the list. Thanks for joining!" });
});
