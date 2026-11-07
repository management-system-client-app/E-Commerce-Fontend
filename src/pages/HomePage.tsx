import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, DATA_REFRESH_INTERVAL, hydrateImages } from "../api";
import { categoryTiles } from "../components/Chrome";
import { ProductCarousel } from "../components/ProductCard";
import { productFlags } from "../format";
import { useStore } from "../state";
import type { HomeBlock, HomePayload, ProductCardData } from "../types";

const getCountdownParts = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
};

const getTimeUntilDailyReset = (now: number) => {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime() - now;
};

const HOME_CACHE_KEY = "store_home_payload_v2";
const LATEST_PRODUCTS_CACHE_KEY = "store_latest_products";
const DAILY_DEALS_CACHE_KEY = "store_daily_deals";
const BEST_SELLERS_CACHE_KEY = "store_best_sellers";

function isProductList(value: unknown): value is ProductCardData[] {
  return (
    Array.isArray(value) &&
    value.every(
      (product) =>
        typeof product === "object" &&
        product !== null &&
        "id" in product &&
        typeof product.id === "string" &&
        "name" in product &&
        typeof product.name === "string" &&
        "basePrice" in product,
    )
  );
}

function readCachedProducts(key: string): ProductCardData[] {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return isProductList(cached) ? cached : [];
  } catch (reason) {
    console.warn("Cached products could not be read", reason);
    return [];
  }
}

function cacheProducts(key: string, products: ProductCardData[]) {
  try {
    localStorage.setItem(key, JSON.stringify(products));
  } catch (reason) {
    console.warn("Products could not be cached", reason);
  }
}

function readCachedDailyDeals(): ProductCardData[] {
  return readCachedProducts(DAILY_DEALS_CACHE_KEY);
}

function cacheDailyDeals(products: ProductCardData[]) {
  cacheProducts(DAILY_DEALS_CACHE_KEY, products);
}

function readCachedHome(): HomePayload | null {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(HOME_CACHE_KEY) ?? "null");
    if (
      typeof cached === "object" &&
      cached !== null &&
      "banners" in cached &&
      Array.isArray(cached.banners) &&
      "campaigns" in cached &&
      Array.isArray(cached.campaigns) &&
      "newArrivals" in cached &&
      Array.isArray(cached.newArrivals) &&
      "trendingProducts" in cached &&
      Array.isArray(cached.trendingProducts)
    ) {
      return cached as HomePayload;
    }
  } catch (reason) {
    console.warn("Cached home content could not be read", reason);
  }
  return null;
}

function cacheHome(home: HomePayload) {
  try {
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(home));
  } catch (reason) {
    console.warn("Home content could not be cached", reason);
  }
}

function isVideoUrl(value: string | null | undefined) {
  if (!value) return false;
  return /(\.(mp4|webm|mov|m4v|ogv|avi))(\?.*)?$/i.test(value) || /(?:^|\/)(video|mp4|webm|quicktime)/i.test(value);
}

function blockHref(block: HomeBlock) {
  if (block.linkUrl) return block.linkUrl;
  if (block.categoryId) return `/shop?categoryId=${block.categoryId}`;
  return "/shop";
}

function BlockLink({
  block,
  className,
  overlayText,
  href,
  active = true,
  priority = false,
  onImageRatio,
}: {
  block: HomeBlock;
  className?: string;
  overlayText?: string;
  href?: string;
  active?: boolean;
  priority?: boolean;
  onImageRatio?: (ratio: string) => void;
}) {
  const [imageRatio, setImageRatio] = useState<string>();

  return (
    <Link
      className={className}
      to={href ?? blockHref(block)}
      style={imageRatio ? { aspectRatio: imageRatio } : undefined}
    >
      {block.imageUrl ? (
        isVideoUrl(block.imageUrl) ? (
          <video
            src={block.imageUrl}
            autoPlay={active}
            muted
            loop
            playsInline
            preload={active ? "auto" : "none"}
          />
        ) : (
          <>
            <img
              className="image-backdrop"
              src={block.imageUrl}
              alt=""
              aria-hidden="true"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
            />
            <img
              className="banner-image"
              src={block.imageUrl}
              alt={block.title}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth === 0 || naturalHeight === 0) return;
                const ratio = `${naturalWidth} / ${naturalHeight}`;
                setImageRatio(ratio);
                onImageRatio?.(ratio);
              }}
            />
          </>
        )
      ) : (
        <div className="banner-copy">
          <strong>{block.title}</strong>
          {block.subtitle ? <span>{block.subtitle}</span> : null}
        </div>
      )}
      {overlayText ? <span className="collage-label">{overlayText}</span> : null}
    </Link>
  );
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
  const { catalog, categoryImages, settings } = useStore();
  const [initialHome] = useState(readCachedHome);
  const [dailyDeals, setDailyDeals] = useState<ProductCardData[]>(() => {
    const cachedDeals = readCachedDailyDeals();
    if (cachedDeals.length > 0) return cachedDeals;
    return (initialHome?.trendingProducts ?? []).filter((product) => productFlags(product).onSale);
  });
  const dailyDealsRef = useRef(dailyDeals);
  const initialArrival = initialHome?.newArrivals[0];
  const [banners, setBanners] = useState<HomeBlock[]>(initialHome?.banners ?? []);
  const [campaigns, setCampaigns] = useState<HomeBlock[]>(initialHome?.campaigns ?? []);
  const [arrivals, setArrivals] = useState<ProductCardData[]>(initialArrival?.products ?? []);
  const [arrivalHref, setArrivalHref] = useState(
    initialArrival?.categoryId ? `/shop?categoryId=${initialArrival.categoryId}` : "/shop?sort=latest",
  );
  const [selectedTrending, setSelectedTrending] = useState<ProductCardData[]>(initialHome?.trendingProducts ?? []);
  const [latestProducts, setLatestProducts] = useState<ProductCardData[]>(() =>
    readCachedProducts(LATEST_PRODUCTS_CACHE_KEY),
  );
  const homePayloadVersion = useRef(0);
  const [best, setBest] = useState<ProductCardData[]>(() => readCachedProducts(BEST_SELLERS_CACHE_KEY));
  const [slide, setSlide] = useState(0);
  const [activeBannerRatio, setActiveBannerRatio] = useState<string>();
  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilDailyReset(Date.now()));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(initialHome === null);
  const skeletonRef = useRef<HTMLDivElement>(null);
  const [reservedHeight, setReservedHeight] = useState(0);
  const isLoading = loading;

  function updateDailyDeals(products: ProductCardData[]) {
    if (products.length === 0) return;
    const discounted = products.filter((product) => productFlags(product).onSale);
    const nextDeals = discounted.length > 0 ? discounted : dailyDealsRef.current.length === 0 ? products : [];
    if (nextDeals.length === 0) return;
    dailyDealsRef.current = nextDeals;
    setDailyDeals(nextDeals);
    cacheDailyDeals(nextDeals);
  }

  function applyHomePayload(home: HomePayload, isActive: () => boolean = () => true) {
    const version = ++homePayloadVersion.current;
    cacheHome(home);
    setBanners(home.banners);
    setCampaigns(home.campaigns);
    const arrivalBlock = home.newArrivals[0];
    setArrivals(arrivalBlock?.products ?? []);
    setArrivalHref(arrivalBlock?.categoryId ? `/shop?categoryId=${arrivalBlock.categoryId}` : "/shop?sort=latest");
    setSelectedTrending(home.trendingProducts);
    updateDailyDeals(home.trendingProducts);
    void hydrateImages(home.trendingProducts).then(
      (products) => {
        if (isActive() && version === homePayloadVersion.current) {
          setSelectedTrending(products);
          cacheHome({ ...home, trendingProducts: products });
        }
      },
      (reason: unknown) => {
        if (isActive()) setError(reason instanceof Error ? reason.message : "Product images could not be loaded");
      },
    );
  }

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
    api.home()
      .then((home) => {
        if (!active) return;
        applyHomePayload(home, () => active);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Home could not be loaded");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    api.products({ status: "ACTIVE", inStock: true, limit: 20, page: 1, sort: "latest" })
      .then(async (result) => {
        if (!active) return;
        setLatestProducts(result.items);
        cacheProducts(LATEST_PRODUCTS_CACHE_KEY, result.items);
        updateDailyDeals(result.items);
        setLoading(false);
        const products = await hydrateImages(result.items);
        if (active) {
          setLatestProducts(products);
          cacheProducts(LATEST_PRODUCTS_CACHE_KEY, products);
          updateDailyDeals(products);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError((current) =>
            [current, reason instanceof Error ? reason.message : "Products could not be loaded"].filter(Boolean).join(" · "),
          );
        }
      });

    api.bestSellers()
      .then((products) => {
        if (active) {
          setBest(products);
          cacheProducts(BEST_SELLERS_CACHE_KEY, products);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError((current) =>
            [current, reason instanceof Error ? reason.message : "Best sellers could not be loaded"].filter(Boolean).join(" · "),
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    let refreshingProducts = false;
    const refreshHome = () => {
      if (!active || document.visibilityState !== "visible") return;
      if (!refreshing) {
        refreshing = true;
        api.home(true)
          .then((home) => {
            if (!active) return;
            applyHomePayload(home, () => active);
            setError("");
          })
          .catch((reason: unknown) => {
            if (active) setError(reason instanceof Error ? reason.message : "Home could not be refreshed");
          })
          .finally(() => {
            refreshing = false;
          });
      }

      if (!refreshingProducts) {
        refreshingProducts = true;
        Promise.all([
          api.products({ status: "ACTIVE", inStock: true, limit: 20, page: 1, sort: "latest" }, true),
          api.bestSellers(true),
        ])
          .then(async ([result, bestSellers]) => {
            if (!active) return;
          setLatestProducts(result.items);
          cacheProducts(LATEST_PRODUCTS_CACHE_KEY, result.items);
            setBest(bestSellers);
            cacheProducts(BEST_SELLERS_CACHE_KEY, bestSellers);
            updateDailyDeals(result.items);
            const products = await hydrateImages(result.items);
            if (active) {
            setLatestProducts(products);
            cacheProducts(LATEST_PRODUCTS_CACHE_KEY, products);
              updateDailyDeals(products);
            }
          })
          .catch((reason: unknown) => {
            if (active) {
              setError(reason instanceof Error ? reason.message : "Products could not be refreshed");
            }
          })
          .finally(() => {
            refreshingProducts = false;
          });
      }
    };
    const timer = window.setInterval(refreshHome, DATA_REFRESH_INTERVAL);
    window.addEventListener("focus", refreshHome);
    document.addEventListener("visibilitychange", refreshHome);
    window.addEventListener("app:products-changed", refreshHome);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshHome);
      document.removeEventListener("visibilitychange", refreshHome);
      window.removeEventListener("app:products-changed", refreshHome);
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeUntilDailyReset(Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = banners[slide] ?? banners[0];
  const sideBanners = campaigns.slice(0, 3);
  const mosaicLarge = campaigns.slice(3, 5);
  const mosaicSmall = campaigns.slice(5, 9);
  const categoryCollage = [
    { imageUrl: settings.collageManImageUrl, label: "Man", href: "/shop?gender=MEN" },
    { imageUrl: settings.collageWomanImageUrl, label: "Woman", href: "/women" },
    { imageUrl: settings.collageChildImageUrl, label: "Child", href: "/shop?gender=KIDS" },
    { imageUrl: settings.collageAccessoriesImageUrl, label: "Accessories", href: "/shop" },
  ];
  const tiles = categoryTiles(catalog.categories, categoryImages);
  const deals = dailyDeals;
  const collection = arrivals.length > 0 ? arrivals : latestProducts;
  const countdown = getCountdownParts(timeLeft);
  const hasHomeContent = Boolean(
    current || sideBanners.length || mosaicLarge.length || mosaicSmall.length || tiles.length || deals.length || collection.length || best.length || selectedTrending.length,
  );

  return (
    <div className="home" style={!isLoading && !error && hasHomeContent && reservedHeight ? { minHeight: reservedHeight } : undefined}>
      {isLoading ? <div className="home-skeleton-measure" ref={skeletonRef}><HomeSkeleton /></div> : (
        <>
      {error ? <p className="error">{error}</p> : null}
      {current || sideBanners.length > 0 ? (
        <div className="hero-board">
          {current ? (
            <div className="hero-main" style={activeBannerRatio ? { aspectRatio: activeBannerRatio } : undefined}>
              <div className="hero-slides">
                {banners.map((banner, index) => {
                  const active = index === slide;
                  return (
                    <div
                      key={banner.id}
                      className={`hero-slide${active ? " is-active" : ""}`}
                      aria-hidden={!active}
                      inert={!active}
                    >
                      <BlockLink
                        block={banner}
                        active={active}
                        priority={active}
                        onImageRatio={active ? setActiveBannerRatio : undefined}
                      />
                    </div>
                  );
                })}
              </div>
              {banners.length > 1 ? (
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
              ) : null}
            </div>
          ) : null}
          {sideBanners.length > 0 ? (
            <div
              className="hero-side"
              style={{ gridTemplateRows: `repeat(${sideBanners.length}, minmax(0, 1fr))` }}
            >
              {sideBanners.map((campaign) => (
                <BlockLink key={campaign.id} block={campaign} className="hero-wide" />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tiles.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>Popular Categories</h2>
            </div>
            <div className="cat-row">
            {tiles.map(({ category, image }) => (
              <Link key={category.id} to={`/shop?categoryId=${category.id}`} className="cat-tile">
                <div className="cat-photo">
                  {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span>{category.name.slice(0, 1)}</span>}
                </div>
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {deals.length > 0 ? (
        <section className="section deals" id="daily-deals">
          <div className="section-head">
            <div className="deal-header-wrap">
              <h2>Daily Deals</h2>
              <div className="countdown-box" aria-live="polite">
                <span>Ends in</span>
                <div className="countdown-stack">
                  <strong>{String(countdown.hours).padStart(2, "0")}</strong>
                  <small>H</small>
                </div>
                <div className="countdown-stack">
                  <strong>{String(countdown.minutes).padStart(2, "0")}</strong>
                  <small>M</small>
                </div>
                <div className="countdown-stack">
                  <strong>{String(countdown.seconds).padStart(2, "0")}</strong>
                  <small>S</small>
                </div>
              </div>
            </div>
            <Link className="see-more" to="/shop?sort=price_asc">
              See More
            </Link>
          </div>
          <ProductCarousel products={deals} showAvailableStock dealCards />
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

      {categoryCollage.some((item) => item.imageUrl) ? (
        <section className="section collage-wrap">
          <div className="collage-grid">
            {categoryCollage.map((item) => (
              <Link key={item.label} to={item.href} className="collage-card">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.label} loading="lazy" decoding="async" /> : <span className="collage-empty">{item.label}</span>}
                <span className="collage-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {collection.length > 0 ? (
        <section className="section new-collection">
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

      {selectedTrending.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>Trending Now</h2>
            <Link className="see-more" to="/shop">
              See More
            </Link>
          </div>
          <ProductCarousel products={selectedTrending} />
        </section>
      ) : null}
        </>
      )}
    </div>
  );
}
