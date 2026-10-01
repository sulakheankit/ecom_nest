import { HttpError } from "./catalog.js";
export interface PaymentProvider {
  name: string;
  createPayment: (
    orderId: number,
    total: number,
  ) => Promise<{ reference: string; redirectUrl?: string }>;
  verifyWebhook: (
    rawBody: Buffer,
    signature: string,
  ) => Promise<{ orderId: number; status: "PAID" | "REFUNDED" }>;
}
// Inject a verified provider here when gateway credentials and webhooks are ready.
export let onlineProvider: PaymentProvider | null = null;
export function configurePaymentProvider(provider: PaymentProvider) {
  onlineProvider = provider;
}
export function requireCashOnDelivery(
  method: "COD" | "ONLINE",
  enabled: boolean,
) {
  if (method === "ONLINE")
    throw new HttpError(
      503,
      "Online payment is not connected yet. Choose Cash on Delivery.",
    );
  if (!enabled)
    throw new HttpError(400, "Cash on Delivery is currently unavailable.");
}
