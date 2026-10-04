import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../services/adminService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, imgUrl } from "../../../utils/format.js";
import { useToast } from "../../../context/ToastContext.jsx";
import Modal from "../../../components/common/Modal.jsx";
import MultiImagePicker from "../../../components/common/MultiImagePicker.jsx";
import Switch from "../../../components/common/switch.jsx";
import ConfirmDialog from "../../../components/common/ConfirmDialog.jsx";

const emptyForm = {
  name: "",
  categoryId: "",
  brandId: "",
  price: "",
  discountAmount: "",
  sku: "",
  description: "",
  lowStockLimit: 5,
  isPublished: true,
  isFeatured: false,
  openingStock: "",
  openingCost: "",
  images: [],
};

const stockInfo = (p) => {
  if (p.StockQuantity <= 0) return { label: "Out of Stock", cls: "off" };
  if (p.StockQuantity <= p.LowStockLimit) return { label: "Low Stock", cls: "warn" };
  return { label: "In Stock", cls: "ok" };
};

export default function Products() {
  const toast = useToast();

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({ search: "", categoryId: "", brandId: "", published: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null); // null = band, { product: null } = naya, { product } = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // search likhte waqt har letter par request na jaye
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.brandId) params.brandId = filters.brandId;
      if (filters.published) params.published = filters.published;
      setData(await adminApi.listProducts(params));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.categoryId, filters.brandId, filters.published]);

  useEffect(() => {
    load();
  }, [load]);

  // dropdowns ke liye categories aur brands
  useEffect(() => {
    Promise.all([adminApi.listCategories(), adminApi.listBrands()])
      .then(([c, b]) => {
        setCategories(c);
        setBrands(b);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const changeFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value, ...(key === "categoryId" ? { brandId: "" } : {}) }));
  };

  const filterBrands = filters.categoryId
    ? brands.filter((b) => String(b.CategoryId) === filters.categoryId)
    : brands;

  const formBrands = brands.filter((b) => String(b.CategoryId) === String(form.categoryId));

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setCategory = (value) => setForm((f) => ({ ...f, categoryId: value, brandId: "" }));

  const openNew = () => {
    setForm({ ...emptyForm, categoryId: filters.categoryId, brandId: "", images: [] });
    setFormError("");
    setModal({ product: null });
  };

  // Edit: pehle poora product (gallery ke saath) server se laate hain
  const openEdit = async (p) => {
    try {
      const full = await adminApi.getProduct(p.Id);
      setForm({
        name: full.Name,
        categoryId: String(full.CategoryId),
        brandId: full.BrandId ? String(full.BrandId) : "",
        price: full.Price,
        discountAmount: full.DiscountPrice ? String(Number(full.Price) - Number(full.DiscountPrice)) : "",
        sku: full.Sku || "",
        description: full.Description || "",
        lowStockLimit: full.LowStockLimit,
        isPublished: full.IsPublished,
        isFeatured: full.IsFeatured,
        openingStock: "",
        openingCost: "",
        images: (full.Images || []).map((i) => ({ key: `id:${i.Id}`, id: i.Id, url: i.ImageUrl })),
      });
      setFormError("");
      setModal({ product: full });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const close = () => setModal(null);

  const submit = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(modal.product);

    if (form.discountAmount && Number(form.discountAmount) >= Number(form.price)) {
      setFormError("Discount price se kam hona chahiye");
      return;
    }

    // tasveeron ka tarteeb: purani "id:12", nayi "new:0" (nayi files isi tarteeb se bhejte hain)
    let newIndex = 0;
    const imageOrder = form.images.map((i) => (i.id ? `id:${i.id}` : `new:${newIndex++}`));

    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      brandId: form.brandId,
      price: form.price,
      // customer ki final price = price - discount (backend me DiscountPrice ke naam se save hoti hai)
      discountPrice: form.discountAmount
        ? String(Math.round((Number(form.price) - Number(form.discountAmount)) * 100) / 100)
        : "",
      sku: form.sku,
      description: form.description,
      lowStockLimit: form.lowStockLimit,
      isPublished: form.isPublished,
      isFeatured: form.isFeatured,
      images: form.images.filter((i) => i.file).map((i) => i.file),
      imageOrder,
    };
    if (!isEdit) {
      payload.openingStock = form.openingStock;
      payload.openingCost = form.openingCost;
    }

    setSaving(true);
    setFormError("");
    try {
      await adminApi.saveProduct(modal.product?.Id, payload);
      close();
      toast.success(isEdit ? "Product update ho gaya" : "Product add ho gaya");
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteProduct(toDelete.Id);
      toast.success("Product delete ho gaya");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const renderPrice = (p) => {
    const hasDiscount = p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price);
    if (!hasDiscount) return <strong>{formatPrice(p.Price)}</strong>;
    return (
      <>
        <strong>{formatPrice(p.DiscountPrice)}</strong>
        <br />
        <small className="price-old">{formatPrice(p.Price)}</small>
      </>
    );
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Products</h2>
          <p className="muted">Yahan se product add karein. Stock management system se chalta hai.</p>
        </div>
        <button type="button" className="btn primary" onClick={openNew}>
          <i className="fa-solid fa-plus" /> Add Product
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Naam, brand ya SKU se dhundein..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select className="select" value={filters.categoryId} onChange={(e) => changeFilter("categoryId", e.target.value)}>
            <option value="">Saari categories</option>
            {categories.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.Name}
              </option>
            ))}
          </select>
          <select className="select" value={filters.brandId} onChange={(e) => changeFilter("brandId", e.target.value)}>
            <option value="">Saari brands</option>
            {filterBrands.map((b) => (
              <option key={b.Id} value={b.Id}>
                {b.Name}
              </option>
            ))}
          </select>
          <select className="select" value={filters.published} onChange={(e) => changeFilter("published", e.target.value)}>
            <option value="">Website: sab</option>
            <option value="1">Published</option>
            <option value="0">Hidden</option>
          </select>
        </div>
        <span className="muted">{data.total} products</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category / Brand</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Website</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="center muted">
                  <span className="spinner" /> Loading...
                </td>
              </tr>
            )}

            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="6">
                  <div className="empty">
                    <i className="fa-solid fa-box-open" />
                    Koi product nahi mila. "Add Product" se pehla product banayen.
                  </div>
                </td>
              </tr>
            )}

            {data.items.map((p) => {
              const info = stockInfo(p);
              return (
                <tr key={p.Id}>
                  <td>
                    <div className="prod-cell">
                      {p.ImageUrl ? (
                        <img className="thumb" src={imgUrl(p.ImageUrl)} alt={p.Name} />
                      ) : (
                        <div className="thumb thumb-empty">{p.Name.charAt(0).toUpperCase()}</div>
                      )}
                      <div className="prod-info">
                        <strong>{p.Name}</strong>
                        {p.Sku && <small className="muted">SKU: {p.Sku}</small>}
                        {p.Gallery && p.Gallery.length > 1 && (
                          <small className="muted">
                            <i className="fa-regular fa-images" /> {p.Gallery.length} tasveerein
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="prod-info">
                      <span>{p.CategoryName}</span>
                      <small className="muted">{p.BrandName || "No brand"}</small>
                    </div>
                  </td>
                  <td>{renderPrice(p)}</td>
                  <td>
                    <div className="prod-info">
                      <strong>{p.StockQuantity} pcs</strong>
                      <span className={`badge ${info.cls}`}>{info.label}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.IsPublished ? "ok" : "off"}`}>{p.IsPublished ? "Published" : "Hidden"}</span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn small" onClick={() => openEdit(p)}>
                      <i className="fa-solid fa-pen" /> Edit
                    </button>
                    <button type="button" className="btn small danger" onClick={() => setToDelete(p)}>
                      <i className="fa-solid fa-trash" /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="pager">
          <button type="button" className="btn small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <i className="fa-solid fa-chevron-left" /> Prev
          </button>
          <span>
            Page {data.page} / {data.totalPages}
          </span>
          <button
            type="button"
            className="btn small"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}

      {modal && (
        <Modal
          size="lg"
          title={modal.product ? "Edit Product" : "Add Product"}
          subtitle={modal.product ? "Product ki details badlein" : "Naya product banayen"}
          icon={modal.product ? "fa-pen-to-square" : "fa-box-open"}
          onClose={close}
        >
          <form onSubmit={submit}>
            {formError && <div className="alert error">{formError}</div>}

            {categories.length === 0 && (
              <div className="alert error">Pehle Categories me koi category banayen, phir product add hoga.</div>
            )}

            <div className="field">
              <label>
                Product ka naam <span className="req">*</span>
              </label>
              <div className="input-wrap">
                <i className="fa-solid fa-box lead" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="jaise: GFC 56 inch Ceiling Fan"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>
                  Category <span className="req">*</span>
                </label>
                <select value={form.categoryId} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="">Category select karein</option>
                  {categories.map((c) => (
                    <option key={c.Id} value={c.Id}>
                      {c.Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Brand</label>
                <select value={form.brandId} onChange={(e) => set("brandId", e.target.value)} disabled={!form.categoryId}>
                  <option value="">{form.categoryId ? "Brand select karein (optional)" : "Pehle category chunein"}</option>
                  {formBrands.map((b) => (
                    <option key={b.Id} value={b.Id}>
                      {b.Name} ({b.IsLocal ? "Local" : "International"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.categoryId && formBrands.length === 0 && (
              <div className="hint">
                <i className="fa-solid fa-circle-info" /> Is category ki koi brand nahi hai. Brand ke baghair bhi product ban sakta hai, ya pehle Brands me add karein.
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label>
                  Price (Rs.) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="15000"
                  required
                />
              </div>
              <div className="field">
                <label>Discount (Rs. kitne kam) - optional</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.discountAmount}
                  onChange={(e) => set("discountAmount", e.target.value)}
                  placeholder="1000"
                />
                {form.discountAmount &&
                  Number(form.discountAmount) > 0 &&
                  Number(form.price) > Number(form.discountAmount) && (
                    <small className="muted">
                      Customer ko milega: <strong>{formatPrice(Number(form.price) - Number(form.discountAmount))}</strong> (
                      {Math.round((Number(form.discountAmount) / Number(form.price)) * 100)}% off)
                    </small>
                  )}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>SKU / Model number (optional)</label>
                <input type="text" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="GFC-56-WH" />
              </div>
              <div className="field">
                <label>Low stock alert (pieces)</label>
                <input
                  type="number"
                  min="0"
                  value={form.lowStockLimit}
                  onChange={(e) => set("lowStockLimit", e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Product ki khaas baatein"
              />
            </div>

            <MultiImagePicker items={form.images} onChange={(list) => set("images", list)} max={6} />

            {!modal.product ? (
              <>
                <div className="field-row">
                  <div className="field">
                    <label>Opening stock (pieces)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.openingStock}
                      onChange={(e) => set("openingStock", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="field">
                    <label>Kharid rate (optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.openingCost}
                      onChange={(e) => set("openingCost", e.target.value)}
                      placeholder="12000"
                    />
                  </div>
                </div>
                <div className="hint">
                  <i className="fa-solid fa-circle-info" /> Abhi jitne pieces maujood hain wo yahan likhein, ye khud Stock In me chale jayen ge. Baad ka maal management system se chalega.
                </div>
              </>
            ) : (
              <div className="hint">
                <i className="fa-solid fa-circle-info" /> Stock (aaya / gaya / baaki) management system se badle ga. Abhi baaki: <strong>{modal.product.StockQuantity} pcs</strong>
              </div>
            )}

            <Switch
              label="Published"
              hint="On ho aur stock ho to website par dikhe ga"
              checked={form.isPublished}
              onChange={(value) => set("isPublished", value)}
            />
            <Switch
              label="Featured"
              hint="Home page par khaas products me dikhe ga"
              checked={form.isFeatured}
              onChange={(value) => set("isFeatured", value)}
            />

            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner dark" /> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" /> Save
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Product delete karna hai?"
          message={`"${toDelete.Name}" delete ho jaye ga. Agar is ki stock ya order history hai to delete nahi hoga, us surat me Published band kar dein.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}