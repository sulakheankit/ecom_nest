import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api, send, message } from "../services/api";
import type {
  User,
  CartItem,
  Product,
  Variant,
  Category,
  Settings,
} from "../types";
import { toast } from "sonner";
const guestKey = "nest.guest.cart";
const defaults: Settings = {
  store_name: "Nest",
  logo: "",
  email: "",
  phone: "",
  address: "",
  gst: 18,
  shipping_charge: 79,
  free_shipping_threshold: 1499,
  express_charge: 149,
  cod_enabled: true,
  online_enabled: false,
};
function readGuest(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(guestKey) || "[]");
  } catch {
    return [];
  }
}
interface Store {
  user: User | null;
  ready: boolean;
  cart: CartItem[];
  wishlist: Product[];
  categories: Category[];
  settings: Settings;
  signIn: (path: string, body: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  add: (p: Product, v?: Variant, q?: number) => Promise<void>;
  quantity: (item: CartItem, q: number) => Promise<void>;
  remove: (item: CartItem) => Promise<void>;
  wish: (p: Product) => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}
const Context = createContext<Store>(null!);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [cart, setCart] = useState<CartItem[]>(readGuest),
    [wishlist, setWishlist] = useState<Product[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [settings, setSettings] = useState(defaults);
  useEffect(() => {
    let live = true;
    Promise.all([
      api("/auth/me").catch(() => ({ user: null })),
      api("/categories").catch(() => []),
      api("/settings").catch(() => defaults),
    ])
      .then(async ([auth, cats, config]) => {
        if (!live) return;
        setUser(auth.user);
        setCategories(cats);
        setSettings(config);
        if (auth.user) {
          const [c, w] = await Promise.all([api("/cart"), api("/wishlist")]);
          if (live) {
            setCart(c.items);
            setWishlist(w);
          }
        }
      })
      .catch((e) => toast.error(message(e)))
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  function guest(items: CartItem[]) {
    setCart(items);
    localStorage.setItem(guestKey, JSON.stringify(items));
  }
  async function refreshCart() {
    if (user) setCart((await api("/cart")).items);
  }
  async function refreshWishlist() {
    if (user) setWishlist(await api("/wishlist"));
  }
  async function signIn(path: string, body: any) {
    const result = await send("/auth/" + path, body);
    setUser(result.user);
    const g = readGuest();
    const c = g.length
      ? await send("/cart/merge", {
          items: g.map((i) => ({
            variant_id: i.variant_id,
            quantity: i.quantity,
          })),
        })
      : await api("/cart");
    setCart(c.items);
    localStorage.removeItem(guestKey);
    setWishlist(await api("/wishlist"));
  }
  async function logout() {
    await send("/auth/logout", {});
    setUser(null);
    setWishlist([]);
    guest([]);
    toast.success("You’re signed out.");
  }
  async function add(
    p: Product,
    v = p.variants.find((v) => v.stock > 0),
    q = 1,
  ) {
    if (!v || !v.stock) throw new Error("This product is out of stock.");
    const existing = cart.find((i) => i.variant_id === v.id);
    if ((existing?.quantity || 0) + q > v.stock)
      throw new Error(`Only ${v.stock} available.`);
    if (user) {
      setCart((await send("/cart", { variant_id: v.id, quantity: q })).items);
    } else {
      guest(
        existing
          ? cart.map((i) =>
              i.variant_id === v.id ? { ...i, quantity: i.quantity + q } : i,
            )
          : [
              ...cart,
              {
                id: v.id,
                variant_id: v.id,
                product_id: p.id,
                name: p.name,
                slug: p.slug,
                variant: v.name,
                sku: v.sku,
                price: Number(v.price),
                image: v.image || p.images[0],
                stock: v.stock,
                quantity: q,
              },
            ],
      );
    }
    toast.success("Added to your bag.");
  }
  async function quantity(item: CartItem, q: number) {
    if (q < 1 || q > Math.min(item.stock, 99))
      throw new Error(
        `Choose a quantity between 1 and ${Math.min(item.stock, 99)}.`,
      );
    if (user)
      setCart((await send("/cart/" + item.id, { quantity: q }, "PUT")).items);
    else guest(cart.map((i) => (i.id === item.id ? { ...i, quantity: q } : i)));
  }
  async function remove(item: CartItem) {
    if (user)
      setCart((await api("/cart/" + item.id, { method: "DELETE" })).items);
    else guest(cart.filter((i) => i.id !== item.id));
  }
  async function wish(p: Product) {
    if (!user) throw new Error("Sign in to save your favourites.");
    if (wishlist.some((i) => i.id === p.id)) {
      await api("/wishlist/" + p.id, { method: "DELETE" });
      toast.success("Removed from wishlist.");
    } else {
      await send("/wishlist", { product_id: p.id });
      toast.success("Saved to wishlist.");
    }
    await refreshWishlist();
  }
  return (
    <Context.Provider
      value={{
        user,
        ready,
        cart,
        wishlist,
        categories,
        settings,
        signIn,
        logout,
        setUser,
        add,
        quantity,
        remove,
        wish,
        refreshCart,
        refreshWishlist,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
