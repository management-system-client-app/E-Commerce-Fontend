import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api";
import { DetailSkeleton } from "../components/Skeleton";
import { useStore } from "../state";
import type { Color, ProductImage } from "../types";

type SizeRow = { sizeId: string; fabricId: string; colorId: string; stock: string };
const MAX_PRODUCT_IMAGES = 6;

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all duration-200 ease-out focus:border-[#7b3f55] focus:ring-3 focus:ring-[#7b3f55]/30";

function messageOf(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiError)) return fallback;
  const detail = reason.errors?.[0]?.message;
  return detail ? `${reason.message}. ${detail}` : reason.message;
}

function ColorImagePicker({
  colors,
  selectedIds,
  previews,
  existingImages,
  disabled,
  onSelect,
  onUpload,
}: {
  colors: Color[];
  selectedIds: string[];
  previews: Record<string, string>;
  existingImages: ProductImage[];
  disabled: boolean;
  onSelect?: (colorId: string) => void;
  onUpload: (colorId: string, files: File[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => {
        const selected = selectedIds.includes(color.id);
        const image = previews[color.id] ?? existingImages.find((photo) => photo.colorId === color.id)?.url;
        return (
          <div key={color.id} className={`flex h-16 w-40 shrink-0 items-center gap-2.5 rounded-xl border px-3 transition-colors duration-200 ease-out ${selected ? "border-[#7b3f55] bg-[#2a2026] hover:bg-[#36222c]" : "border-slate-700 bg-[#171c24] hover:border-slate-500 hover:bg-[#1d232d]"}`}>
            <label className="group relative block h-10 w-10 shrink-0 cursor-pointer" title={`Upload ${color.name} photo`}>
              <span className={`relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 bg-[#171c24] transition-all duration-200 ${selected ? "border-[#f0c0cf] ring-2 ring-[#7b3f55]/50 group-hover:ring-[#7b3f55]/75" : "border-slate-600 hover:border-[#d39aac] hover:ring-2 hover:ring-slate-600/60"}`}>
                {image ? (
                  <img src={image} alt={`${color.name} color`} className="absolute inset-0 block h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 block h-full w-full" style={{ backgroundColor: color.hexCode }} />
                )}
              </span>
              <span aria-hidden="true" className="absolute right-0 bottom-0 grid h-5 w-5 place-items-center rounded-full border-2 border-[#202630] bg-[#f0c0cf] text-sm font-bold leading-none text-[#542536] shadow-md transition-colors duration-200 group-hover:bg-[#7b3f55] group-hover:text-white">+</span>
              <input
                className="sr-only"
                type="file"
                accept="image/avif,image/jpeg,image/png,image/webp"
                multiple
                disabled={disabled}
                aria-label={`Upload ${color.name} photos`}
                onChange={(event) => {
                  onUpload(color.id, [...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
            </label>
            {onSelect ? (
              <button
                type="button"
                aria-pressed={selected}
                className={`min-w-0 flex-1 truncate text-left text-sm font-medium transition-colors duration-200 ${selected ? "text-[#f0c0cf]" : "text-slate-300 hover:text-white"}`}
                onClick={() => onSelect(color.id)}
              >
                {color.name}{selected ? " ✓" : ""}
              </button>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{color.name}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AdminProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { catalog } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [gender, setGender] = useState("WOMEN");
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<SizeRow[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [bulkFabricId, setBulkFabricId] = useState("");
  const [colors, setColors] = useState<Color[]>([]);
  const [productColorIds, setProductColorIds] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imageColorIds, setImageColorIds] = useState<(string | null)[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const previewUrls = useRef<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!editing);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    api.colorList().then(setColors).catch((reason) => {
      setError(messageOf(reason, "Could not load colors"));
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .product(id)
      .then((product) => {
        setName(product.name);
        setDescription(product.description);
        setStatus(product.status);
        setGender(product.gender);
        setBasePrice(String(product.basePrice));
        setCompareAtPrice(product.compareAtPrice == null ? "" : String(product.compareAtPrice));
        setBrandId(product.brand.id);
        setCategoryId(product.category.id);
        setExistingImages(product.images);
        setProductColorIds([
          ...new Set(product.variants.flatMap((variant) => variant.color ? [variant.color.id] : [])),
        ]);
        setReady(true);
      })
      .catch((reason) => {
        setError(messageOf(reason, "Could not load the product"));
        setReady(true);
      });
  }, [id]);

  function updateRowStock(index: number, stock: string) {
    const numericStock = stock.replace(/\D/g, "");
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, stock: numericStock } : row)));
  }

  function addImages(files: File[], colorId: string | null = null) {
    const available = MAX_PRODUCT_IMAGES - existingImages.length - images.length;
    if (files.length > available) {
      setError(`You can add only ${available} more image${available === 1 ? "" : "s"} to this product.`);
    } else {
      setError("");
    }
    const additions = files.slice(0, available);
    setImages((current) => [...current, ...additions]);
    setImageColorIds((current) => [...current, ...additions.map(() => colorId)]);
    if (colorId && additions[0]) {
      const preview = URL.createObjectURL(additions[0]);
      previewUrls.current.push(preview);
      setImagePreviews((current) => ({ ...current, [colorId]: preview }));
      if (!editing) {
        setSelectedColorIds((current) => current.includes(colorId) ? current : [...current, colorId]);
      }
    }
  }

  const photoColors = editing
    ? colors.filter((color) => productColorIds.includes(color.id))
    : colors.filter((color) => selectedColorIds.includes(color.id));

  function addSelectedCombinations() {
    setError("");
    if (selectedSizeIds.length === 0) {
      setError("Choose at least one size");
      return;
    }
    if (!bulkFabricId) {
      setError("Choose a fabric for these combinations");
      return;
    }

    const colorIds = selectedColorIds.length > 0 ? selectedColorIds : [""];
    const existing = new Set(
      rows
        .filter((row) => row.sizeId && row.fabricId)
        .map((row) => `${row.sizeId}:${row.fabricId}:${row.colorId}`),
    );
    const additions: SizeRow[] = [];
    for (const sizeId of selectedSizeIds) {
      for (const colorId of colorIds) {
        const key = `${sizeId}:${bulkFabricId}:${colorId}`;
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({ sizeId, fabricId: bulkFabricId, colorId, stock: "" });
      }
    }

    const completeRowCount = rows.filter((row) => row.sizeId && row.fabricId).length;
    if (completeRowCount + additions.length > 30) {
      setError("A product can have at most 30 size, color and fabric combinations.");
      return;
    }
    if (additions.length === 0) {
      setError("These combinations have already been added");
      return;
    }

    setRows((current) => [...current, ...additions]);
  }

  function toggleSelection(selection: string[], value: string, update: (next: string[]) => void) {
    update(selection.includes(value) ? selection.filter((item) => item !== value) : [...selection, value]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const price = Number(basePrice);
    const compare = compareAtPrice.trim() === "" ? undefined : Number(compareAtPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than 0");
      return;
    }
    if (compare != null && (!Number.isFinite(compare) || compare <= price)) {
      setError("Compare price must be greater than the price");
      return;
    }

    setBusy(true);
    try {
      if (editing && id) {
        await api.updateProduct(id, {
          name: name.trim(),
          description: description.trim(),
          status,
          gender,
          basePrice: price,
          compareAtPrice: compare ?? null,
          brandId,
          categoryId,
        }, images, imageColorIds);
        navigate("/admin/products");
        return;
      }

      const sizes = rows
        .filter((row) => row.sizeId && row.fabricId)
        .map((row) => ({
          sizeId: row.sizeId,
          fabricId: row.fabricId,
          ...(row.colorId ? { colorId: row.colorId } : {}),
          stock: Number(row.stock) || 0,
        }));
      if (sizes.length === 0) {
        setError("Add at least one size and fabric");
        setBusy(false);
        return;
      }

      await api.createProduct(
        {
          name: name.trim(),
          description: description.trim(),
          status,
          gender,
          basePrice: price,
          ...(compare != null ? { compareAtPrice: compare } : {}),
          brandId,
          categoryId,
          sizes,
        },
        images,
        imageColorIds,
      );
      navigate("/admin/products");
    } catch (reason) {
      setError(messageOf(reason, "Could not save the product"));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <DetailSkeleton />;

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{editing ? "Edit product" : "Add product"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {editing ? "Update the product details." : "Active products show on the shop."}
          </p>
        </div>
        <Link to="/admin/products" className="rounded-xl bg-[#7b3f55] px-4 py-2 text-sm font-semibold text-white transition duration-200 delay-75 ease-out hover:bg-[#663247] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b3f55] focus-visible:ring-offset-2">
          Back
        </Link>
      </div>
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-700 border-t-2 border-t-[#7b3f55] bg-[#202630] shadow-sm">
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7b3f55] text-xs font-bold text-white">01</span>
            <h2 className="text-sm font-semibold text-slate-100">Product details</h2>
          </div>
          <p className="mt-1.5 pl-10 text-xs text-slate-400">Add the core information customers need to find this product.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 [&>label>span]:text-slate-400">
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-slate-500">Name</span>
          <input className={fieldClass} required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-slate-500">Description</span>
          <textarea
            className={`${fieldClass} h-28 py-2`}
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Price</span>
          <input className={fieldClass} required inputMode="decimal" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Compare price</span>
          <input className={fieldClass} inputMode="decimal" value={compareAtPrice} onChange={(event) => setCompareAtPrice(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Category</span>
          <select className={fieldClass} required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Choose</option>
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Brand</span>
          <select className={fieldClass} required value={brandId} onChange={(event) => setBrandId(event.target.value)}>
            <option value="">Choose</option>
            {catalog.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Gender</span>
          <select className={fieldClass} value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="WOMEN">Women</option>
            <option value="MEN">Men</option>
            <option value="KIDS">Kids</option>
            <option value="UNISEX">Unisex</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-slate-500">Status</span>
          <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        </div>
      </section>

      {editing ? null : (
        <section className="overflow-hidden rounded-2xl border border-slate-700 border-t-2 border-t-slate-600 bg-[#202630] shadow-sm">
          <div className="border-b border-slate-700 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7b3f55] text-sm font-bold text-white">02</span>
                <h2 className="text-sm font-semibold text-slate-100">Variants & inventory</h2>
              </div>
              <p className="mt-1.5 pl-10 text-xs text-slate-400">Choose sizes and colors, then set stock for each combination.</p>
            </div>
          </div>
          <div className="space-y-5 p-5">
          <div className="space-y-4 border-b border-slate-700 pb-5">
            <div className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#7b3f55] text-xs font-bold text-white">A</span>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Build combinations</h3>
                <p className="mt-0.5 text-xs text-slate-400">Every selected size is paired with each selected color.</p>
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sizes</p>
              <div className="flex flex-wrap gap-2">
                {catalog.sizes.map((size) => {
                  const selected = selectedSizeIds.includes(size.id);
                  return (
                    <button
                      key={size.id}
                      type="button"
                      aria-pressed={selected}
                      className={`min-w-12 rounded-xl border px-3.5 py-2.5 text-xs transition-colors duration-200 ease-out active:transform-none active:filter-none ${selected ? "border-[#d39aac] bg-[#7b3f55] font-semibold text-white hover:bg-[#673247]" : "border-slate-600 text-slate-300 hover:border-[#b98b9b] hover:bg-slate-700/60 hover:text-white"}`}
                      onClick={() => toggleSelection(selectedSizeIds, size.id, setSelectedSizeIds)}
                    >
                      {size.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Colors <span className="font-normal normal-case tracking-normal">(optional)</span></p>
              <ColorImagePicker
                colors={colors}
                selectedIds={selectedColorIds}
                previews={imagePreviews}
                existingImages={existingImages}
                disabled={existingImages.length + images.length >= MAX_PRODUCT_IMAGES}
                onSelect={(colorId) => toggleSelection(selectedColorIds, colorId, setSelectedColorIds)}
                onUpload={(colorId, files) => addImages(files, colorId)}
              />
              {colors.length === 0 ? <span className="mt-2 block text-xs text-slate-400">No colors available. Add colors in Admin → Colors.</span> : null}
            </div>
            <div className="grid gap-2 border-t border-slate-700 pt-4 sm:grid-cols-[1fr_auto]">
              <select className={`${fieldClass} border-slate-600 bg-[#171c24] text-white`} value={bulkFabricId} onChange={(event) => setBulkFabricId(event.target.value)}>
                <option value="">Choose fabric for variants</option>
                {catalog.fabrics.map((fabric) => (
                  <option key={fabric.id} value={fabric.id}>{fabric.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="h-11 rounded-xl bg-[#7b3f55] px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 ease-out hover:bg-[#673247] hover:shadow-md"
                onClick={addSelectedCombinations}
              >
                + Add combinations
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Stock is entered separately for each generated variant below.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#7b3f55] text-xs font-bold text-white">B</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Added combinations</h3>
                  <p className="text-xs text-slate-400">Set stock for each combination selected above.</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200">{rows.length} rows</span>
            </div>
            {rows.length === 0 ? (
              <p className="border-y border-dashed border-slate-600 px-4 py-6 text-center text-sm text-slate-400">
                Select sizes, colors and fabric above, then add combinations.
              </p>
            ) : rows.map((row, index) => {
              const sizeName = catalog.sizes.find((size) => size.id === row.sizeId)?.name || "Choose size";
              const color = colors.find((item) => item.id === row.colorId);
              const fabricName = catalog.fabrics.find((fabric) => fabric.id === row.fabricId)?.name || "No fabric";
              return (
                <div key={index} className="variant-combination-row rounded-xl border border-slate-700 bg-[#171c24] p-3 sm:p-4">
                  <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#7b3f55] text-xs font-semibold text-white">{String(index + 1).padStart(2, "0")}</span>
                      <span className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-100">{sizeName}</span>
                      {color ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#202630] px-2.5 py-1.5 text-xs text-slate-100">
                          <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color.hexCode }} />
                          {color.name}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300">No color</span>
                      )}
                      <span className="rounded-lg border border-slate-700 bg-[#202630] px-2.5 py-1.5 text-xs text-slate-300">{fabricName}</span>
                    </div>
                    <label className="variant-stock-panel grid grid-cols-[auto_minmax(100px,140px)] items-center gap-2 rounded-xl border border-slate-700 bg-[#202630] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors duration-200 ease-out hover:border-[#7b3f55] hover:bg-[#2a313d]">
                      Stock
                      <input
                        className="h-9 w-full rounded-lg border border-slate-600 bg-[#171c24] px-3 text-sm text-white outline-none focus:border-[#d39aac] focus:ring-2 focus:ring-[#7b3f55]/30"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`Stock for ${sizeName}${color ? ` ${color.name}` : ""}`}
                        placeholder="0"
                        value={row.stock}
                        onChange={(event) => updateRowStock(index, event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </section>

      )}

      {editing && photoColors.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-700 border-t-2 border-t-[#7b3f55] bg-[#202630] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7b3f55] text-xs font-bold text-white">02</span>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Color photos</h2>
                <p className="mt-1 text-xs text-slate-400">Upload a photo for each product color.</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200">{photoColors.length} colors</span>
          </div>
          <div className="p-5">
            <ColorImagePicker
              colors={photoColors}
              selectedIds={productColorIds}
              previews={imagePreviews}
              existingImages={existingImages}
              disabled={existingImages.length + images.length >= MAX_PRODUCT_IMAGES}
              onUpload={(colorId, files) => addImages(files, colorId)}
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-700 bg-[#202630] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#7b3f55] text-xs font-bold text-white">03</span>
              <h2 className="text-sm font-semibold text-slate-100">Product photos</h2>
            </div>
            <p className="mt-2 text-xs text-slate-400">Add up to {MAX_PRODUCT_IMAGES} images. Photos added here apply to all colors.</p>
            <p className="mt-1 text-xs text-slate-400">Use the color circles above to add photos for a specific color.</p>
          </div>
          <span className="rounded-full bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100">
            {existingImages.length + images.length} / {MAX_PRODUCT_IMAGES} selected
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Product photos selected"
          aria-valuemin={0}
          aria-valuemax={MAX_PRODUCT_IMAGES}
          aria-valuenow={existingImages.length + images.length}
          className="h-1.5 overflow-hidden rounded-full bg-slate-700"
        >
          <span
            className="block h-full rounded-full bg-[#7b3f55]"
            style={{ width: `${((existingImages.length + images.length) / MAX_PRODUCT_IMAGES) * 100}%` }}
          />
        </div>
        {existingImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {existingImages.map((photo) => (
              <div key={photo.id ?? photo.url} className="overflow-hidden rounded-xl border border-slate-600 bg-[#171c24]">
                <img src={photo.url} alt={photo.alt ?? name} className="aspect-square w-full object-cover" />
                <span className="block truncate px-2.5 py-2 text-xs text-slate-300">
                  {photo.colorId ? colors.find((color) => color.id === photo.colorId)?.name ?? "Color image" : "All colors"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <label className="grid gap-2 rounded-xl border border-dashed border-slate-600 bg-[#171c24] p-4 text-sm transition-colors duration-200 hover:bg-[#262d38]">
          <span className="font-medium text-slate-100">{existingImages.length > 0 ? "Add more photos" : "Choose product photos"}</span>
          <span className="text-xs text-slate-400">{MAX_PRODUCT_IMAGES - existingImages.length - images.length} more available · AVIF, JPEG, PNG or WebP</span>
          <input
            className="block w-full cursor-pointer text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#7b3f55] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            type="file"
            accept="image/avif,image/jpeg,image/png,image/webp"
            multiple
            disabled={existingImages.length + images.length >= MAX_PRODUCT_IMAGES}
            onChange={(event) => {
              const chosen = [...(event.target.files ?? [])];
              addImages(chosen);
              event.target.value = "";
            }}
          />
        </label>
        {images.length > 0 ? (
          <ul className="space-y-2">
            {images.map((photo, index) => (
              <li key={`${photo.name}-${photo.lastModified}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#171c24] p-2.5">
                <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{photo.name}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {imageColorIds[index] ? colors.find((color) => color.id === imageColorIds[index])?.name ?? "Color photo" : "All colors"}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-rose-300"
                  onClick={() => {
                    setImages((current) => current.filter((_, photoIndex) => photoIndex !== index));
                    setImageColorIds((current) => current.filter((_, photoIndex) => photoIndex !== index));
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-xl bg-[#2ec9a8] px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : editing ? "Update product" : "Add product"}
      </button>
    </form>
  );
}
