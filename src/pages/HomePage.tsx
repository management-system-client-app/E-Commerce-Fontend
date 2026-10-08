import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, hydrateImages } from "../api";
import { categoryTiles } from "../components/Chrome";
import { ProductCarousel } from "../components/ProductCard";
import { useStore } from "../state";
import type { HomeBlock, ProductCardData } from "../types";

function blockHref(block: HomeBlock) {
  if (block.linkUrl) return block.linkUrl;
  if (block.categoryId) return `/shop?categoryId=${block.categoryId}`;
  return "/shop";
}

function HomeSkeleton() {
  return (
    <div className="home-skeleton" aria-hidden="true">
      <div className="skeleton-hero" />
      <section className="skeleton-section">
        <div className="skeleton-heading" />
        <div className="skeleton-categories">
          {Array.from({ length: 6 }, (_, index) => <div className="skeleton-category" key={index} />)}
        </div>
      </section>
      {Array.from({ length: 3 }, (_, row) => (
        <section className="skeleton-section" key={row}>
          <div className="skeleton-heading" />
          <div className="skeleton-products">
            {Array.from({ length: 5 }, (_, index) => <div className="skeleton-product" key={index} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export function HomePage() {
  const { catalog, catalogReady, categoryImages } = useStore();
  const [banners, setBanners] = useState<HomeBlock[]>([]);
  const [campaigns, setCampaigns] = useState<HomeBlock[]>([]);
  const [arrivals, setArrivals] = useState<ProductCardData[]>([]);
  const [arrivalHref, setArrivalHref] = useState("/shop?sort=latest");
  const [trending, setTrending] = useState<ProductCardData[]>([]);
  const [best, setBest] = useState<ProductCardData[]>([]);
  const [slide, setSlide] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const categoryRow = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);
  const [reservedHeight, setReservedHeight] = useState(0);
  const isLoading = loading || !catalogReady;

  useLayoutEffect(() => {
    if (!isLoading || !skeletonRef.current) return;
    const skeleton = skeletonRef.current;
    const measure = () => setReservedHeight(skeleton.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(skeleton);
    return () => observer.disconnect();
  }, [isLoading]);

  useEffect(() => {
    let active = true;
    Promise.all([api.home(), api.products({ status: "ACTIVE", sort: "latest", limit: 8, page: 1 }), api.bestSellers()])
      .then(async ([home, latest, sellers]) => {
        if (!active) return;
        setBanners(home.banners);
        setCampaigns(home.campaigns);
        const arrivalBlock = home.newArrivals[0];
        setArrivals(arrivalBlock?.products ?? []);
        setArrivalHref(arrivalBlock?.categoryId ? `/shop?categoryId=${arrivalBlock.categoryId}` : "/shop?sort=latest");
        setTrending(await hydrateImages(latest.items));
        setBest(sellers);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Home could not be loaded");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const current = banners[slide] ?? banners[0];
  const sideWide = campaigns[0];
  const sidePair = campaigns.slice(1, 3);
  const mosaicLarge = campaigns.slice(3, 5);
  const mosaicSmall = campaigns.slice(5, 9);
  const tiles = categoryTiles(catalog.categories, categoryImages);
  const deals = trending.filter((product) => product.onSale).length > 0 ? trending.filter((product) => product.onSale) : trending;
  const collection = arrivals.length > 0 ? arrivals : trending;
  const hasHomeContent = Boolean(
    current || sideWide || tiles.length || deals.length || mosaicLarge.length || mosaicSmall.length || collection.length || best.length,
  );

  function BlockLink({ block, className }: { block: HomeBlock; className?: string }) {
    return (
      <Link className={className} to={blockHref(block)}>
        {block.imageUrl ? <img src={block.imageUrl} alt={block.title} /> : (
          <div className="banner-copy">
            <strong>{block.title}</strong>
            {block.subtitle ? <span>{block.subtitle}</span> : null}
          </div>
        )}
      </Link>
    );
  }

  function moveCategories(direction: -1 | 1) {
    categoryRow.current?.scrollBy({ left: direction * categoryRow.current.clientWidth * 0.75, behavior: "smooth" });
  }

  return (
    <div className="home" style={!isLoading && !error && hasHomeContent && reservedHeight ? { minHeight: reservedHeight } : undefined}>
      {isLoading ? <div className="home-skeleton-measure" ref={skeletonRef}><HomeSkeleton /></div> : (
        <>
      {error ? <p className="error">{error}</p> : null}
      {current || sideWide ? (
        <div className="hero-board">
          {current ? (
            <div className="hero-main">
              <BlockLink block={current} />
              {banners.length > 1 ? (
                <>
                  <button type="button" className="hero-arrow hero-prev" aria-label="Previous banner" onClick={() => setSlide((slide - 1 + banners.length) % banners.length)}>‹</button>
                  <button type="button" className="hero-arrow hero-next" aria-label="Next banner" onClick={() => setSlide((slide + 1) % banners.length)}>›</button>
                  <div className="dots">
                    {banners.map((banner, index) => (
                      <button
                        key={banner.id}
                        type="button"
                        className={index === slide ? "dot active" : "dot"}
                        aria-label={`Show banner ${index + 1}`}
                        onClick={() => setSlide(index)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          {sideWide || sidePair.length > 0 ? (
            <div className="hero-side">
              {sideWide ? <BlockLink block={sideWide} className="hero-wide" /> : null}
              {sidePair.length > 0 ? (
                <div className="hero-pair">
                  {sidePair.map((block) => (
                    <BlockLink key={block.id} block={block} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {tiles.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>Popular Categories</h2>
            {tiles.length > 5 ? (
              <div className="shelf-controls">
                <button type="button" aria-label="Previous categories" onClick={() => moveCategories(-1)}>‹</button>
                <button type="button" aria-label="Next categories" onClick={() => moveCategories(1)}>›</button>
              </div>
            ) : null}
          </div>
          <div className="cat-row" ref={categoryRow}>
            {tiles.map(({ category, image }) => (
              <Link key={category.id} to={`/shop?categoryId=${category.id}`} className="cat-tile">
                <div className="cat-photo">
                  {image ? <img src={image} alt="" /> : <span>{category.name.slice(0, 1)}</span>}
                </div>
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {deals.length > 0 ? (
        <section className="section deals">
          <div className="section-head">
            <h2>Daily Deals</h2>
            <Link className="see-more" to="/shop?sort=price_asc">
              See More
            </Link>
          </div>
          <ProductCarousel products={deals} />
        </section>
      ) : null}

      {mosaicLarge.length > 0 ? (
        <section className="section mosaic mosaic-2">
          {mosaicLarge.map((block) => (
            <BlockLink key={block.id} block={block} />
          ))}
        </section>
      ) : null}

      {mosaicSmall.length > 0 ? (
        <section className="section mosaic mosaic-4">
          {mosaicSmall.map((block) => (
            <BlockLink key={block.id} block={block} />
          ))}
        </section>
      ) : null}

      {collection.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>New Collection</h2>
            <Link className="see-more" to={arrivalHref}>
              See More
            </Link>
          </div>
          <ProductCarousel products={collection} />
        </section>
      ) : null}

      {best.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>Best Sellers</h2>
            <Link className="see-more" to="/shop">
              See More
            </Link>
          </div>
          <ProductCarousel products={best} />
        </section>
      ) : null}
        </>
      )}
    </div>
  );
}
