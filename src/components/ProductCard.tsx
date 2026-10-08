import { useRef } from "react";
import { Link } from "react-router-dom";
import { coverImage, money, productFlags } from "../format";
import type { ProductCardData } from "../types";

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = coverImage(product);
  const flags = productFlags(product);
  const discount = flags.compare != null ? Math.round(((flags.compare - flags.price) / flags.compare) * 100) : null;
  return (
    <article className="card">
      <Link to={`/product/${product.id}`}>
        <div className="card-photo">
          {image ? <img src={image} alt={product.name} /> : <div className="photo-fallback" />}
          {flags.isNew || flags.onSale ? (
            <div className="flags">
              {flags.isNew ? <span className="flag">New</span> : null}
              {flags.onSale ? <span className="flag sale-flag">{discount ? `-${discount}%` : "Sale"}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="card-copy">
          {product.brand?.name ? <span className="card-brand">{product.brand.name}</span> : null}
          <h3>{product.name}</h3>
        <p className="price">
          {money(flags.price)}
          {flags.compare != null ? <s>{money(flags.compare)}</s> : null}
        </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductCarousel({ products }: { products: ProductCardData[] }) {
  const row = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="product-carousel">
      <button type="button" className="carousel-arrow prev" aria-label="Previous products" title="Previous products" onClick={() => move(-1)}>‹</button>
      <div className="product-row" ref={row}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      <button type="button" className="carousel-arrow next" aria-label="Next products" title="Next products" onClick={() => move(1)}>›</button>
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
