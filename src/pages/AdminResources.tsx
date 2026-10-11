import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, api } from "../api";
import { RowsSkeleton } from "../components/Skeleton";
import { titleCaseStatus } from "../format";
import { useAuth, useStore } from "../state";
import type { Catalog, Category, CmsPage, Color, Coupon, DeliveryZone, ManualPayment, Outlet, Promotion, Settings, SizeGuide, StoreReturn, Subscriber, VariantRow } from "../types";

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2ec9a8]";

function messageOf(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiError)) return fallback;
  const detail = reason.errors?.[0]?.message;
  return detail ? `${reason.message}. ${detail}` : reason.message;
}

function later(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function Panel({ title, error, children }: { title: string; error: string; children: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {children}
      {error ? <p className="text-sm text-rose-700 lg:col-span-2">{error}</p> : null}
      <span className="sr-only">{title}</span>
    </div>
  );
}

export function AdminCoupons() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [type, setType] = useState("PERCENTAGE");
  const [value, setValue] = useState("10");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.coupons().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load coupons"))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = editing
        ? { type, value: Number(value) }
        : { code, type, value: Number(value), startsAt: new Date().toISOString(), endsAt: later(30) };
      await api.saveCoupon(body, editing ?? undefined);
      setEditing(null);
      setCode("");
      load();
    } catch (reason) {
      setError(messageOf(reason, "Could not save the coupon"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Coupons" error={error}>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">{editing ? "Edit coupon" : "Add coupon"}</h2>
        {editing ? null : (
          <input className={field} required minLength={3} placeholder="Code" value={code} onChange={(event) => setCode(event.target.value)} />
        )}
        <select className={field} value={type} onChange={(event) => setType(event.target.value)}>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_AMOUNT">Fixed amount</option>
        </select>
        <input className={field} required inputMode="decimal" placeholder="Value" value={value} onChange={(event) => setValue(event.target.value)} />
        <button disabled={busy} className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">{busy ? "Saving…" : "Save"}</button>
      </form>
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: `${item.code} · ${item.type} ${item.value}` }))}
        onEdit={async (id) => {
          const item = await api.coupon(id);
          setEditing(item.id);
          setType(item.type);
          setValue(String(item.value));
        }}
        onDelete={async (id) => {
          await api.deleteCoupon(id);
          load();
        }}
      />
    </Panel>
  );
}

export function AdminPromotions() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("PERCENTAGE");
  const [value, setValue] = useState("10");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.adminPromotions().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load promotions"))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.savePromotion({ name, type, value: Number(value), startsAt: new Date().toISOString(), endsAt: later(30) });
      setName("");
      load();
    } catch (reason) {
      setError(messageOf(reason, "Could not save the promotion"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Promotions" error={error}>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Add promotion</h2>
        <input className={field} required minLength={2} placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <select className={field} value={type} onChange={(event) => setType(event.target.value)}>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_AMOUNT">Fixed amount</option>
        </select>
        <input className={field} required inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
        <button disabled={busy} className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">{busy ? "Saving…" : "Add"}</button>
      </form>
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: item.name }))}
        onDelete={async (id) => {
          await api.deletePromotion(id);
          load();
        }}
        onEdit={async (id) => {
          const item = items.find((row) => row.id === id);
          if (!item) return;
          await api.savePromotion({ isActive: item.isActive === false }, id);
          load();
        }}
      />
    </Panel>
  );
}

export function AdminCatalogExtras() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [fabric, setFabric] = useState("");
  const [composition, setComposition] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.catalog(), api.brands(), api.sizes(), api.fabrics()])
      .then(([catalog, brands, sizes, fabrics]) => setCatalog({ ...catalog, brands, sizes, fabrics }))
      .catch((reason) => setError(messageOf(reason, "Could not load catalog")))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {error ? <p className="text-sm text-rose-700 lg:col-span-3">{error}</p> : null}
      <MiniCreate
        title="Brand"
        value={brand}
        setValue={setBrand}
        onSave={() =>
          api.createBrand({ name: brand.trim() }).then((created) => {
            setCatalog((current) => current && { ...current, brands: [...current.brands, created] });
          })
        }
        rows={(catalog?.brands ?? []).map((item) => item.name)}
        loading={loading}
        isDuplicate={(value) =>
          (catalog?.brands ?? []).some(
            (item) => item.name.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
          )
        }
      />
      <MiniCreate
        title="Size"
        value={size}
        setValue={setSize}
        onSave={() =>
          api.createSize({ name: size.trim() }).then((created) => {
            setCatalog((current) => current && { ...current, sizes: [...current.sizes, created] });
          })
        }
        rows={(catalog?.sizes ?? []).map((item) => item.name)}
        loading={loading}
        options={["Free Size", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]}
        isDuplicate={(value) =>
          (catalog?.sizes ?? []).some(
            (item) => item.name.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
          )
        }
      />
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const normalizedFabric = fabric.trim().toLocaleLowerCase();
          const duplicateFabric = (catalog?.fabrics ?? []).some(
            (item) => item.name.trim().toLocaleLowerCase() === normalizedFabric,
          );
          if (duplicateFabric) {
            setError("Fabric already exists");
            return;
          }
          setError("");
          api.createFabric({ name: fabric.trim(), composition: composition.trim() || null }).then((created) => {
            setCatalog((current) => current && { ...current, fabrics: [...current.fabrics, created] });
            setFabric("");
            setComposition("");
          }).catch((reason) => setError(messageOf(reason, "Could not add the fabric")));
        }}
      >
        <h2 className="text-sm font-semibold">Fabric</h2>
        <input className={field} required placeholder="Name" value={fabric} onChange={(event) => setFabric(event.target.value)} />
        <input className={field} placeholder="Composition" value={composition} onChange={(event) => setComposition(event.target.value)} />
        {(catalog?.fabrics ?? []).some(
          (item) => item.name.trim().toLocaleLowerCase() === fabric.trim().toLocaleLowerCase() && fabric.trim() !== "",
        ) ? <p className="text-sm text-amber-700">Fabric already exists.</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          disabled={loading || (catalog?.fabrics ?? []).some(
            (item) => item.name.trim().toLocaleLowerCase() === fabric.trim().toLocaleLowerCase() && fabric.trim() !== "",
          )}
          className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
        {loading ? (
          <RowsSkeleton rows={3} />
        ) : (
          <details className="rounded-xl border border-slate-200 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Existing fabrics ({catalog?.fabrics.length ?? 0})
            </summary>
            {(catalog?.fabrics.length ?? 0) > 0 ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-slate-100 pt-2 text-sm text-slate-600">
                {catalog?.fabrics.map((item) => <li key={item.id}>{item.name}</li>)}
              </ul>
            ) : (
              <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-500">
                No fabrics added yet.
              </p>
            )}
          </details>
        )}
      </form>
    </div>
  );
}

export function AdminColors() {
  const [colors, setColors] = useState<Color[]>([]);
  const [name, setName] = useState("");
  const [hexCode, setHexCode] = useState("#0000FF");
  const [error, setError] = useState("");
  const [permissionRequired, setPermissionRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.colorList()
      .then((result) => {
        if (active) setColors(result);
      })
      .catch((reason) => {
        if (active) setError(messageOf(reason, "Could not load colors"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const duplicate = colors.some(
    (color) => color.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setPermissionRequired(false);
          if (duplicate) {
            setError("A color with this name already exists.");
            return;
          }
          setSaving(true);
          try {
            const created = await api.createColor({ name: name.trim(), hexCode });
            setColors((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
            setName("");
          } catch (reason) {
            setPermissionRequired(reason instanceof ApiError && reason.status === 403);
            setError(messageOf(reason, "Could not add color"));
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="text-sm font-semibold">Add color</h2>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Color name</span>
          <input
            className={field}
            required
            minLength={2}
            maxLength={120}
            placeholder="Blue"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Choose color</span>
          <input
            className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
            type="color"
            value={hexCode}
            aria-label="Choose color swatch"
            onChange={(event) => setHexCode(event.target.value.toUpperCase())}
          />
        </label>
        {duplicate ? <p className="text-sm text-amber-700">A color with this name already exists.</p> : null}
        {error ? (
          permissionRequired ? (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950" role="alert">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-base" aria-hidden="true">🔒</span>
              <div>
                <p className="text-sm font-semibold">Admin access required</p>
                <p className="mt-0.5 text-xs leading-relaxed">Sign in with an admin account to add colors. If you already have admin access, sign out and sign in again.</p>
              </div>
            </div>
          ) : <p className="text-sm text-rose-700" role="alert">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading || saving || duplicate}
          className="rounded-xl bg-[#7b3f55] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add color"}
        </button>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Colors</h2>
        {loading ? <RowsSkeleton rows={4} /> : colors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No colors added yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {colors.map((color) => (
              <li key={color.id} className="flex items-center gap-3 py-3 text-sm">
                <span
                  className="h-7 w-7 shrink-0 rounded-full border border-slate-200"
                  style={{ backgroundColor: color.hexCode }}
                  aria-label={`${color.name} swatch`}
                />
                <span className="font-medium text-slate-700">{color.name}</span>
                <span className="ml-auto text-xs text-slate-500">{color.hexCode}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MiniCreate({
  title,
  value,
  setValue,
  onSave,
  rows,
  loading = false,
  options,
  isDuplicate,
}: {
  title: string;
  value: string;
  setValue: (value: string) => void;
  onSave: () => Promise<unknown>;
  rows: string[];
  loading?: boolean;
  options?: string[];
  isDuplicate?: (value: string) => boolean;
}) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const duplicate = isDuplicate?.(value) ?? false;
  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submittingRef.current) return;
        setError("");
        if (duplicate) {
          setError(`${title} already exists`);
          return;
        }
        submittingRef.current = true;
        setSubmitting(true);
        try {
          await onSave();
          setValue("");
        } catch (reason) {
          setError(messageOf(reason, "Could not save"));
        } finally {
          submittingRef.current = false;
          setSubmitting(false);
        }
      }}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      {options ? (
        <select className={field} required value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">Choose size</option>
          {options.map((option) => (
            <option key={option} value={option} disabled={isDuplicate?.(option)}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input className={field} required placeholder="Name" value={value} onChange={(event) => setValue(event.target.value)} />
      )}
      {duplicate ? <p className="text-sm text-amber-700">{title} already exists.</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button disabled={duplicate || loading || submitting} className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Add</button>
      {loading ? (
        <RowsSkeleton rows={3} />
      ) : (
        <details className="rounded-xl border border-slate-200 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            {title === "Size" && rows.length > 0
              ? rows.join("  ")
              : `Existing ${title.toLowerCase()}s (${rows.length})`}
          </summary>
          {rows.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-slate-100 pt-2 text-sm text-slate-600">
              {rows.map((row, index) => <li key={`${row}-${index}`}>{row}</li>)}
            </ul>
          ) : (
            <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-500">
              No {title.toLowerCase()}s added yet.
            </p>
          )}
        </details>
      )}
    </form>
  );
}

export function AdminOutlets() {
  const [items, setItems] = useState<Outlet[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "", hours: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.outlets().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load outlets"))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.saveOutlet({ ...form, hours: form.hours || null }, editing ?? undefined);
      setEditing(null);
      setForm({ name: "", address: "", city: "", phone: "", hours: "" });
      load();
    } catch (reason) {
      setError(messageOf(reason, "Could not save the outlet"));
    }
  }

  return (
    <Panel title="Outlets" error={error}>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">{editing ? "Edit outlet" : "Add outlet"}</h2>
        {(["name", "address", "city", "phone", "hours"] as const).map((key) => (
          <input key={key} className={field} required={key !== "hours"} placeholder={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        ))}
        <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Save</button>
      </form>
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: `${item.name} · ${item.city}` }))}
        onEdit={async (id) => {
          const item = await api.outlet(id);
          setEditing(item.id);
          setForm({ name: item.name, address: item.address, city: item.city, phone: item.phone, hours: item.hours ?? "" });
        }}
        onDelete={async (id) => {
          await api.deleteOutlet(id);
          load();
        }}
      />
    </Panel>
  );
}

export function AdminPages() {
  const [items, setItems] = useState<CmsPage[]>([]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.managePages().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load pages"))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <Panel title="Pages" error={error}>
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          api.savePage(slug, { title, body }).then(() => {
            setSlug("");
            setTitle("");
            setBody("");
            load();
          }).catch((reason) => setError(messageOf(reason, "Could not save the page")));
        }}
      >
        <h2 className="text-sm font-semibold">Page</h2>
        <input className={field} required placeholder="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
        <input className={field} required placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <textarea className={`${field} h-28 py-2`} required placeholder="Body" value={body} onChange={(event) => setBody(event.target.value)} />
        <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Save</button>
      </form>
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.slug, label: item.title }))}
        onEdit={(slugKey) => {
          const item = items.find((page) => page.slug === slugKey);
          if (!item) return Promise.resolve();
          setSlug(item.slug);
          setTitle(item.title);
          setBody(item.body ?? "");
          return api.page(slugKey).then((page) => setBody(page.body ?? ""));
        }}
        onDelete={async (slugKey) => {
          await api.deletePage(slugKey);
          load();
        }}
      />
    </Panel>
  );
}

export function AdminDelivery() {
  const [items, setItems] = useState<DeliveryZone[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [fee, setFee] = useState("60");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.zones().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load zones"))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <Panel title="Delivery" error={error}>
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          api.saveZone({ name, city: city || null, fee: Number(fee) }, editing ?? undefined).then(() => {
            setEditing(null);
            setName("");
            setCity("");
            load();
          }).catch((reason) => setError(messageOf(reason, "Could not save the zone")));
        }}
      >
        <h2 className="text-sm font-semibold">{editing ? "Edit zone" : "Add zone"}</h2>
        <input className={field} required placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <input className={field} placeholder="City" value={city} onChange={(event) => setCity(event.target.value)} />
        <input className={field} required inputMode="decimal" placeholder="Fee" value={fee} onChange={(event) => setFee(event.target.value)} />
        <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Save</button>
      </form>
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: `${item.name} · ${item.city ?? "All"} · ${item.fee}` }))}
        onEdit={async (id) => {
          const item = await api.zone(id);
          setEditing(item.id);
          setName(item.name);
          setCity(item.city ?? "");
          setFee(String(item.fee));
        }}
        onDelete={async (id) => {
          await api.deleteZone(id);
          load();
        }}
      />
    </Panel>
  );
}

export function AdminNewsletter() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api.subscribers().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load subscribers"))).finally(() => setLoading(false));
  }
  useEffect(load, []);
  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: item.email }))}
        onDelete={async (id) => {
          await api.deleteSubscriber(id);
          load();
        }}
      />
    </div>
  );
}

export function AdminSettings() {
  const { user, updateProfile, saveAvatar } = useAuth();
  const { settings, settingsReady } = useStore();
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordNote, setPasswordNote] = useState("");
  const [form, setForm] = useState<Settings>(settings);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => setForm(settings), [settings]);

  if (!settingsReady) return <RowsSkeleton rows={8} />;

  return (
    <div className="grid gap-5">
    <form
      className="max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setNote("");
        api.updateSettings(form).then(() => setNote("Saved")).catch((reason) => setError(messageOf(reason, "Could not save settings")));
      }}
    >
      <h2 className="text-sm font-semibold">Store settings</h2>
      {(["storeName", "supportEmail", "supportPhone", "address", "facebookUrl", "instagramUrl", "bkashNumber", "nagadNumber", "rocketNumber"] as const).map((key) => (
        <label key={key} className="block text-xs text-slate-500">
          {key === "bkashNumber" ? "bKash Personal account number" : key === "nagadNumber" ? "Nagad account number" : key === "rocketNumber" ? "Rocket account number" : key}
          <input className={`${field} mt-1`} value={form[key] ?? ""} onChange={(event) => setForm({ ...form, [key]: key === "storeName" ? event.target.value : event.target.value || null })} />
        </label>
      ))}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {note ? <p className="text-sm text-emerald-700">{note}</p> : null}
      <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Save</button>
    </form>
    <form
      className="max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setPasswordNote("");
        updateProfile(password)
          .then(() => {
            setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordNote("Password changed");
          })
          .catch((reason) => setPasswordNote(messageOf(reason, "Could not change the password")));
      }}
    >
      <h2 className="text-sm font-semibold">Profile photo</h2>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover bg-slate-200" /> : null}
      {user && !user.avatarUrl ? <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ff9f1a] text-lg font-bold text-slate-900">{user.firstName.slice(0, 1)}</span> : null}
      <label className="block text-xs text-slate-500">
        Photo
        <input
          type="file"
          accept="image/avif,image/jpeg,image/png,image/webp"
          className={`${field} mt-1`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setPasswordNote("");
            saveAvatar(file).then(() => setPasswordNote("Photo saved")).catch((reason) => setPasswordNote(messageOf(reason, "Could not save the photo")));
          }}
        />
      </label>
      <h2 className="text-sm font-semibold">Change password</h2>
      <label className="block text-xs text-slate-500">
        Current password
        <input type="password" required className={`${field} mt-1`} value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
      </label>
      <label className="block text-xs text-slate-500">
        New password
        <input type="password" required minLength={8} className={`${field} mt-1`} value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
      </label>
      <label className="block text-xs text-slate-500">
        Confirm password
        <input type="password" required className={`${field} mt-1`} value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} />
      </label>
      {passwordNote ? <p className="text-sm text-slate-600">{passwordNote}</p> : null}
      <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Change password</button>
    </form>
    </div>
  );
}

export function AdminReturns() {
  const [items, setItems] = useState<StoreReturn[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api.returns().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load returns"))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <label className="block text-xs text-slate-500">
        Note for the next decision
        <input className={`${field} mt-1`} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {loading ? <RowsSkeleton rows={3} /> : null}
      {!loading && items.length === 0 && !error ? <p className="text-sm text-slate-500">No return requests yet.</p> : null}
      <div className="space-y-3">
        {!loading && items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.order?.orderNumber ?? item.returnNumber} · {titleCaseStatus(item.status)}</p>
                <p className="text-sm text-slate-500">{item.user ? `${item.user.firstName} ${item.user.lastName} · ${item.user.email}` : "Customer"}</p>
                <p className="mt-1 text-sm">{titleCaseStatus(item.reason)}{item.note ? ` — ${item.note}` : ""}</p>
                <ul className="mt-2 text-sm text-slate-600">
                  {(item.items ?? []).map((line) => (
                    <li key={line.id}>{line.orderItem?.productName ?? "Item"} × {line.quantity}</li>
                  ))}
                </ul>
              </div>
              {item.status === "REQUESTED" ? (
                <div className="flex gap-2">
                  <button type="button" className="rounded-xl bg-[#2ec9a8] px-3 py-2 text-sm font-semibold text-white" onClick={() => api.reviewReturn(item.id, { decision: "APPROVED", ...(note ? { adminNote: note } : {}) }).then(load).catch((reason) => setError(messageOf(reason, "Could not approve")))}>Approve</button>
                  <button type="button" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" onClick={() => api.reviewReturn(item.id, { decision: "REJECTED", ...(note ? { adminNote: note } : {}) }).then(load).catch((reason) => setError(messageOf(reason, "Could not reject")))}>Reject</button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AdminPayments() {
  const [items, setItems] = useState<ManualPayment[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api.manualPayments().then(setItems).catch((err) => setError(messageOf(err, "Could not load payments"))).finally(() => setLoading(false));
  }
  useEffect(load, []);
  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <input className={field} placeholder="Reject reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: `${item.order?.orderNumber ?? item.provider} · ${item.transactionId ?? ""} · ${item.amount}` }))}
        onEdit={async (id) => {
          await api.approvePayment(id);
          load();
        }}
        onDelete={async (id) => {
          await api.rejectPayment(id, reason || "Rejected");
          load();
        }}
      />
    </div>
  );
}

export function AdminSizeGuides() {
  const [items, setItems] = useState<SizeGuide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api.adminSizeGuides().then(setItems).catch((reason) => setError(messageOf(reason, "Could not load size guides"))).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    api.adminCategories().then(setCategories).catch(() => setCategories([]));
  }, []);
  return (
    <Panel title="Size guides" error={error}>
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          api.saveSizeGuide({
            categoryId,
            title,
            columns: ["Size", "Bust (in)", "Waist (in)", "Length (in)"],
            rows: [
              ["XS", "32", "26", "42"],
              ["S", "34", "28", "44"],
              ["M", "36", "30", "46"],
              ["L", "38", "32", "48"],
              ["XL", "40", "34", "50"],
            ],
          }).then(() => {
            setTitle("");
            load();
          }).catch((reason) => setError(messageOf(reason, "Could not save the size guide")));
        }}
      >
        <h2 className="text-sm font-semibold">Size guide</h2>
        <select className={field} required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input className={field} required placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: item.title }))}
        onEdit={async (id) => {
          await api.sizeGuide(id);
        }}
        onDelete={async (id) => {
          await api.deleteSizeGuide(id);
          load();
        }}
      />
    </Panel>
  );
}

export function AdminVariants() {
  const [items, setItems] = useState<VariantRow[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [productId, setProductId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [fabricId, setFabricId] = useState("");
  const [colorId, setColorId] = useState("");
  const [colorQuery, setColorQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [colorResults, setColorResults] = useState<Color[]>([]);
  const [colorLoading, setColorLoading] = useState(false);
  const [colorError, setColorError] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api.variants({ limit: 50, page: 1 }).then(setItems).catch((reason) => setError(messageOf(reason, "Could not load variants"))).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    api.catalog().then(setCatalog).catch(() => undefined);
  }, []);

  useEffect(() => {
    const search = colorQuery.trim();
    setColorLoading(false);
    if (!search || colorId) {
      setColorResults([]);
      setColorError("");
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setColorLoading(true);
      setColorError("");
      try {
        const results = await api.searchColors(search);
        if (active) setColorResults(results);
      } catch (reason) {
        if (active) {
          setColorResults([]);
          setColorError(messageOf(reason, "Could not search colors"));
        }
      } finally {
        if (active) setColorLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [colorQuery, colorId]);

  return (
    <Panel title="Variants" error={error}>
      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          api.saveVariant({ productId, sizeId, fabricId, colorId: colorId || null, sku, stock: Number(stock) }).then(() => {
            setSku("");
            setColorId("");
            setColorQuery("");
            setSelectedColor(null);
            load();
          }).catch((reason) => setError(messageOf(reason, "Could not save the variant")));
        }}
      >
        <h2 className="text-sm font-semibold">Variant</h2>
        <input className={field} required placeholder="Product id" value={productId} onChange={(event) => setProductId(event.target.value)} />
        <select className={field} required value={sizeId} onChange={(event) => setSizeId(event.target.value)}>
          <option value="">Size</option>
          {(catalog?.sizes ?? []).map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}
        </select>
        <select className={field} required value={fabricId} onChange={(event) => setFabricId(event.target.value)}>
          <option value="">Fabric</option>
          {(catalog?.fabrics ?? []).map((fabric) => <option key={fabric.id} value={fabric.id}>{fabric.name}</option>)}
        </select>
        <div className="relative">
          <label className="mb-1 block text-sm text-slate-600" htmlFor="variant-color-search">Color (optional)</label>
          <input
            id="variant-color-search"
            className={field}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={colorResults.length > 0 && !colorId}
            aria-controls="variant-color-options"
            placeholder="Search color name (e.g. blue)"
            value={colorQuery}
            onChange={(event) => {
              setColorId("");
              setSelectedColor(null);
              setColorQuery(event.target.value);
              setColorError("");
            }}
          />
          {colorLoading ? <p className="mt-1 text-sm text-slate-500" role="status">Searching colors…</p> : null}
          {colorError ? <p className="mt-1 text-sm text-rose-700" role="alert">{colorError}</p> : null}
          {!colorLoading && !colorError && colorQuery.trim() && !colorId && colorResults.length === 0
            ? <p className="mt-1 text-sm text-slate-500">No colors found.</p>
            : null}
          {colorId && selectedColor ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: selectedColor.hexCode }} />
              Selected: {colorQuery}
            </p>
          ) : null}
          {!colorId && colorResults.length > 0 ? (
            <ul id="variant-color-options" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="listbox" aria-label="Color suggestions">
              {colorResults.map((color) => (
                <li key={color.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setColorId(color.id);
                      setSelectedColor(color);
                      setColorQuery(color.name);
                      setColorResults([color]);
                      setColorError("");
                    }}
                  >
                    <span className="h-5 w-5 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: color.hexCode }} aria-hidden="true" />
                    <span>{color.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{color.hexCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <input className={field} required placeholder="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
        <input className={field} inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} />
        <button className="rounded-xl bg-[#2ec9a8] px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>
      {note ? <p className="text-sm text-slate-600 lg:col-span-2">{note}</p> : null}
      <ResourceTable
        loading={loading}
        rows={items.map((item) => ({ id: item.id, label: `${item.sku} · stock ${item.stock}${item.isActive ? "" : " · inactive"}` }))}
        onEdit={async (id) => {
          const item = await api.variant(id);
          await api.saveVariant({ isActive: !item.isActive }, id);
          load();
        }}
        onDelete={async (id) => {
          const result = await api.deleteVariant(id);
          setNote(result.message);
          load();
        }}
      />
    </Panel>
  );
}

function ResourceTable({
  rows,
  loading = false,
  onEdit,
  onDelete,
}: {
  rows: { id: string; label: string }[];
  loading?: boolean;
  onEdit?: (id: string) => Promise<unknown> | void;
  onDelete?: (id: string) => Promise<unknown> | void;
}) {
  const [error, setError] = useState("");
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {error ? <p className="px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {loading ? <div className="p-4"><RowsSkeleton rows={5} columns={2} /></div> : rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-slate-500">Nothing here yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.label}</td>
                <td className="px-4 py-3 text-right">
                  {onEdit ? (
                    <button type="button" className="mr-3 text-[#163a8a]" onClick={() => Promise.resolve(onEdit(row.id)).catch((reason) => setError(messageOf(reason, "Could not update")))}>
                      Open
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      className="text-rose-700"
                      onClick={() => {
                        if (!window.confirm("Delete this?")) return;
                        Promise.resolve(onDelete(row.id)).catch((reason) => setError(messageOf(reason, "Could not delete")));
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
