import { useState } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  MessageSquare,
  Ticket,
  ChartColumn,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
} from "lucide-react";
import { useStore } from "../store/Store";
import { toast } from "sonner";
import { message } from "../services/api";
export function AdminLayout() {
  const { user, logout } = useStore();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const navigate = useNavigate();
  const links = [
    ["Dashboard", "/admin", LayoutDashboard],
    ["Products", "/admin/products", Package],
    ["Categories", "/admin/categories", Layers],
    ["Orders", "/admin/orders", ShoppingBag],
    ["Customers", "/admin/customers", Users],
    ["Reviews", "/admin/reviews", MessageSquare],
    ["Coupons", "/admin/coupons", Ticket],
    ["Reports", "/admin/reports", ChartColumn],
    ["Settings", "/admin/settings", Settings],
  ] as const;
  return (
    <div className="admin-shell">
      <aside className={"admin-sidebar " + (open ? "open" : "")}>
        <div>
          <Link className="logo" to="/">
            nest<span>✳</span>
          </Link>
          <span className="admin-label">STORE STUDIO</span>
          <button
            className="icon-button mobile-only"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {links.map(([name, path, Icon]) => (
            <NavLink
              end={path === "/admin"}
              key={path}
              to={path}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {name}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">Visit storefront</Link>
          <button
            onClick={() =>
              logout()
                .then(() => navigate("/login"))
                .catch((e) => toast.error(message(e)))
            }
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/admin/products?q=" + encodeURIComponent(search));
            }}
          >
            <Search size={18} />
            <input
              placeholder="Search your products…"
              aria-label="Admin product search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div>
            <Link
              className="icon-button"
              to="/admin/orders"
              aria-label="View order notifications"
            >
              <Bell size={20} />
            </Link>
            <span className="avatar">{user?.name[0]}</span>
            <span className="admin-profile">
              {user?.name}
              <small>Administrator</small>
            </span>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={() => logout().then(() => navigate("/login"))}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
