import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { StoreLayout } from "./layouts/StoreLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { useStore } from "./store/Store";
import { Home } from "./pages/Home";
import { Products } from "./pages/Products";
import { Product } from "./pages/Product";
import { Auth } from "./pages/Auth";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Order } from "./pages/Order";
import { Wishlist } from "./pages/Wishlist";
import { Account } from "./pages/Account";
import { Info } from "./pages/Info";
import { Empty } from "./components/UI";
const AdminDashboard = lazy(() =>
  import("./pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
const AdminProducts = lazy(() =>
  import("./pages/AdminProducts").then((m) => ({ default: m.AdminProducts })),
);
const AdminCollections = lazy(() =>
  import("./pages/AdminCollections").then((m) => ({
    default: m.AdminCollections,
  })),
);
const AdminOrders = lazy(() =>
  import("./pages/AdminOrders").then((m) => ({ default: m.AdminOrders })),
);
const AdminCustomers = lazy(() =>
  import("./pages/AdminCustomers").then((m) => ({ default: m.AdminCustomers })),
);
const AdminReviews = lazy(() =>
  import("./pages/AdminReviews").then((m) => ({ default: m.AdminReviews })),
);
const AdminSettings = lazy(() =>
  import("./pages/AdminSettings").then((m) => ({ default: m.AdminSettings })),
);
function Protected({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, ready } = useStore();
  const loc = useLocation();
  if (!ready)
    return (
      <div className="loading-page" role="status">
        Getting your account ready…
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={"/login?next=" + encodeURIComponent(loc.pathname + loc.search)}
        replace
      />
    );
  if (admin && user.role !== "ADMIN")
    return (
      <div className="container page">
        <h1>Administrator access required.</h1>
        <Link className="btn" to="/account">
          Return to your account
        </Link>
      </div>
    );
  return children;
}
export function App() {
  return (
    <Suspense
      fallback={
        <div className="loading-page" role="status">
          Loading your good finds…
        </div>
      }
    >
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<Product />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="category/:slug" element={<Products />} />
          <Route path="offers" element={<Products offers />} />
          <Route path="cart" element={<Cart />} />
          <Route
            path="checkout"
            element={
              <Protected>
                <Checkout />
              </Protected>
            }
          />
          <Route
            path="order-success/:orderId"
            element={
              <Protected>
                <Order success />
              </Protected>
            }
          />
          <Route
            path="account"
            element={
              <Protected>
                <Account />
              </Protected>
            }
          />
          <Route
            path="account/orders/:orderId"
            element={
              <Protected>
                <Order />
              </Protected>
            }
          />
          <Route
            path="wishlist"
            element={
              <Protected>
                <Wishlist />
              </Protected>
            }
          />
          {(
            ["login", "register", "forgot-password", "reset-password"] as const
          ).map((mode) => (
            <Route key={mode} path={mode} element={<Auth mode={mode} />} />
          ))}
          {(["about", "contact", "shipping", "privacy"] as const).map(
            (page) => (
              <Route key={page} path={page} element={<Info page={page} />} />
            ),
          )}
          <Route
            path="*"
            element={
              <div className="container page">
                <Empty
                  title="This page has wandered off."
                  text="Let’s find you something good instead."
                />
              </div>
            }
          />
        </Route>
        <Route
          path="admin"
          element={
            <Protected admin>
              <AdminLayout />
            </Protected>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route
            path="categories"
            element={<AdminCollections kind="categories" />}
          />
          <Route path="coupons" element={<AdminCollections kind="coupons" />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="reports" element={<AdminDashboard reports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
