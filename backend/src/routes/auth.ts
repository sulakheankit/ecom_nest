import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db, transaction } from "../config/db.js";
import { auth, secret } from "../middleware/auth.js";
import { registerSchema, password, parse } from "../validators/index.js";
import { HttpError } from "../services/catalog.js";
import { sendReset } from "../services/email.js";
export const authRoutes = Router();
const cookie = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  path: "/",
};
async function session(user: any, res: any, remember: boolean) {
  const jti = randomBytes(32).toString("hex");
  const expires = remember ? 30 * 86400 : 86400;
  await db.query(
    "INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,$3)",
    [jti, user.id, new Date(Date.now() + expires * 1000)],
  );
  const token = jwt.sign({}, secret, {
    algorithm: "HS256",
    subject: String(user.id),
    jwtid: jti,
    issuer: "nest-store",
    audience: "nest-customer",
    expiresIn: expires,
  });
  res.cookie("session", token, {
    ...cookie,
    ...(remember ? { maxAge: expires * 1000 } : {}),
  });
  const { password_hash, ...profile } = user;
  res.json({ user: profile });
}
authRoutes.post("/register", async (req, res) => {
  const data = parse(registerSchema, req.body);
  const hash = await bcrypt.hash(data.password, 12);
  const user = await transaction(async (tx) => {
    const u = (
      await tx.query(
        "INSERT INTO users(name,email,mobile,password_hash) VALUES($1,$2,$3,$4) RETURNING *",
        [data.name, data.email, data.mobile, hash],
      )
    ).rows[0];
    await tx.query("INSERT INTO cart(user_id) VALUES($1)", [u.id]);
    await tx.query("INSERT INTO wishlist(user_id) VALUES($1)", [u.id]);
    return u;
  });
  await session(user, res, false);
});
authRoutes.post("/login", async (req, res) => {
  const data = parse(
    z.object({
      email: z.email().transform((s) => s.toLowerCase()),
      password: z.string().max(128),
      remember: z.boolean().default(false),
    }),
    req.body,
  );
  const user = (
    await db.query("SELECT * FROM users WHERE email=$1", [data.email])
  ).rows[0];
  if (
    !user ||
    !user.active ||
    !(await bcrypt.compare(data.password, user.password_hash))
  )
    throw new HttpError(401, "Email or password is incorrect.");
  await session(user, res, data.remember);
});
authRoutes.get("/me", auth, (req, res) => res.json({ user: req.user }));
authRoutes.post("/logout", auth, async (req, res) => {
  await db.query("DELETE FROM sessions WHERE id=$1", [req.sessionId]);
  res.clearCookie("session", cookie).json({ message: "Signed out." });
});
authRoutes.post("/forgot-password", async (req, res) => {
  const { email } = parse(
    z.object({ email: z.email().transform((s) => s.toLowerCase()) }),
    req.body,
  );
  if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST)
    throw new HttpError(
      503,
      "Password recovery is not configured. Contact the store for help.",
    );
  const user = (
    await db.query("SELECT id FROM users WHERE email=$1 AND active=TRUE", [
      email,
    ])
  ).rows[0];
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
      [
        createHash("sha256").update(token).digest("hex"),
        user.id,
        new Date(Date.now() + 30 * 60000),
      ],
    );
    await sendReset(
      email,
      `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    );
  }
  res.json({
    message:
      "If that email is registered, a reset link has been sent. In local demo mode, see .data/outbox.",
  });
});
authRoutes.post("/reset-password", async (req, res) => {
  const data = parse(
    z.object({ token: z.string().length(64), password }),
    req.body,
  );
  const hash = await bcrypt.hash(data.password, 12);
  await transaction(async (tx) => {
    const reset = (
      await tx.query(
        "SELECT * FROM password_resets WHERE token_hash=$1 AND expires_at>now() FOR UPDATE",
        [createHash("sha256").update(data.token).digest("hex")],
      )
    ).rows[0];
    if (!reset) throw new HttpError(400, "Reset link is invalid or expired.");
    await tx.query(
      "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
      [hash, reset.user_id],
    );
    await tx.query("DELETE FROM password_resets WHERE user_id=$1", [
      reset.user_id,
    ]);
    await tx.query("DELETE FROM sessions WHERE user_id=$1", [reset.user_id]);
  });
  res
    .clearCookie("session", cookie)
    .json({ message: "Password updated. Please sign in." });
});
authRoutes.put("/profile", auth, async (req, res) => {
  const data = parse(registerSchema.omit({ password: true }), req.body);
  const user = (
    await db.query(
      "UPDATE users SET name=$1,email=$2,mobile=$3,updated_at=now() WHERE id=$4 RETURNING id,name,email,mobile,role",
      [data.name, data.email, data.mobile, req.user!.id],
    )
  ).rows[0];
  res.json({ user });
});
authRoutes.post("/change-password", auth, async (req, res) => {
  const data = parse(
    z.object({ current_password: z.string().max(128), password }),
    req.body,
  );
  const u = (
    await db.query("SELECT password_hash FROM users WHERE id=$1", [
      req.user!.id,
    ])
  ).rows[0];
  if (!(await bcrypt.compare(data.current_password, u.password_hash)))
    throw new HttpError(400, "Current password is incorrect.");
  const hash = await bcrypt.hash(data.password, 12);
  await transaction(async (tx) => {
    await tx.query(
      "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
      [hash, req.user!.id],
    );
    await tx.query("DELETE FROM sessions WHERE user_id=$1 AND id<>$2", [
      req.user!.id,
      req.sessionId,
    ]);
  });
  res.json({ message: "Password changed. Other sessions signed out." });
});
