import { FormEvent, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Heart, House, LayoutGrid, Mail, MapPin, Menu, Minus, PackageSearch, Phone, Plus, Search, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
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
      <UserRound size={Math.max(13, Math.round(size * 0.58))} strokeWidth={1.7} />
    </span>
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
  onHover,
  onNavigate,
}: {
  categories: Category[];
  expandedCategory: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onNavigate: () => void;
}) {
  const roots = categories.filter((category) => !category.parentId);
  return (
    <div className="category-menu-list">
      {roots.map((category) => {
        const children = categories.filter((item) => item.parentId === category.id);
        const expanded = expandedCategory === category.id;
        return (
          <div
            className="category-menu-group"
            key={category.id}
            onMouseEnter={() => {
              if (window.matchMedia("(min-width: 900px)").matches) onHover(children.length > 0 ? category.id : null);
            }}
          >
            <div className={`category-menu-row${expanded ? " is-expanded" : ""}`}>
              <Link className="category-menu-link" to={`/shop?categoryId=${category.id}`} onClick={onNavigate}>
                <span className="category-menu-thumb">
                  {category.imageUrl ? <img src={category.imageUrl} alt="" loading="lazy" /> : <LayoutGrid size={20} strokeWidth={1.6} />}
                </span>
                <strong>{category.name}</strong>
              </Link>
              {children.length > 0 ? (
                <button
                  type="button"
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`}
                  aria-expanded={expanded}
                  onClick={() => onToggle(category.id)}
                >
                  <ChevronRight size={16} />
                </button>
              ) : <span className="category-menu-arrow" aria-hidden="true"><ChevronRight size={16} /></span>}
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
  const { catalog } = useStore();
  const { user, ready, logout } = useAuth();
  const { cart, setDrawer } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
            <button type="submit" aria-label="Search"><Search size={20} strokeWidth={1.7} /></button>
          </form>
          <div className="header-tools">
            <button
              type="button"
              className="icon-btn mobile-search-toggle"
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search size={20} strokeWidth={1.7} />
            </button>
            <Link to="/wishlist" className="icon-btn header-wishlist" aria-label="Wishlist" title="Wishlist">
              <Heart size={20} strokeWidth={1.7} />
            </Link>
            <button type="button" className="icon-btn header-cart" aria-label="Cart" onClick={() => setDrawer(true)}>
              <ShoppingBag size={20} strokeWidth={1.7} />
              {cart.summary.itemCount > 0 ? <span className="badge">{cart.summary.itemCount}</span> : null}
            </button>
            {user ? (
              <div className="header-account-wrap">
                <div className="account-chip header-account-profile" tabIndex={0} role="group" aria-label="Account options">
                  <UserFace user={user} size={40} />
                  <span className="header-account-profile-copy">
                    <strong>{`${user.firstName} ${user.lastName}`.trim()}</strong>
                    <small>{user.phone || user.email}</small>
                  </span>
                </div>
                <nav className="header-account-dropdown" aria-label="Account menu">
                  <Link to={user.accountType === "ADMIN" ? "/admin" : "/account"}>Dashboard</Link>
                  <Link to={user.accountType === "ADMIN" ? "/admin/orders" : "/account/orders"}>My Orders</Link>
                  <Link to={user.accountType === "ADMIN" ? "/admin/settings" : "/account/profile"}>My Account</Link>
                  <Link to="/track">Order Tracking</Link>
                  <button type="button" onClick={() => { logout().then(() => navigate("/")); }}>Logout</button>
                </nav>
              </div>
            ) : !ready ? (
              <span className="header-account-pending" aria-label="Checking account status"><UserRound size={18} strokeWidth={1.7} /></span>
            ) : (
              <span className="header-account-guest">
                <span className="header-account-avatar" aria-hidden="true"><UserRound size={18} strokeWidth={1.7} /></span>
                <span className="account-chip account-actions">
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
                </span>
              </span>
            )}
          </div>
        </div>
        <nav className="category-nav" aria-label="Product categories">
          <div
            className="category-menu-anchor"
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
            >
              <Menu size={20} strokeWidth={2.8} />
              <span>Shop By Category</span>
            </button>
            {menuOpen ? (
              <>
                <button className="sheet-back category-menu-backdrop" aria-label="Close category menu" onClick={() => setMenuOpen(false)} />
                <aside id="category-menu-panel" className="category-menu-panel" role="dialog" aria-label="All Categories">
                  <header className="category-menu-heading">
                    <div className="category-menu-heading-copy">
                      <span className="category-menu-heading-mark"><LayoutGrid size={19} strokeWidth={1.7} /></span>
                      <span><strong>Shop by category</strong></span>
                    </div>
                    <button type="button" aria-label="Close category menu" onClick={() => setMenuOpen(false)}><X size={19} /></button>
                  </header>
                  <div className="category-menu-body">
                    <div className="category-menu-section-head">
                      <span>Departments</span>
                      <span className="category-menu-count">{catalog.categories.filter((category) => !category.parentId).length}</span>
                    </div>
                    <CategoryList
                      categories={catalog.categories}
                      expandedCategory={expandedCategory}
                      onToggle={(categoryId) =>
                        setExpandedCategory((current) => (current === categoryId ? null : categoryId))
                      }
                      onHover={setExpandedCategory}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </div>
                </aside>
              </>
            ) : null}
          </div>
          <nav className="top-nav" aria-label="Shop">
            {navLinks.map((item) => {
              const active = item.label === "Home"
                ? location.pathname === "/"
                : navClass(item.href, false, location.pathname, location.search);
              return <Link key={item.label} to={item.href} className={`${item.label === "Home" ? "home-link " : ""}${active ? "on" : ""}`} aria-current={active ? "page" : undefined}>{item.label}</Link>;
            })}
          </nav>
          <div className="category-nav-tools">
            <Link to="/track"><PackageSearch size={16} strokeWidth={1.7} />Order Tracking</Link>
          </div>
        </nav>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Mobile">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>
          <House size={18} strokeWidth={1.7} />
          Home
        </NavLink>
        <button
          type="button"
          className={`bottom-nav-category${menuOpen ? " on" : ""}`}
          aria-expanded={menuOpen}
          onClick={() => { setAccountMenuOpen(false); setMenuOpen(true); }}
        >
          <LayoutGrid size={18} strokeWidth={1.7} />
          Category
        </button>
        <NavLink to="/wishlist" className={({ isActive }) => (isActive ? "on" : "")}>
          <Heart size={18} strokeWidth={1.7} />
          Wishlist
        </NavLink>
        <button
          type="button"
          className={location.pathname === "/cart" ? "on" : ""}
          aria-haspopup="dialog"
          onClick={() => { setMenuOpen(false); setAccountMenuOpen(false); setDrawer(true); }}
        >
          <ShoppingBag size={18} strokeWidth={1.7} />
          Cart
        </button>
        <button
          type="button"
          className={accountMenuOpen || location.pathname.startsWith("/account") || location.pathname === "/login" || location.pathname === "/register" ? "on" : ""}
          aria-expanded={accountMenuOpen}
          aria-controls="account-menu-panel"
          onClick={() => { setMenuOpen(false); setAccountMenuOpen((open) => !open); }}
        >
          {user ? <UserFace user={user} size={18} /> : <UserRound size={18} strokeWidth={1.7} />}
          Account
        </button>
      </nav>
      {accountMenuOpen ? (
        <>
          <button className="sheet-back account-menu-backdrop" aria-label="Close account menu" onClick={() => setAccountMenuOpen(false)} />
          <aside id="account-menu-panel" className="account-menu-panel" role="dialog" aria-modal="true" aria-label="My Account">
            <header className="category-menu-heading account-menu-heading">
              <div className="category-menu-heading-copy">
                <span className="category-menu-heading-mark"><UserRound size={19} strokeWidth={1.7} /></span>
                <span><strong>My Account</strong></span>
              </div>
              <button type="button" aria-label="Close account menu" onClick={() => setAccountMenuOpen(false)}><X size={19} /></button>
            </header>
            <div className="account-menu-profile">
              {user ? <UserFace user={user} size={48} /> : <span className="account-menu-avatar"><UserRound size={24} strokeWidth={1.5} /></span>}
              <span className="account-menu-profile-copy">
                <strong>{user ? user.firstName : "User Account"}</strong>
                <small>{user ? user.email : "Sign in or create an account"}</small>
              </span>
            </div>
            <nav className="account-menu-links" aria-label="Account links">
              {user ? (
                user.accountType === "ADMIN" ? (
                  <Link to="/admin" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><LayoutGrid size={17} /></span><span>Dashboard</span><ArrowRight size={16} /></Link>
                ) : (
                  <>
                    <Link to="/account/profile" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><UserRound size={17} /></span><span>Profile</span><ArrowRight size={16} /></Link>
                    <Link to="/account/orders" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><PackageSearch size={17} /></span><span>Orders</span><ArrowRight size={16} /></Link>
                    <Link to="/account/wishlist" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><Heart size={17} /></span><span>Wishlist</span><ArrowRight size={16} /></Link>
                  </>
                )
              ) : (
                <>
                  <Link to="/login" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><UserRound size={17} /></span><span>Login</span><ArrowRight size={16} /></Link>
                  <Link to="/register" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><Mail size={17} /></span><span>Register</span><ArrowRight size={16} /></Link>
                </>
              )}
              <Link to="/track" onClick={() => setAccountMenuOpen(false)}><span className="account-menu-link-icon"><PackageSearch size={17} /></span><span>Order Tracking</span><ArrowRight size={16} /></Link>
            </nav>
          </aside>
        </>
      ) : null}
      <CartDrawer />
    </>
  );
}

function CartDrawer() {
  const { cart, drawer, setDrawer, remove, setQuantity, busy, loading } = useCart();
  if (!drawer) return null;
  return (
    <>
      <button className="drawer-back cart-drawer-back" aria-label="Close cart" onClick={() => setDrawer(false)} />
      <aside className="drawer cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <header className="category-menu-heading cart-drawer-header">
          <div className="category-menu-heading-copy cart-drawer-title">
            <span className="category-menu-heading-mark cart-drawer-mark"><ShoppingBag size={21} strokeWidth={1.8} /></span>
            <span><strong>Your Bag</strong><small>{cart.summary.itemCount} {cart.summary.itemCount === 1 ? "item" : "items"}</small></span>
          </div>
          <button type="button" className="cart-drawer-close" aria-label="Close cart" onClick={() => setDrawer(false)}>
            <X size={20} />
          </button>
        </header>
        <div className="drawer-body cart-drawer-body">
          {loading ? <RowsSkeleton rows={3} /> : null}
          {!loading && cart.items.length === 0 ? (
            <div className="cart-empty-state">
              <span><ShoppingBag size={30} strokeWidth={1.5} /></span>
              <strong>Your bag is waiting</strong>
              <p>Find something you love and it will appear here.</p>
              <Link to="/shop" onClick={() => setDrawer(false)}>Explore the store <ArrowRight size={15} /></Link>
            </div>
          ) : null}
          {!loading && cart.items.map((line) => (
            <article className="cart-line" key={line.id}>
              <div className="cart-line-image">
                {line.imageUrl ? <img src={line.imageUrl} alt="" /> : <ShoppingBag size={24} strokeWidth={1.5} />}
              </div>
              <div className="cart-line-details">
                <div className="cart-line-heading">
                  <h3>{line.variant.product.name}</h3>
                  <button type="button" className="cart-remove" disabled={busy} onClick={() => remove(line.id)} aria-label={`Remove ${line.variant.product.name}`} title="Remove item">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="cart-line-meta">
                  {line.variant.size.name}
                  {line.variant.color ? ` / ${line.variant.color.name}` : ""} / {line.variant.fabric.name}
                </p>
                <div className="cart-line-bottom">
                  <div className="cart-quantity-controls">
                  <button type="button" disabled={busy} onClick={() => setQuantity(line, line.quantity - 1)} aria-label="Decrease">
                    <Minus size={14} />
                  </button>
                  <span>{line.quantity}</span>
                  <button type="button" disabled={busy} onClick={() => setQuantity(line, line.quantity + 1)} aria-label="Increase">
                    <Plus size={14} />
                  </button>
                  </div>
                  <strong className="cart-line-price">{money(line.lineTotal)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
        {cart.items.length > 0 ? <footer className="cart-drawer-footer">
          <div className="cart-subtotal">
            <span>Subtotal</span>
            <strong>{money(cart.summary.subtotal)}</strong>
          </div>
          <Link to="/checkout" className="cart-checkout" onClick={() => setDrawer(false)}>
            Checkout <ArrowRight size={17} />
          </Link>
          <Link to="/cart" className="cart-view-link" onClick={() => setDrawer(false)}>
            View full cart
          </Link>
        </footer> : null}
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
                <span className="footer-contact-icon" aria-hidden="true"><MapPin size={12} strokeWidth={1.7} /></span>
                <span>{contactAddress}</span>
              </p>
              <a className="footer-contact-item" href={`tel:${contactPhone}`}>
                <span className="footer-contact-icon" aria-hidden="true"><Phone size={12} strokeWidth={1.7} /></span>
                <span>{contactPhone}</span>
              </a>
              <a className="footer-contact-item" href={`mailto:${contactEmail}`}>
                <span className="footer-contact-icon" aria-hidden="true"><Mail size={12} strokeWidth={1.7} /></span>
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
        © {new Date().getFullYear()} Mahi's Creation. All Rights Reserved
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
