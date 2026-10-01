import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: "CUSTOMER" | "ADMIN";
  active: boolean;
}
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}
export const secret = process.env.JWT_SECRET || "";
if (secret.length < 32)
  throw new Error("JWT_SECRET must contain at least 32 characters");
export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.session;
    if (!token)
      return res.status(401).json({ message: "Please sign in to continue." });
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "nest-store",
      audience: "nest-customer",
    }) as jwt.JwtPayload;
    const result = await db.query(
      "SELECT u.id,u.name,u.email,u.mobile,u.role,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.expires_at>now()",
      [payload.jti, payload.sub],
    );
    if (!result.rows[0]?.active)
      return res
        .status(401)
        .json({ message: "Your session has ended. Please sign in again." });
    req.user = result.rows[0];
    req.sessionId = payload.jti;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Your session has ended. Please sign in again." });
  }
}
export function admin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ message: "Administrator access required." });
  next();
}
