import bcrypt from "bcryptjs";
import { db, transaction, closeDB } from "../../backend/src/config/db.js";
const adminPassword = process.env.SEED_ADMIN_PASSWORD,
  customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
if (
  !adminPassword ||
  !customerPassword ||
  adminPassword.length < 10 ||
  customerPassword.length < 10
)
  throw new Error(
    "Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD to at least 10 characters.",
  );
if ((await db.query("SELECT id FROM users LIMIT 1")).rows.length) {
  console.log("Database already contains users; seed skipped.");
  await closeDB();
  process.exit(0);
}
const image = (photo: string) => `/catalog/${photo}.jpg`;
const photos = {
  chair: "photo-1598300042247-d088f8ab3a91",
  lamp: "photo-1507473885765-e6ed057f782c",
  headphones: "photo-1546435770-a3e426bf472b",
  bag: "photo-1553062407-98eeb64c6a62",
  shoes: "photo-1542291026-7eec264c27ff",
  watch: "photo-1523275335684-37898b6baf30",
  bottle: "photo-1602143407151-7111542de6e8",
  camera: "photo-1516035069371-29a1b244cc32",
  sofa: "photo-1555041469-a586c61ea9bc",
  plant: "photo-1485955900006-10f4d324d411",
  skincare: "photo-1556229010-6c3f2c9ca5f8",
  shirt: "photo-1521572163474-6864f9cf17ab",
  speaker: "photo-1608043152269-423dbba4e7e1",
  yoga: "photo-1544367567-0f2fcb009e0b",
  coffee: "photo-1514228742587-6b1558fcca3d",
};
const categories = [
  [
    "Home & Living",
    "home-living",
    "Thoughtful pieces for a place that feels like you.",
    photos.chair,
  ],
  [
    "Electronics",
    "electronics",
    "Technology that fits effortlessly into your day.",
    photos.headphones,
  ],
  [
    "Style & Accessories",
    "style-accessories",
    "Your everyday rotation, thoughtfully upgraded.",
    photos.bag,
  ],
  [
    "Beauty & Care",
    "beauty-care",
    "Make room for a little daily care.",
    photos.skincare,
  ],
  [
    "Move & Outdoors",
    "move-outdoors",
    "Essentials for your next adventure.",
    photos.bottle,
  ],
];
const products = [
  [
    "Arc Lounge Chair",
    1,
    1,
    6499,
    8999,
    photos.chair,
    "A sculptural accent chair with a comfortable woven seat.",
  ],
  [
    "Halo Table Lamp",
    1,
    1,
    1899,
    2499,
    photos.lamp,
    "Warm light for slow evenings and inspired spaces.",
  ],
  [
    "Soundform Wireless Headphones",
    2,
    2,
    3299,
    4999,
    photos.headphones,
    "Rich sound. Quiet moments. All-day comfort.",
  ],
  [
    "Everyday Canvas Backpack",
    3,
    3,
    1499,
    2199,
    photos.bag,
    "A roomy, durable companion for work and weekends.",
  ],
  [
    "Stride Running Shoes",
    5,
    4,
    2799,
    3999,
    photos.shoes,
    "Light on your feet, ready for your everyday miles.",
  ],
  [
    "Classic Minimal Watch",
    3,
    3,
    2199,
    3499,
    photos.watch,
    "An understated timepiece for every occasion.",
  ],
  [
    "Hydra Insulated Bottle",
    5,
    4,
    899,
    1299,
    photos.bottle,
    "Stay refreshed with a reusable insulated bottle.",
  ],
  [
    "Focus Digital Camera",
    2,
    2,
    24999,
    28999,
    photos.camera,
    "Capture the little moments in beautiful detail.",
  ],
  [
    "Cloud Two-Seater Sofa",
    1,
    1,
    18999,
    24999,
    photos.sofa,
    "Sink into generous comfort with a timeless silhouette.",
  ],
  [
    "Indoor Planter Set",
    1,
    1,
    799,
    1199,
    photos.plant,
    "Bring a little green into your favourite corners.",
  ],
  [
    "Daily Glow Care Kit",
    4,
    5,
    1299,
    1799,
    photos.skincare,
    "Simple essentials for your daily skincare ritual.",
  ],
  [
    "Essential Cotton Tee",
    3,
    3,
    599,
    899,
    photos.shirt,
    "Soft cotton. An easy fit. Your new everyday favourite.",
  ],
  [
    "Room Portable Speaker",
    2,
    2,
    2499,
    3499,
    photos.speaker,
    "Room-filling sound in a compact, portable design.",
  ],
  [
    "Flow Yoga Mat",
    5,
    4,
    999,
    1499,
    photos.yoga,
    "Find your balance with supportive, non-slip comfort.",
  ],
  [
    "Morning Ceramic Mug",
    1,
    1,
    399,
    599,
    photos.coffee,
    "Your morning ritual deserves a better cup.",
  ],
  [
    "Studio Floor Lamp",
    1,
    1,
    3999,
    5499,
    photos.lamp,
    "A clean silhouette and gentle, ambient glow.",
  ],
  [
    "Weekend Travel Bag",
    3,
    3,
    1999,
    2999,
    photos.bag,
    "Pack light. Go far. Designed for little getaways.",
  ],
  [
    "Active Sports Bottle",
    5,
    4,
    499,
    799,
    photos.bottle,
    "Hydration for every workout and every adventure.",
  ],
  [
    "Restore Night Care",
    4,
    5,
    899,
    1299,
    photos.skincare,
    "A considered addition to your evening routine.",
  ],
  [
    "Air Wireless Headset",
    2,
    2,
    1799,
    2499,
    photos.headphones,
    "Clear calls and easy listening wherever you go.",
  ],
];
await transaction(async (tx) => {
  for (const [name, slug, description, photo] of categories)
    await tx.query(
      "INSERT INTO categories(name,slug,description,image) VALUES($1,$2,$3,$4)",
      [name, slug, description, image(photo)],
    );
  for (const name of [
    "Nest Home",
    "Soundform",
    "Everyday Studio",
    "Trail",
    "Botanic",
  ])
    await tx.query("INSERT INTO brands(name) VALUES($1)", [name]);
  for (const [index, p] of products.entries()) {
    const [name, category, brand, price, original, photo, short] = p;
    const sku = "NEST-" + String(index + 1).padStart(3, "0");
    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const row = (
      await tx.query(
        "INSERT INTO products(name,slug,sku,category_id,brand_id,description,short_description,price,original_price,cost_price,featured,specifications,features,sales) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id",
        [
          name,
          slug,
          sku,
          category,
          brand,
          short +
            " Carefully selected materials, thoughtful details and lasting quality. Designed to be part of the moments that make your day.",
          short,
          price,
          original,
          Number(price) * 0.55,
          index < 8,
          JSON.stringify({
            Brand: [
              "Nest Home",
              "Soundform",
              "Everyday Studio",
              "Trail",
              "Botanic",
            ][Number(brand) - 1],
            Care: "Follow the included care instructions",
            "Country of origin": "India",
            Warranty: "1 year manufacturer warranty where applicable",
          }),
          JSON.stringify([
            "Thoughtfully selected materials",
            "Made for everyday use",
            "Quality checked before dispatch",
          ]),
          0,
        ],
      )
    ).rows[0];
    for (let j = 0; j < 2; j++)
      await tx.query(
        "INSERT INTO product_images(product_id,url,position) VALUES($1,$2,$3)",
        [row.id, image(String(photo)), j],
      );
    const variants =
      Number(category) === 3
        ? ["Natural / M", "Black / L"]
        : ["Natural", "Charcoal"];
    for (const [j, v] of variants.entries())
      await tx.query(
        "INSERT INTO product_variants(product_id,name,sku,attributes,price,stock,image) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          row.id,
          v,
          sku + "-" + j,
          JSON.stringify({
            Color: j ? "Charcoal" : "Natural",
            ...(Number(category) === 3 ? { Size: j ? "L" : "M" } : {}),
          }),
          Number(price) + (j ? 100 : 0),
          index === 19 ? 0 : index === 14 ? 3 : 20 + j * 5,
          image(String(photo)),
        ],
      );
  }
  for (const [name, email, mobile, role, pass] of [
    ["Store Admin", "admin@example.com", "9876543210", "ADMIN", adminPassword],
    [
      "Aarav Mehta",
      "customer@example.com",
      "9876543211",
      "CUSTOMER",
      customerPassword,
    ],
    [
      "Priya Sharma",
      "customer2@example.com",
      "9876543212",
      "CUSTOMER",
      customerPassword,
    ],
  ]) {
    const u = (
      await tx.query(
        "INSERT INTO users(name,email,mobile,role,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [name, email, mobile, role, await bcrypt.hash(pass!, 12)],
      )
    ).rows[0];
    await tx.query("INSERT INTO cart(user_id) VALUES($1)", [u.id]);
    await tx.query("INSERT INTO wishlist(user_id) VALUES($1)", [u.id]);
  }
  await tx.query("INSERT INTO settings(key,value) VALUES('store',$1)", [
    JSON.stringify({
      store_name: "Nest",
      logo: "",
      email: "hello@example.com",
      phone: "+91 98765 43210",
      address: "Pune, Maharashtra, India",
      gst: 18,
      shipping_charge: 79,
      free_shipping_threshold: 1499,
      express_charge: 149,
      cod_enabled: true,
      online_enabled: false,
    }),
  ]);
  for (const [code, type, value, min, max] of [
    ["WELCOME10", "PERCENT", 10, 999, 1000],
    ["NEST200", "FIXED", 200, 1999, null],
  ])
    await tx.query(
      "INSERT INTO coupons(code,discount_type,value,min_order,max_discount,starts_at,expires_at,usage_limit) VALUES($1,$2,$3,$4,$5,$6,$7,1000)",
      [
        code,
        type,
        value,
        min,
        max,
        new Date(Date.now() - 86400000),
        new Date(Date.now() + 90 * 86400000),
      ],
    );
  const address = {
    label: "Home",
    first_name: "Aarav",
    last_name: "Mehta",
    email: "customer@example.com",
    mobile: "9876543211",
    address: "24 Park Avenue",
    apartment: "Flat 302",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    country: "India",
    is_default: true,
  };
  await tx.query(
    "INSERT INTO addresses(user_id,label,first_name,last_name,email,mobile,address,apartment,city,state,pincode,country,is_default) VALUES(2,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
    Object.values(address),
  );
  for (let i = 0; i < 6; i++) {
    const productId = i + 1;
    const p = (
      await tx.query("SELECT * FROM products WHERE id=$1", [productId])
    ).rows[0];
    const v = (
      await tx.query(
        "SELECT * FROM product_variants WHERE product_id=$1 ORDER BY id LIMIT 1",
        [productId],
      )
    ).rows[0];
    const subtotal = Number(v.price);
    const tax = Math.round(subtotal * 18) / 100;
    const status = i < 4 ? "DELIVERED" : i === 4 ? "PROCESSING" : "PENDING";
    const paid = status === "DELIVERED" ? "PAID" : "UNPAID";
    const created = new Date(Date.now() - (6 - i) * 86400000);
    const o = (
      await tx.query(
        "INSERT INTO orders(number,user_id,shipping_address,billing_address,delivery,status,payment_status,subtotal,tax,total,expected_delivery,created_at) VALUES($1,2,$2,$2,'STANDARD',$3,$4,$5,$6,$7,$8,$9) RETURNING id",
        [
          "NEST-DEMO-" + (1001 + i),
          JSON.stringify(address),
          status,
          paid,
          subtotal,
          tax,
          subtotal + tax,
          new Date(created.getTime() + 5 * 86400000),
          created,
        ],
      )
    ).rows[0];
    await tx.query(
      "INSERT INTO order_items(order_id,product_id,variant_id,name,variant,sku,image,quantity,price) VALUES($1,$2,$3,$4,$5,$6,$7,1,$8)",
      [o.id, p.id, v.id, p.name, v.name, v.sku, v.image, v.price],
    );
    await tx.query(
      "INSERT INTO payments(order_id,method,status) VALUES($1,'COD',$2)",
      [o.id, paid],
    );
    await tx.query("UPDATE product_variants SET stock=stock-1 WHERE id=$1", [
      v.id,
    ]);
    await tx.query("UPDATE products SET sales=sales+1 WHERE id=$1", [p.id]);
    if (i < 4)
      await tx.query(
        "INSERT INTO reviews(product_id,user_id,rating,title,description,status) VALUES($1,2,$2,$3,$4,'APPROVED')",
        [
          p.id,
          i === 2 ? 4 : 5,
          "A lovely everyday upgrade",
          "Really pleased with the quality and thoughtful design. Arrived well packed and on time.",
        ],
      );
  }
});
console.log(
  "Seeded 5 categories, 20 products, 40 variants, 3 accounts, 6 orders, 4 verified reviews and 2 coupons.",
);
await closeDB();
