import { FormEvent, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { RowsSkeleton } from "./Skeleton";
import { money } from "../format";
import { categoryImage, useAuth, useCart, useStore } from "../state";
import type { Category, User } from "../types";

export function UserFace({ user, size = 32, className = "" }: { user: Pick<User, "firstName" | "email" | "avatarUrl">; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };
  if (user.avatarUrl) {
    return <img className={`user-face ${className}`} src={user.avatarUrl} alt="" style={style} />;
  }
  return (
    <span className={`user-face user-face-default ${className}`} style={style} role="img" aria-label="Default user avatar">
      <IconUser size={Math.max(13, Math.round(size * 0.58))} />
    </span>
  );
}

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-8-4.9-8-10.2A4.8 4.8 0 0 1 12 7.7a4.8 4.8 0 0 1 8 3.1C20 16.1 12 21 12 21Z" fill="currentColor" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 3h2l2.4 12.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L21 8H5.1" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.6" fill="currentColor" />
      <circle cx="18" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5V20H4v-8.5Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IconTracking() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7.5" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconUser({ size = 18 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 19.2c1.4-3 3.8-4.4 7-4.4s5.6 1.4 7 4.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function navClass(href: string, isActive: boolean, pathname: string, search: string) {
  const url = new URL(href, "http://local");
  const here = new URLSearchParams(search);
  if (url.search) {
    const want = url.searchParams;
    const matched = pathname === url.pathname && [...want.keys()].every((key) => here.get(key) === want.get(key));
    return matched ? "on" : "";
  }
  if (url.pathname === "/shop") return pathname === "/shop" && here.toString() === "" ? "on" : "";
  return isActive ? "on" : "";
}

function CategoryList({
  categories,
  expandedCategory,
  onToggle,
  onNavigate,
}: {
  categories: Category[];
  expandedCategory: string | null;
  onToggle: (id: string) => void;
  onNavigate: () => void;
}) {
  const roots = categories.filter((category) => !category.parentId);
  return (
    <div className="category-menu-list">
      {roots.map((category) => {
        const children = categories.filter((item) => item.parentId === category.id);
        const expanded = expandedCategory === category.id;
        return (
          <div className="category-menu-group" key={category.id}>
            <div className="category-menu-row">
              <Link to={`/shop?categoryId=${category.id}`} onClick={onNavigate}>
                {category.name}
              </Link>
              {children.length > 0 ? (
                <button
                  type="button"
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`}
                  aria-expanded={expanded}
                  onClick={() => onToggle(category.id)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              ) : null}
            </div>
            {expanded ? (
              <div className="category-menu-children">
                {children.map((child) => (
                  <Link key={child.id} to={`/shop?categoryId=${child.id}`} onClick={onNavigate}>
                    {child.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function Header() {
  const { promo, catalog } = useStore();
  const { user, ready } = useAuth();
  const { cart, setDrawer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/shop?search=${encodeURIComponent(term)}` : "/shop");
    setSearchOpen(false);
  }

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Mens", href: "/shop?gender=MEN" },
    { label: "Womens", href: "/shop?gender=WOMEN" },
    { label: "Kids", href: "/shop?gender=KIDS" },
  ];

  return (
    <>
      <header className={location.pathname === "/" ? "header home-header" : "header"}>
        {promo ? (
          <div className="promo">
            <Link to="/shop">{promo}</Link>
          </div>
        ) : null}
        <div className="header-container">
        <div className="topbar">
          <div className="header-brands">
            <Link to="/" className="logo sara-logo" aria-label="SaRa Lifestyle home">
              <span className="sara-logo-main">SaRa <span className="sara-brand-mark" aria-hidden="true">✿</span></span>
              <span className="sara-logo-sub">LIFESTYLE LTD.</span>
            </Link>
          </div>
          <form onSubmit={onSearch} className={`header-search${searchOpen ? " is-open" : ""}`}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="I'm shopping for ..." aria-label="Search products" />
            <button type="submit" aria-label="Search"><IconSearch /></button>
          </form>
          <div className="header-tools">
            <button
              type="button"
              className="icon-btn mobile-search-toggle"
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <IconSearch />
            </button>
            <Link to="/wishlist" className="icon-btn header-wishlist" aria-label="Wishlist" title="Wishlist">
              <IconHeart />
            </Link>
            <button type="button" className="icon-btn header-cart" aria-label="Cart" onClick={() => setDrawer(true)}>
              <IconBag />
              {cart.summary.itemCount > 0 ? <span className="badge">{cart.summary.itemCount}</span> : null}
            </button>
            {user ? (
              <Link className="account-chip" to={user.accountType === "ADMIN" ? "/admin" : "/account"}>
                <UserFace user={user} />
                <span>{user.accountType === "ADMIN" ? "Dashboard" : user.firstName}</span>
              </Link>
            ) : !ready ? (
              <span className="header-account-pending" aria-label="Checking account status"><IconUser /></span>
            ) : (
              <span className="header-account-guest">
                <span className="header-account-avatar" aria-hidden="true"><IconUser /></span>
                <span className="account-chip account-actions">
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
                </span>
              </span>
            )}
          </div>
        </div>
        <nav
          className="category-nav"
          aria-label="Product categories"
          onMouseLeave={() => {
            if (window.matchMedia("(min-width: 900px)").matches) setMenuOpen(false);
          }}
        >
          <button
            type="button"
            className="cat-btn"
            aria-expanded={menuOpen}
            aria-controls="category-menu-panel"
            onMouseEnter={() => {
              if (window.matchMedia("(min-width: 900px)").matches) setMenuOpen(true);
            }}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <IconGrid />
            <span>Shop by category</span>
          </button>
          <nav className="top-nav" aria-label="Shop">
            {navLinks.map((item) => {
              const active = item.label === "Home"
                ? location.pathname === "/"
                : navClass(item.href, false, location.pathname, location.search);
              return <Link key={item.label} to={item.href} className={`${item.label === "Home" ? "home-link " : ""}${active ? "on" : ""}`} aria-current={active ? "page" : undefined}>{item.label}</Link>;
            })}
          </nav>
          <div className="category-nav-tools">
            <Link to="/track"><IconTracking />Order Tracking</Link>
          </div>
          {menuOpen ? (
            <>
              <button className="sheet-back category-menu-backdrop" aria-label="Close category menu" onClick={() => setMenuOpen(false)} />
              <aside id="category-menu-panel" className="category-menu-panel" role="dialog" aria-label="Shop by category">
                <header className="category-menu-heading">
                  <span><IconGrid /> Shop By Category</span>
                  <button type="button" onClick={() => setMenuOpen(false)}>
                    ×
                  </button>
                </header>
                <div className="category-menu-body">
                  <CategoryList
                    categories={catalog.categories}
                    expandedCategory={expandedCategory}
                    onToggle={(categoryId) =>
                      setExpandedCategory((current) => (current === categoryId ? null : categoryId))
                    }
                    onNavigate={() => setMenuOpen(false)}
                  />
                </div>
              </aside>
            </>
          ) : null}
        </nav>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Mobile">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>
          <IconHome />
          Home
        </NavLink>
        <button type="button" onClick={() => setMenuOpen(true)}>
          <IconGrid />
          Category
        </button>
        <NavLink to="/wishlist" className={({ isActive }) => (isActive ? "on" : "")}>
          <IconHeart />
          Wishlist
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? "on" : "")}>
          <IconBag />
          Cart
        </NavLink>
        <NavLink to={user ? (user.accountType === "ADMIN" ? "/admin" : "/account") : "/login"} className={({ isActive }) => (isActive ? "on" : "")}>
          {user ? <UserFace user={user} size={22} /> : <IconUser />}
          Account
        </NavLink>
      </nav>
      <CartDrawer />
    </>
  );
}

function CartDrawer() {
  const { cart, drawer, setDrawer, remove, setQuantity, busy, loading } = useCart();
  if (!drawer) return null;
  return (
    <>
      <button className="drawer-back" aria-label="Close cart" onClick={() => setDrawer(false)} />
      <aside className="drawer" role="dialog" aria-label="Cart">
        <header>
          Cart
          <button type="button" onClick={() => setDrawer(false)}>
            Close
          </button>
        </header>
        <div className="drawer-body">
          {loading ? <RowsSkeleton rows={3} /> : null}
          {!loading && cart.items.length === 0 ? <p className="empty">Your cart is empty.</p> : null}
          {!loading && cart.items.map((line) => (
            <div className="line" key={line.id}>
              {line.imageUrl ? (
                <img src={line.imageUrl} alt="" />
              ) : (
                <div className="photo-fallback">Photo</div>
              )}
              <div>
                <h3>{line.variant.product.name}</h3>
                <p className="note">
                  {line.variant.size.name}
                  {line.variant.color ? ` / ${line.variant.color.name}` : ""} / {line.variant.fabric.name}
                </p>
                <p>{money(line.lineTotal)}</p>
                <div className="qty">
                  <button type="button" disabled={busy} onClick={() => setQuantity(line, line.quantity - 1)} aria-label="Decrease">
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button type="button" disabled={busy} onClick={() => setQuantity(line, line.quantity + 1)} aria-label="Increase">
                    +
                  </button>
                </div>
                <button type="button" className="note" onClick={() => remove(line.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <footer>
          <div className="sub">
            <span>Subtotal</span>
            <strong>{money(cart.summary.subtotal)}</strong>
          </div>
          <Link to="/cart" className="btn-line wide" style={{ display: "grid", placeItems: "center" }} onClick={() => setDrawer(false)}>
            View cart
          </Link>
          <Link to="/checkout" className="btn wide" style={{ display: "grid", placeItems: "center" }} onClick={() => setDrawer(false)}>
            Checkout
          </Link>
        </footer>
      </aside>
    </>
  );
}

export function Footer() {
  const { settings, settingsReady } = useStore();
  const contactAddress = settings.address || "Avenue #02A, Road #13, House No #1339, Mirpur DOHS, Dhaka-1216, Bangladesh.";
  const contactPhone = settings.supportPhone || "+88-01885-998899";
  const contactEmail = settings.supportEmail || "support@saralifestyle.com";
  const saraSocials = [
    { name: "Facebook", mark: "f", className: "footer-facebook", href: settings.facebookUrl },
    { name: "LinkedIn", mark: "in", className: "footer-linkedin" },
    { name: "YouTube", mark: "▶", className: "footer-youtube" },
    { name: "Instagram", mark: "◎", className: "footer-instagram", href: settings.instagramUrl },
    { name: "TikTok", mark: "♪", className: "footer-tiktok" },
    { name: "X", mark: "X", className: "footer-x" },
  ];
  const dheuSocials = [
    { name: "Facebook", mark: "f", className: "footer-facebook" },
    { name: "YouTube", mark: "▶", className: "footer-youtube" },
    { name: "Instagram", mark: "◎", className: "footer-instagram" },
    { name: "TikTok", mark: "♪", className: "footer-tiktok" },
  ];

  return (
    <footer className="footer">
      <div className="footer-grid">
        <section className="footer-column footer-contact">
          <h3>Contact Us</h3>
          {!settingsReady ? <RowsSkeleton rows={3} /> : (
            <div className="footer-contact-list">
              <p className="footer-contact-item">
                <span className="footer-contact-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path className="footer-pin-shape" d="M10 18s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" /><circle cx="10" cy="8" r="2" /></svg></span>
                <span>{contactAddress}</span>
              </p>
              <a className="footer-contact-item" href={`tel:${contactPhone}`}>
                <span className="footer-contact-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path className="footer-phone-shape" d="M5 2.8 7.5 2l2 4-1.7 1.6a12 12 0 0 0 4.6 4.6L14 10.5l4 2-.8 2.5c-.4 1.2-1.6 2-2.9 1.7C8.8 15.4 4.6 11.2 3.3 5.7 3 4.4 3.8 3.2 5 2.8Z" /></svg></span>
                <span>{contactPhone}</span>
              </a>
              <a className="footer-contact-item" href={`mailto:${contactEmail}`}>
                <span className="footer-contact-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2" /><path d="m3 6 7 5 7-5" /></svg></span>
                <span>{contactEmail}</span>
              </a>
              <div className="footer-business-ids">
                <p>DBID Number: <strong>204425796</strong></p>
                <p>D-U-N-S Number: <strong>731926671</strong></p>
              </div>
            </div>
          )}
        </section>
        <nav className="footer-column" aria-label="Company">
          <h3>Company</h3>
          <Link to="/pages/blogs">Blogs</Link>
          <Link to="/pages/media">Media</Link>
          <Link to="/outlets">Outlets</Link>
          <Link to="/pages/careers">Careers</Link>
          <Link to="/pages/about">About Us</Link>
          <Link to="/pages/contact">Contact Us</Link>
        </nav>
        <nav className="footer-column" aria-label="Customer">
          <h3>Customer</h3>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/shop">Brands</Link>
          <Link to="/shop?sort=price_asc">Best Deals</Link>
          <Link to="/shop">Marketplace</Link>
        </nav>
        <nav className="footer-column" aria-label="Help">
          <h3>Help</h3>
          <Link to="/pages/faqs">FAQs</Link>
          <Link to="/pages/privacy-policy">Privacy Policy</Link>
          <Link to="/pages/cookies-policy">Cookies Policy</Link>
          <Link to="/pages/terms-and-conditions">Terms &amp; Conditions</Link>
          <Link to="/pages/replacement-policy">Replacement Policy</Link>
          <Link to="/pages/emi-terms-and-conditions">EMI Terms &amp; Conditions</Link>
        </nav>
        <section className="footer-column footer-social-column">
          <h3>Social Media for SaRa</h3>
          <div className="footer-socials" aria-label="SaRa social media">
            {saraSocials.map((social) => {
              const className = `footer-social-icon ${social.className}`;
              return social.href
                ? <a key={social.name} className={className} href={social.href} target="_blank" rel="noreferrer" aria-label={social.name}>{social.mark}</a>
                : <span key={social.name} className={className} aria-label={social.name}>{social.mark}</span>;
            })}
          </div>
          <h3 className="footer-dheu-heading">Social Media for DHEU</h3>
          <div className="footer-socials footer-socials-dheu" aria-label="DHEU social media">
            {dheuSocials.map((social) => <span key={social.name} className={`footer-social-icon ${social.className}`} aria-label={social.name}>{social.mark}</span>)}
          </div>
          <h3 className="footer-app-heading">Download App</h3>
          <div className="footer-app-links">
            <a href="https://play.google.com/store" target="_blank" rel="noreferrer" aria-label="Browse apps on Google Play">
              <svg className="footer-play-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#42d392" d="M3 2.8v18.4l10-9.2z" /><path fill="#4ba3ff" d="m3 2.8 12.2 7 3.1-3.1z" /><path fill="#ffcf4a" d="m15.2 10 5.2 3-5.2 3-2.2-4z" /><path fill="#ff6b6b" d="m3 21.2 12.2-7-3.1-3.2z" /></svg>
              <span><small>GET IT ON</small><strong>Google Play</strong></span>
            </a>
            <a href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer" aria-label="Browse apps on the App Store">
              <svg className="footer-apple-mark" viewBox="0 0 20 22" aria-hidden="true"><path fill="currentColor" d="M15.9 11.7c0-2.1 1.7-3.1 1.8-3.2a4 4 0 0 0-3.2-1.7c-1.3-.1-2.5.8-3.2.8s-1.7-.8-2.8-.8a4.2 4.2 0 0 0-3.5 2.1c-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2-.8-2-3.6ZM13.8 5.4a3.9 3.9 0 0 0 .9-2.8 4 4 0 0 0-2.6 1.3 3.7 3.7 0 0 0-.9 2.7 3.4 3.4 0 0 0 2.6-1.2Z" /></svg>
              <span><small>Available on the</small><strong>App Store</strong></span>
            </a>
          </div>
        </section>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} SaRa Lifestyle Ltd. All Rights Reserved
      </div>
    </footer>
  );
}

export function categoryTiles(categories: Category[], images: Map<string, string | null>) {
  const roots = categories.filter((category) => !category.parentId);
  const source = roots.length > 0 ? roots : categories;
  return source.map((category) => ({
    category,
    image: categoryImage(images, category),
  }));
}
