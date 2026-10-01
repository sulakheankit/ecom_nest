import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { createMocks } from "node-mocks-http";
const dir = mkdtempSync(join(tmpdir(), "nest-api-test-"));
process.env.DB_MODE = "embedded";
process.env.DB_PATH = join(dir, "db");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-that-is-longer-than-32-characters";
process.env.SEED_ADMIN_PASSWORD = "TestAdmin!234";
process.env.SEED_CUSTOMER_PASSWORD = "TestCustomer!234";
for (const script of ["database/migrate.ts", "database/seed/index.ts"]) {
  const r = spawnSync(process.execPath, ["--import", "tsx", script], {
    env: process.env,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
}
const { app } = await import("../backend/src/app.js");
const { db, closeDB } = await import("../backend/src/config/db.js");
type Result = { status: number; body: any; cookie: string };
async function request(
  method: string,
  url: string,
  body?: any,
  cookie = "",
  extra: Record<string, string> = {},
): Promise<Result> {
  const { req, res } = createMocks(
    {
      method: method as any,
      url,
      originalUrl: url,
      body,
      headers: { ...(cookie ? { cookie } : {}), ...extra },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" } as any,
    },
    { eventEmitter: EventEmitter },
  );
  delete (req as any).cookies;
  delete (req as any).signedCookies;
  delete (res as any).cookie;
  delete (res as any).clearCookie;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Request timed out: " + url)),
      10000,
    );
    res.on("end", () => {
      clearTimeout(timeout);
      let json: any;
      try {
        json = res._getJSONData();
      } catch {
        json = res._getData();
      }
      const cookies = res.getHeader("set-cookie");
      resolve({
        status: res.statusCode,
        body: json,
        cookie: (Array.isArray(cookies)
          ? cookies[0]
          : String(cookies || "")
        ).split(";")[0],
      });
    });
    app.handle(req as any, res as any, (e: any) => {
      clearTimeout(timeout);
      reject(e || new Error("Unhandled request " + url));
    });
  });
}
let customer = "",
  admin = "",
  newCustomer = "",
  newUserId = 0,
  orderId = 0,
  variantId = 0,
  productId = 0,
  initialStock = 0;
after(async () => {
  await closeDB();
  rmSync(dir, { recursive: true, force: true });
});
test("catalog, filtering, pagination and product details", async () => {
  const all = await request("GET", "/api/products?limit=12");
  assert.equal(all.status, 200);
  assert.equal(all.body.total, 20);
  assert.equal(all.body.products.length, 12);
  const search = await request("GET", "/api/products?q=Arc%20Lounge");
  assert.equal(search.body.total, 1);
  const detail = await request("GET", "/api/products/arc-lounge-chair");
  assert.equal(detail.body.variants.length, 2);
  productId = detail.body.id;
  variantId = detail.body.variants[0].id;
  initialStock = detail.body.variants[0].stock;
  const category = await request(
    "GET",
    "/api/products?category=electronics&sort=price-asc",
  );
  assert.equal(category.body.total, 4);
  assert.ok(
    Number(category.body.products[0].price) <=
      Number(category.body.products.at(-1).price),
  );
  assert.equal((await request("GET", "/api/products?page=0")).status, 400);
});
test("authentication, password hashing and role isolation", async () => {
  assert.equal((await request("GET", "/api/cart")).status, 401);
  assert.equal(
    (
      await request("POST", "/api/auth/login", {
        email: "customer@example.com",
        password: "wrong",
      })
    ).status,
    401,
  );
  let r = await request("POST", "/api/auth/login", {
    email: "customer@example.com",
    password: "TestCustomer!234",
    remember: true,
  });
  assert.equal(r.status, 200);
  customer = r.cookie;
  assert.ok(customer.startsWith("session="));
  r = await request("POST", "/api/auth/login", {
    email: "admin@example.com",
    password: "TestAdmin!234",
  });
  assert.equal(r.status, 200);
  admin = r.cookie;
  assert.equal(
    (await request("GET", "/api/admin/products", undefined, customer)).status,
    403,
  );
  assert.equal(
    (await request("GET", "/api/admin/products", undefined, admin)).status,
    200,
  );
  r = await request("POST", "/api/auth/register", {
    name: "Integration Customer",
    email: "integration@example.com",
    mobile: "9876543299",
    password: "Integration!234",
    role: "ADMIN",
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.role, "CUSTOMER");
  newCustomer = r.cookie;
  newUserId = r.body.user.id;
  assert.equal(r.body.user.password_hash, undefined);
  const u = (
    await db.query("SELECT password_hash FROM users WHERE id=$1", [newUserId])
  ).rows[0];
  assert.ok(u.password_hash.startsWith("$2"));
  assert.notEqual(u.password_hash, "Integration!234");
  assert.equal(
    (
      await request("POST", "/api/auth/register", {
        name: "Duplicate",
        email: "integration@example.com",
        mobile: "9876543299",
        password: "Integration!234",
      })
    ).status,
    409,
  );
});
test("cart quantities, wishlist persistence and address ownership", async () => {
  let r = await request(
    "POST",
    "/api/cart",
    { variant_id: variantId, quantity: 2 },
    newCustomer,
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.items[0].quantity, 2);
  const itemId = r.body.items[0].id;
  assert.equal(
    (
      await request(
        "PUT",
        "/api/cart/" + itemId,
        { quantity: initialStock + 1 },
        newCustomer,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request("PUT", "/api/cart/" + itemId, { quantity: 1 }, customer))
      .status,
    404,
  );
  r = await request("PUT", "/api/cart/" + itemId, { quantity: 1 }, newCustomer);
  assert.equal(r.body.items[0].quantity, 1);
  assert.equal(
    (
      await request(
        "POST",
        "/api/wishlist",
        { product_id: productId },
        newCustomer,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("GET", "/api/wishlist", undefined, newCustomer)).body[0].id,
    productId,
  );
  const address = {
    label: "Office",
    first_name: "Test",
    last_name: "Customer",
    email: "integration@example.com",
    mobile: "9876543299",
    address: "10 Test Road",
    apartment: "301",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    country: "India",
    is_default: true,
  };
  r = await request("POST", "/api/addresses", address, newCustomer);
  assert.equal(r.status, 201);
  assert.equal(
    (await request("PUT", "/api/addresses/" + r.body.id, address, customer))
      .status,
    404,
  );
});
test("checkout validates coupons, ignores client totals and atomically reduces stock", async () => {
  const address = {
    label: "Home",
    first_name: "Test",
    last_name: "Customer",
    email: "integration@example.com",
    mobile: "9876543299",
    address: "10 Test Road",
    apartment: "301",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    country: "India",
    is_default: false,
  };
  assert.equal(
    (
      await request(
        "POST",
        "/api/checkout/quote",
        { coupon: "NOPE", delivery: "STANDARD" },
        newCustomer,
      )
    ).status,
    400,
  );
  const quote = await request(
    "POST",
    "/api/checkout/quote",
    { coupon: "WELCOME10", delivery: "STANDARD" },
    newCustomer,
  );
  assert.equal(quote.status, 200);
  assert.equal(Number(quote.body.discount), 649.9);
  assert.equal(
    (
      await request(
        "POST",
        "/api/orders",
        {
          shipping_address: address,
          delivery: "STANDARD",
          payment_method: "ONLINE",
        },
        newCustomer,
      )
    ).status,
    503,
  );
  const r = await request(
    "POST",
    "/api/orders",
    {
      shipping_address: address,
      delivery: "STANDARD",
      payment_method: "COD",
      coupon: "WELCOME10",
      total: 1,
    },
    newCustomer,
  );
  assert.equal(r.status, 201);
  orderId = r.body.id;
  assert.equal(Number(r.body.total), Number(quote.body.total));
  assert.equal(r.body.items.length, 1);
  assert.equal(
    (await request("GET", "/api/cart", undefined, newCustomer)).body.items
      .length,
    0,
  );
  assert.equal(
    (
      await db.query("SELECT stock FROM product_variants WHERE id=$1", [
        variantId,
      ])
    ).rows[0].stock,
    initialStock - 1,
  );
  assert.equal(
    (await request("GET", "/api/orders/" + orderId, undefined, customer))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        "POST",
        "/api/orders",
        {
          shipping_address: address,
          delivery: "STANDARD",
          payment_method: "COD",
        },
        newCustomer,
      )
    ).status,
    400,
  );
});
test("order transitions, cancellation restores stock exactly once, reports work", async () => {
  assert.equal(
    (
      await request(
        "PATCH",
        "/api/admin/orders/" + orderId,
        { status: "DELIVERED" },
        admin,
      )
    ).status,
    400,
  );
  const r = await request(
    "PATCH",
    "/api/admin/orders/" + orderId,
    { status: "CANCELLED" },
    admin,
  );
  assert.equal(r.status, 200);
  assert.equal(
    (
      await db.query("SELECT stock FROM product_variants WHERE id=$1", [
        variantId,
      ])
    ).rows[0].stock,
    initialStock,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/api/admin/orders/" + orderId,
        { status: "CANCELLED" },
        admin,
      )
    ).status,
    400,
  );
  const dashboard = await request(
    "GET",
    "/api/admin/dashboard",
    undefined,
    admin,
  );
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.stats.total_orders >= 7);
  assert.ok(dashboard.body.top_products.length > 0);
  assert.ok(dashboard.body.categories.length > 0);
  assert.equal(
    (
      await request(
        "GET",
        "/api/admin/reports?from=2026-01-01&to=2026-12-31",
        undefined,
        admin,
      )
    ).status,
    200,
  );
});
test("admin product, category and coupon CRUD with server validation", async () => {
  let r = await request(
    "POST",
    "/api/admin/categories",
    {
      name: "Test Collection",
      slug: "test-collection",
      description: "Testing",
      image: "",
      parent_id: null,
      active: true,
      seo_title: "",
      seo_description: "",
    },
    admin,
  );
  assert.equal(r.status, 201);
  const categoryId = r.body.id;
  const data = {
    name: "Test Product",
    slug: "test-product",
    sku: "TEST-SKU",
    category_id: categoryId,
    brand_id: 1,
    description: "A product created by the integration test.",
    short_description: "Test product",
    price: 200,
    original_price: 300,
    cost_price: 100,
    low_stock_threshold: 2,
    specifications: { Material: "Cotton" },
    features: ["Useful"],
    seo_title: "Test",
    seo_description: "A test",
    active: true,
    featured: false,
    images: ["https://example.com/product.jpg"],
    variants: [
      {
        name: "Default",
        sku: "TEST-SKU-DEFAULT",
        attributes: {},
        price: 200,
        stock: 5,
        image: "",
        active: true,
      },
    ],
  };
  r = await request("POST", "/api/admin/products", data, admin);
  assert.equal(r.status, 201);
  const p = r.body;
  r = await request(
    "PUT",
    "/api/admin/products/" + p.id,
    {
      ...data,
      name: "Updated Product",
      variants: p.variants.map((v: any) => ({ ...v, stock: 8 })),
    },
    admin,
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.stock, 8);
  assert.equal(
    (await request("DELETE", "/api/admin/products/" + p.id, undefined, admin))
      .status,
    200,
  );
  assert.equal(
    (await request("GET", "/api/products/test-product")).status,
    404,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        "/api/admin/categories/" + categoryId,
        undefined,
        admin,
      )
    ).status,
    409,
  );
  const coupon = {
    code: "TEST25",
    discount_type: "PERCENT",
    value: 25,
    min_order: 0,
    max_discount: 100,
    starts_at: new Date(Date.now() - 60000).toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    usage_limit: 2,
    active: true,
  };
  r = await request("POST", "/api/admin/coupons", coupon, admin);
  assert.equal(r.status, 201);
  assert.equal(
    (
      await request(
        "PUT",
        "/api/admin/coupons/" + r.body.id,
        { ...coupon, value: 20 },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        "/api/admin/coupons/" + r.body.id,
        undefined,
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "POST",
        "/api/admin/coupons",
        { ...coupon, value: 150 },
        admin,
      )
    ).status,
    400,
  );
});
test("review purchase verification and moderation", async () => {
  assert.equal(
    (
      await request(
        "POST",
        "/api/products/arc-lounge-chair/reviews",
        {
          rating: 5,
          title: "Excellent chair",
          description: "A beautiful chair with excellent quality.",
        },
        newCustomer,
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("GET", "/api/admin/reviews", undefined, customer)).status,
    403,
  );
  const reviews = await request("GET", "/api/admin/reviews", undefined, admin);
  assert.equal(reviews.status, 200);
  const r = reviews.body[0];
  assert.equal(
    (
      await request(
        "PATCH",
        "/api/admin/reviews/" + r.id,
        { status: "REJECTED" },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/api/admin/reviews/" + r.id,
        { status: "APPROVED" },
        admin,
      )
    ).status,
    200,
  );
});
test("CSRF origin checks, session revocation and disabled customers", async () => {
  assert.equal(
    (
      await request(
        "POST",
        "/api/cart",
        { variant_id: variantId, quantity: 1 },
        customer,
        { origin: "https://untrusted.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "PATCH",
        "/api/admin/customers/" + newUserId,
        { active: false },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("GET", "/api/auth/me", undefined, newCustomer)).status,
    401,
  );
  assert.equal(
    (await request("POST", "/api/auth/logout", {}, customer)).status,
    200,
  );
  assert.equal(
    (await request("GET", "/api/auth/me", undefined, customer)).status,
    401,
  );
});
