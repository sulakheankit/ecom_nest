import { z } from "zod";
const str = z.string().trim().min(1).max(500);
export const safeImage = z
  .string()
  .max(2000)
  .refine(
    (s) =>
      s === "" ||
      s.startsWith("/uploads/") ||
      /^\/catalog\/photo-[a-z0-9-]+\.jpg$/.test(s) ||
      /^https:\/\//.test(s),
    "Use an HTTPS image URL or an uploaded image",
  );
export const password = z.string().min(10).max(128);
export const registerSchema = z.object({
  name: str,
  email: z.email().transform((s) => s.toLowerCase()),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  password,
});
export const addressSchema = z.object({
  label: str.default("Home"),
  first_name: str,
  last_name: str,
  email: z.email(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  address: str,
  apartment: z.string().max(200).default(""),
  city: str,
  state: str,
  pincode: z.string().regex(/^\d{6}$/),
  country: z.literal("India").default("India"),
  is_default: z.boolean().default(false),
});
export const productSchema = z
  .object({
    name: str,
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sku: str,
    category_id: z.coerce.number().int().positive(),
    brand_id: z.coerce.number().int().positive(),
    description: z.string().min(10).max(20000),
    short_description: str,
    price: z.coerce.number().nonnegative(),
    original_price: z.coerce.number().nonnegative(),
    cost_price: z.coerce.number().nonnegative().default(0),
    low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
    specifications: z.record(z.string(), z.string()).default({}),
    features: z.array(str).default([]),
    seo_title: z.string().max(200).default(""),
    seo_description: z.string().max(500).default(""),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    images: z.array(safeImage).min(1).max(10),
    variants: z
      .array(
        z.object({
          id: z.number().int().positive().optional(),
          name: str,
          sku: str,
          attributes: z.record(z.string(), z.string()).default({}),
          price: z.coerce.number().nonnegative(),
          stock: z.coerce.number().int().nonnegative(),
          image: safeImage.default(""),
          active: z.boolean().default(true),
        }),
      )
      .min(1)
      .max(50),
  })
  .refine((p) => p.original_price >= p.price, {
    message: "Original price must be at least the selling price",
  });
export const categorySchema = z.object({
  name: str,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).default(""),
  image: safeImage.default(""),
  parent_id: z.number().int().positive().nullable().default(null),
  active: z.boolean().default(true),
  seo_title: z.string().max(200).default(""),
  seo_description: z.string().max(500).default(""),
});
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .transform((s) => s.toUpperCase()),
    discount_type: z.enum(["PERCENT", "FIXED"]),
    value: z.coerce.number().positive(),
    min_order: z.coerce.number().nonnegative().default(0),
    max_discount: z.coerce.number().positive().nullable().default(null),
    starts_at: z.iso.datetime(),
    expires_at: z.iso.datetime(),
    usage_limit: z.coerce.number().int().positive(),
    active: z.boolean(),
  })
  .refine(
    (c) =>
      Date.parse(c.expires_at) > Date.parse(c.starts_at) &&
      (c.discount_type !== "PERCENT" || c.value <= 100),
    { message: "Check coupon dates and percentage" },
  );
export function parse<T>(schema: z.ZodType<T>, input: any): T {
  return schema.parse(input);
}
export const id = (value: any) =>
  z.coerce.number().int().positive().parse(value);
