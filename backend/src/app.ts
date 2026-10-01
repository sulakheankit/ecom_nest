import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { shopRoutes } from "./routes/shop.js";
import { adminRoutes } from "./routes/admin.js";
import { auth } from "./middleware/auth.js";
import { HttpError } from "./services/catalog.js";
import { db, ROOT } from "./config/db.js";
export const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https:", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
      },
    },
  }),
);
const origins = (process.env.FRONTEND_URL || "http://localhost:5173").split(
  ",",
);
app.use(cors({ origin: origins, credentials: true }));
app.use((req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    !origins.includes(req.headers.origin)
  )
    return res.status(403).json({ message: "Request origin not allowed." });
  next();
});
app.use(express.json({ limit: "1mb" }), cookieParser());
app.get("/api/health", async (_req, res) => {
  await db.query("SELECT 1");
  res.json({ status: "ok" });
});
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many requests. Please wait a moment." },
  }),
);
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60000,
    limit: process.env.NODE_ENV === "test" ? 500 : 40,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many sign-in attempts. Try again later." },
  }),
  authRoutes,
);
app.use("/api", catalogRoutes);
app.use("/api/admin", adminRoutes);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
// Authenticate uploads independently; customer uploads support verified review images.
app.post("/api/uploads", auth, upload.array("images", 10), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length)
    throw new HttpError(400, "Choose JPG, PNG or WebP images up to 5 MB.");
  const dir = resolve(ROOT, "backend/uploads");
  await mkdir(dir, { recursive: true });
  const urls = [];
  for (const file of files) {
    const name = randomBytes(20).toString("hex") + ".webp";
    await sharp(file.buffer, { limitInputPixels: 16000000 })
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(resolve(dir, name));
    urls.push("/uploads/" + name);
  }
  res.status(201).json({ urls });
});
app.use("/api", shopRoutes);
app.use(
  "/uploads",
  express.static(resolve(ROOT, "backend/uploads"), {
    maxAge: "30d",
    immutable: true,
  }),
);
app.get("/sitemap.xml", async (_req, res) => {
  const origin = process.env.PUBLIC_URL || "http://localhost:5173";
  const products = (
    await db.query("SELECT slug FROM products WHERE active=TRUE")
  ).rows;
  const categories = (
    await db.query("SELECT slug FROM categories WHERE active=TRUE")
  ).rows;
  const paths = [
    "",
    "/products",
    "/about",
    "/contact",
    ...products.map((p) => "/products/" + p.slug),
    ...categories.map((c) => "/category/" + c.slug),
  ];
  res
    .type("xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${origin.replace(/&/g, "&amp;") + p}</loc></url>`).join("")}</urlset>`,
    );
});
app.get("/robots.txt", (_req, res) =>
  res
    .type("text")
    .send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nSitemap: ${process.env.PUBLIC_URL || "http://localhost:5173"}/sitemap.xml`,
    ),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ message: "API endpoint not found." }),
);
app.use(express.static(resolve(ROOT, "frontend/dist")));
app.get(/^(?!\/api|\/uploads).*/, (_req, res, next) =>
  res.sendFile(
    resolve(ROOT, "frontend/dist/index.html"),
    (err) => err && next(err),
  ),
);
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof ZodError)
      return res
        .status(400)
        .json({
          message: err.issues
            .map(
              (i) =>
                (i.path.join(".") ? i.path.join(".") + ": " : "") + i.message,
            )
            .join("; "),
        });
    if (err instanceof HttpError)
      return res.status(err.status).json({ message: err.message });
    if (err.code === "23505")
      return res
        .status(409)
        .json({ message: "That email, SKU, slug or record already exists." });
    if (err.code === "23503")
      return res
        .status(409)
        .json({
          message:
            "This record is linked to other records. Archive it or update the related records first.",
        });
    if (err instanceof multer.MulterError)
      return res
        .status(400)
        .json({
          message: "Upload limit exceeded. Use images smaller than 5 MB.",
        });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ message: "Invalid JSON request." });
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  },
);
