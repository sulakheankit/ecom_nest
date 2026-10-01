import { useStore } from "../store/Store";
import { ProductCard } from "../components/ProductCard";
import { Empty } from "../components/UI";
import { SEO } from "../components/SEO";
export function Wishlist() {
  const { wishlist } = useStore();
  return (
    <div className="container page">
      <SEO title="Your wishlist" />
      <div className="page-heading">
        <span className="eyebrow">KEEP THE GOOD ONES CLOSE.</span>
        <h1>Your favourites.</h1>
        <p>A little inspiration for your next everyday upgrade.</p>
      </div>
      {wishlist.length ? (
        <div className="product-grid">
          {wishlist.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Room for your next favourite."
          text="Tap the heart on something you love to save it here."
        />
      )}
    </div>
  );
}
