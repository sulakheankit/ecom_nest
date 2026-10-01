import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "../frontend/src/store/Store";
import { App } from "../frontend/src/App";
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const user = {
  id: 2,
  name: "Aarav Mehta",
  email: "customer@example.com",
  mobile: "9876543211",
  role: "CUSTOMER",
};
const product = {
  id: 1,
  name: "Arc Lounge Chair",
  slug: "arc-lounge-chair",
  sku: "NEST-001",
  category: "Home & Living",
  category_slug: "home-living",
  category_id: 1,
  brand: "Nest Home",
  brand_id: 1,
  description: "A comfortable chair for thoughtful homes.",
  short_description: "An everyday favourite.",
  price: 6499,
  original_price: 8999,
  images: ["/catalog/chair.jpg"],
  variants: [
    {
      id: 1,
      name: "Natural",
      sku: "NEST-001-0",
      price: 6499,
      stock: 5,
      image: "/catalog/chair.jpg",
      attributes: { Color: "Natural" },
      active: true,
    },
    {
      id: 2,
      name: "Charcoal",
      sku: "NEST-001-1",
      price: 6599,
      stock: 3,
      image: "/catalog/charcoal.jpg",
      attributes: { Color: "Charcoal" },
      active: true,
    },
  ],
  rating: 5,
  review_count: 1,
  stock: 8,
  features: ["Useful"],
  specifications: { Material: "Wood" },
  active: true,
  featured: true,
  seo_title: "",
  seo_description: "",
};
const item = {
  id: 1,
  variant_id: 1,
  product_id: 1,
  name: product.name,
  slug: product.slug,
  variant: "Natural",
  sku: "NEST-001-0",
  price: 6499,
  image: "/catalog/chair.jpg",
  quantity: 1,
  stock: 5,
};
let signedIn = false;
let cart: any[] = [];
let calls: any[] = [];
let failLogin = false;
beforeEach(() => {
  localStorage.clear();
  signedIn = false;
  cart = [];
  calls = [];
  failLogin = false;
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(window, "matchMedia", {
    value: () => ({ matches: true, addListener() {}, removeListener() {} }),
    configurable: true,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init: any = {}) => {
      const path = String(input);
      const body = init.body ? JSON.parse(init.body) : undefined;
      calls.push({ path, method: init.method || "GET", body });
      let result: any = {};
      let ok = true,
        status = 200;
      if (path === "/api/auth/me") result = { user: signedIn ? user : null };
      else if (path === "/api/settings")
        result = {
          store_name: "Nest",
          gst: 18,
          shipping_charge: 79,
          free_shipping_threshold: 1499,
          express_charge: 149,
          cod_enabled: true,
          online_enabled: false,
          email: "hello@example.com",
          phone: "123",
          address: "Pune",
          logo: "",
        };
      else if (path === "/api/categories")
        result = [
          {
            id: 1,
            name: "Home & Living",
            slug: "home-living",
            description: "Home essentials",
            image: "/catalog/chair.jpg",
          },
        ];
      else if (path === "/api/brands") result = [{ id: 1, name: "Nest Home" }];
      else if (path.startsWith("/api/products?"))
        result = { products: [product], total: 1, pages: 1, page: 1 };
      else if (path.endsWith("/reviews")) result = [];
      else if (path === "/api/products/arc-lounge-chair") result = product;
      else if (path === "/api/cart") result = { items: cart };
      else if (path.startsWith("/api/cart/") && init.method === "PUT") {
        cart = cart.map((i) => ({ ...i, quantity: body.quantity }));
        result = { items: cart };
      } else if (path === "/api/wishlist" || path === "/api/addresses")
        result = [];
      else if (path === "/api/auth/login") {
        if (failLogin) {
          ok = false;
          status = 401;
          result = { message: "Email or password is incorrect." };
        } else {
          signedIn = true;
          result = { user };
        }
      } else if (path === "/api/checkout/quote")
        result = {
          subtotal: 6499,
          discount: 0,
          shipping: 0,
          tax: 1169.82,
          total: 7668.82,
          coupon: null,
        };
      else if (path === "/api/orders" && init.method === "POST") {
        cart = [];
        result = { id: 77 };
      } else if (path === "/api/orders/77")
        result = {
          id: 77,
          number: "NEST-TEST-77",
          created_at: new Date().toISOString(),
          expected_delivery: new Date().toISOString(),
          status: "PENDING",
          payment_status: "UNPAID",
          subtotal: 6499,
          discount: 0,
          shipping: 0,
          tax: 1169.82,
          total: 7668.82,
          items: [item],
          delivery: "STANDARD",
          shipping_address: {
            first_name: "Aarav",
            last_name: "Mehta",
            address: "10 Park Road",
            city: "Pune",
            state: "Maharashtra",
            pincode: "411001",
            country: "India",
            email: user.email,
            mobile: user.mobile,
          },
          billing_address: {
            first_name: "Aarav",
            last_name: "Mehta",
            address: "10 Park Road",
            city: "Pune",
            state: "Maharashtra",
            pincode: "411001",
            country: "India",
          },
        };
      else if (path === "/api/orders") result = [];
      return { ok, status, json: async () => result } as Response;
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}
describe("customer shopping flows", () => {
  it("login displays a server error and keeps the form usable", async () => {
    failLogin = true;
    mount("/login");
    const u = userEvent.setup();
    await u.type(
      screen.getByLabelText("Email address"),
      "customer@example.com",
    );
    await u.type(screen.getByLabelText("Password"), "incorrect");
    await u.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Email or password is incorrect.",
    );
    expect(
      calls.some(
        (c) => c.path === "/api/auth/login" && c.body.email === user.email,
      ),
    ).toBe(true);
  });
  it("product listing applies filters and sorting through the REST API", async () => {
    mount("/products");
    expect(await screen.findByText("Arc Lounge Chair")).toBeTruthy();
    const u = userEvent.setup();
    await u.selectOptions(screen.getByLabelText("Sort products"), "price-desc");
    await waitFor(() =>
      expect(calls.some((c) => c.path.includes("sort=price-desc"))).toBe(true),
    );
    await u.click(screen.getByLabelText("In stock only"));
    await waitFor(() =>
      expect(calls.some((c) => c.path.includes("stock=true"))).toBe(true),
    );
  });
  it("variant selection changes price, SKU and image before adding a guest cart item", async () => {
    mount("/products/arc-lounge-chair");
    await screen.findByRole("heading", { name: "Arc Lounge Chair", level: 1 });
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Charcoal" }));
    expect(
      screen.getByText("GST calculated at checkout · SKU NEST-001-1"),
    ).toBeTruthy();
    await u.click(
      screen.getByRole("button", { name: "Add to bag", exact: true }),
    );
    const saved = JSON.parse(localStorage.getItem("nest.guest.cart") || "[]");
    expect(saved[0].variant_id).toBe(2);
    expect(saved[0].price).toBe(6599);
    expect(saved[0].image).toBe("/catalog/charcoal.jpg");
  });
  it("guest cart quantity updates and persists without reloading", async () => {
    localStorage.setItem("nest.guest.cart", JSON.stringify([item]));
    mount("/cart");
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(
      JSON.parse(localStorage.getItem("nest.guest.cart")!)[0].quantity,
    ).toBe(2);
    expect(screen.getByText("2", { selector: ".quantity span" })).toBeTruthy();
  });
  it("checkout validates shipping fields and submits an order using server totals", async () => {
    signedIn = true;
    cart = [item];
    mount("/checkout");
    await screen.findByRole("heading", {
      name: "A better everyday, on its way.",
    });
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: /Place order/ }));
    expect(await screen.findByText("Enter your street address")).toBeTruthy();
    await u.type(screen.getByLabelText("Street address"), "10 Park Road");
    await u.type(screen.getByLabelText("City"), "Pune");
    await u.type(screen.getByLabelText("Pincode"), "411001");
    await u.click(screen.getByRole("button", { name: /Place order/ }));
    await screen.findByRole("heading", {
      name: "Your good finds are on their way.",
    });
    const order = calls.find(
      (c) => c.path === "/api/orders" && c.method === "POST",
    );
    expect(order.body.payment_method).toBe("COD");
    expect(order.body.shipping_address.pincode).toBe("411001");
    expect(order.body.total).toBeUndefined();
  });
});
