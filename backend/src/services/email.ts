import { ROOT } from "../config/db.js";
import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function sendReset(email: string, url: string) {
  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Reset your Nest password",
      text: `Reset your password within 30 minutes: ${url}`,
    });
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("SMTP is not configured");
  const dir = resolve(ROOT, ".data/outbox");
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, Date.now() + ".json"),
    JSON.stringify(
      { to: email, subject: "Reset your Nest password", url },
      null,
      2,
    ),
  );
}
