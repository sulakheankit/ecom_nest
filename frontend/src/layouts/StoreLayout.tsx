import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Search,
  UserRound,
  Heart,
  ShoppingBag,
  Menu,
  X,
  Truck,
  ShieldCheck,
  RotateCcw,
  Instagram,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../store/Store";
import { api, send, asset, message } from "../services/api";
import { toast } from "sonner";
import type { Product } from "../types";
export function StoreLayout() {
  const { user, cart, categories, settings } = useStore();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [suggestions, setSuggestions] = useState<Product[]>([]),
    [email, setEmail] = useState(""),
    [recent, setRecent] = useState<string[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("nest.searches") || "[]");
      } catch {
        return [];
      }
    });
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [loc.pathname]);
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(
      () =>
        api("/products?q=" + encodeURIComponent(query) + "&limit=4")
          .then((r) => active && setSuggestions(r.products))
          .catch(() => {}),
      250,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);
  function doSearch(q = query) {
    if (!q.trim()) return;
    const r = [q, ...recent.filter((i) => i !== q)].slice(0, 5);
    localStorage.setItem("nest.searches", JSON.stringify(r));
    setRecent(r);
    setSearch(false);
    navigate("/products?q=" + encodeURIComponent(q));
  }
  return (
    <>
      <div className="announcement">
        <span>
          Good things, delivered. Free shipping over{" "}
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(settings.free_shipping_threshold)}
          .
        </span>
        <Link to="/offers">Discover offers</Link>
      </div>
      <header className="site-header">
        <div className="header-main container">
          <button
            className="icon-button mobile-only"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <Link className="logo" to="/">
            {settings.logo ? (
              <img src={asset(settings.logo)} alt={settings.store_name} />
            ) : (
              <>
                nest<span>✳</span>
              </>
            )}
          </Link>
          <nav className="desktop-nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/products">Shop</NavLink>
            <div className="category-nav">
              <button>
                Categories <ChevronDown size={13} />
              </button>
              <div className="category-dropdown">
                {categories.map((c) => (
                  <Link key={c.id} to={"/category/" + c.slug}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
            <NavLink to="/offers">
              Offers
              <span className="nav-dot" />
            </NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Search products"
              onClick={() => setSearch(!search)}
            >
              <Search />
            </button>
            <Link
              className="icon-button account-icon"
              to={user ? "/account" : "/login"}
              aria-label="Your account"
            >
              <UserRound />
            </Link>
            <Link
              className="icon-button desktop-only"
              to="/wishlist"
              aria-label="Wishlist"
            >
              <Heart />
            </Link>
            <Link
              className="icon-button bag-icon"
              to="/cart"
              aria-label="Shopping bag"
            >
              <ShoppingBag />
              <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </Link>
          </div>
        </div>
        {menu && (
          <nav className="mobile-menu">
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            >
              <X />
            </button>
            {[
              ["Home", "/"],
              ["Shop", "/products"],
              ["Offers", "/offers"],
              ["About", "/about"],
              ["Contact", "/contact"],
              ...categories.map((c) => [c.name, "/category/" + c.slug]),
            ].map(([name, path]) => (
              <Link key={path} to={path}>
                {name}
              </Link>
            ))}
          </nav>
        )}
        {search && (
          <div className="search-panel container">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doSearch();
              }}
            >
              <Search />
              <input
                autoFocus
                placeholder="Search products, brands, categories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search products"
              />
              <button className="btn small">Search</button>
              <button
                className="icon-button"
                type="button"
                aria-label="Close search"
                onClick={() => setSearch(false)}
              >
                <X />
              </button>
            </form>
            {query ? (
              <div className="search-suggestions">
                {suggestions.map((p) => (
                  <Link key={p.id} to={"/products/" + p.slug}>
                    <img src={asset(p.images[0])} alt="" />
                    {p.name}
                    <small>{p.brand}</small>
                  </Link>
                ))}
                {!suggestions.length && (
                  <p>No suggestions. Search to see all results.</p>
                )}
              </div>
            ) : (
              recent.length > 0 && (
                <div className="recent-searches">
                  <span>Recent searches</span>
                  {recent.map((q) => (
                    <button key={q} onClick={() => doSearch(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <section className="benefits container">
        <div>
          <Truck />
          <p>
            <strong>Delivered with care</strong>
            <span>Free shipping above {settings.free_shipping_threshold}</span>
          </p>
        </div>
        <div>
          <RotateCcw />
          <p>
            <strong>Easy returns</strong>
            <span>7 days to find your perfect fit</span>
          </p>
        </div>
        <div>
          <ShieldCheck />
          <p>
            <strong>Quality you can trust</strong>
            <span>Thoughtfully chosen, quality checked</span>
          </p>
        </div>
      </section>
      <footer>
        <div className="footer-main container">
          <div>
            <Link className="logo" to="/">
              nest<span>✳</span>
            </Link>
            <p>
              Little upgrades.
              <br />A better everyday.
            </p>
            <span className="footer-location">Made for life in India.</span>
          </div>
          <div>
            <h3>Explore</h3>
            <Link to="/products">Shop all</Link>
            <Link to="/products?sort=newest">New arrivals</Link>
            <Link to="/offers">Offers</Link>
            <Link to="/about">Our story</Link>
          </div>
          <div>
            <h3>Here to help</h3>
            <Link to="/contact">Contact us</Link>
            <Link to="/shipping">Shipping & returns</Link>
            <Link to="/account">Track your order</Link>
            <Link to="/privacy">Privacy policy</Link>
          </div>
          <div className="newsletter">
            <h3>Good things in your inbox.</h3>
            <p>New finds, fresh inspiration and a little something special.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const r = await send("/newsletter", { email });
                  toast.success(r.message);
                  setEmail("");
                } catch (err) {
                  toast.error(message(err));
                }
              }}
            >
              <input
                type="email"
                required
                placeholder="Your email address"
                aria-label="Newsletter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button>Join the list</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>
            © {new Date().getFullYear()} {settings.store_name}. All rights
            reserved.
          </span>
          <span>Secure checkout · Cash on Delivery</span>
          {user?.role === "ADMIN" && <Link to="/admin">Admin dashboard</Link>}
        </div>
      </footer>
      <nav className="mobile-bottom">
        <NavLink to="/products">
          <Search size={20} />
          Shop
        </NavLink>
        <NavLink to="/wishlist">
          <Heart size={20} />
          Saved
        </NavLink>
        <NavLink to="/cart">
          <ShoppingBag size={20} />
          Bag
        </NavLink>
        <NavLink to={user ? "/account" : "/login"}>
          <UserRound size={20} />
          Account
        </NavLink>
      </nav>
    </>
  );
}
