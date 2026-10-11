import { useRef } from "react";
import { Link } from "react-router-dom";
import { coverImage, money, productFlags } from "../format";
import type { ProductCardData } from "../types";

export function ProductCard({
  product,
  showAvailableStock = false,
  dealCard = false,
}: {
  product: ProductCardData;
  showAvailableStock?: boolean;
  dealCard?: boolean;
}) {
  const image = coverImage(product);
  const flags = productFlags(product);
  const discount = flags.compare != null ? Math.round(((flags.compare - flags.price) / flags.compare) * 100) : null;
  const savings = flags.compare != null ? flags.compare - flags.price : 0;
  const availableStock =
    product.variants?.reduce((total, variant) => total + Math.max(variant.stock - (variant.reserved ?? 0), 0), 0) ?? 0;
  const soldOut = Boolean(product.variants?.length) && availableStock === 0;
  return (
    <article className={dealCard ? "card deal-card" : "card"}>
      <Link to={`/product/${product.id}`}>
        <div className="card-photo">
          {image ? (
            <>
              <img className="image-backdrop" src={image} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              <img className="product-image" src={image} alt={product.name} loading="lazy" decoding="async" />
            </>
          ) : <div className="photo-fallback" />}
          {dealCard && savings > 0 ? <span className="deal-savings">Save {money(savings)} ↓</span> : null}
          {flags.isNew || (!dealCard && flags.onSale) || soldOut ? (
            <div className="flags">
              {soldOut ? <span className="flag sold-out-flag">Sold out</span> : null}
              {flags.isNew ? <span className="flag">New</span> : null}
              {!dealCard && flags.onSale ? <span className="flag sale-flag">{discount ? `-${discount}%` : "Sale"}</span> : null}
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
        {showAvailableStock ? <p className="stock-count">Available: {availableStock}</p> : null}
        </div>
      </Link>
    </article>
  );
}

export function ProductCarousel({
  products,
  showAvailableStock = false,
  dealCards = false,
}: {
  products: ProductCardData[];
  showAvailableStock?: boolean;
  dealCards?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div className="product-carousel">
      <div className="product-row" ref={rowRef}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showAvailableStock={showAvailableStock}
            dealCard={dealCards}
          />
        ))}
      </div>
      {products.length > 1 ? (
        <>
          <button
            type="button"
            className="carousel-arrow prev"
            aria-label="Show previous products"
            onClick={() => rowRef.current?.scrollBy({ left: -rowRef.current.clientWidth, behavior: "smooth" })}
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-arrow next"
            aria-label="Show more products"
            onClick={() => rowRef.current?.scrollBy({ left: rowRef.current.clientWidth, behavior: "smooth" })}
          >
            ›
          </button>
        </>
      ) : null}
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
