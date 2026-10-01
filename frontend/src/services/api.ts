const base = import.meta.env.VITE_API_URL || "";
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(base + "/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const body = await res
    .json()
    .catch(() => ({
      message: "The service is unavailable. Please try again.",
    }));
  if (!res.ok)
    throw new APIError(body.message || "Something went wrong.", res.status);
  return body;
}
export const send = (path: string, body: any, method = "POST") =>
  api(path, { method, body: JSON.stringify(body) });
export const asset = (src: string) =>
  src?.startsWith("/uploads/") ? base + src : src;
export const currency = (n: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n));
export const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
