import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catalogApi } from "../../services/catalogService.js";
import { errorMessage } from "../../config/api.js";
import ProductCard from "../../components/product/ProductCard.jsx";

const SORTS = [
  { value: "newest", label: "Naye pehle" },
  { value: "price_asc", label: "Price: kam se zyada" },
  { value: "price_desc", label: "Price: zyada se kam" },
  { value: "name", label: "Naam (A-Z)" },
];

export default function Products() {
  const [params, setParams] = useSearchParams();

  const category = params.get("category") || "";
  const brand = params.get("brand") || "";
  const search = params.get("search") || "";
  const sort = params.get("sort") || "newest";
  const inStock = params.get("inStock") === "1";
  const page = Math.max(parseInt(params.get("page"), 10) || 1, 1);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false); // sirf mobile par

  // URL ke filters badalne ka ek hi tareeqa
  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === "" || value === null || value === false || value === undefined) next.delete(key);
      else next.set(key, value === true ? "1" : String(value));
    });
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  useEffect(() => {
    Promise.all([catalogApi.categories(), catalogApi.brands()])
      .then(([c, b]) => {
        setCategories(c);
        setBrands(b);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const query = { page, limit: 12, sort };
    if (category) query.categorySlug = category;
    if (brand) query.brandId = brand;
    if (search) query.search = search;
    if (inStock) query.inStock = 1;

    catalogApi
      .products(query)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, brand, search, sort, inStock, page]);

  const activeCategory = categories.find((c) => c.Slug === category);
  const visibleBrands = brands.filter((b) => !activeCategory || b.CategoryId === activeCategory.Id);
  const title = search ? `"${search}" ke nataij` : activeCategory ? activeCategory.Name : "All Products";
  const hasFilters = category || brand || search || inStock;
  const activeCount = [category, brand, search, inStock].filter(Boolean).length;

  return (
    <div className="container shop-layout">
      {/* ---------- Filters ---------- */}
      <aside className="filters">
        <button type="button" className="filters-toggle" onClick={() => setShowFilters((s) => !s)}>
          <span>
            <i className="fa-solid fa-sliders" /> Filters {activeCount > 0 && <em>{activeCount}</em>}
          </span>
          <i className={`fa-solid ${showFilters ? "fa-chevron-up" : "fa-chevron-down"}`} />
        </button>

        <div className={`filters-body ${showFilters ? "open" : ""}`}>
          <div className="f-block">
            <h4>Categories</h4>
            <div className="f-list">
              <button type="button" className={!category ? "active" : ""} onClick={() => update({ category: "", brand: "" })}>
                Saari categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.Id}
                  type="button"
                  className={category === c.Slug ? "active" : ""}
                  onClick={() => update({ category: c.Slug, brand: "" })}
                >
                  <span>{c.Name}</span>
                  <small>{c.ProductCount}</small>
                </button>
              ))}
            </div>
          </div>

          {visibleBrands.length > 0 && (
            <div className="f-block">
              <h4>Brands</h4>
              <div className="f-list">
                <button type="button" className={!brand ? "active" : ""} onClick={() => update({ brand: "" })}>
                  Saari brands
                </button>
                {visibleBrands.map((b) => (
                  <button
                    key={b.Id}
                    type="button"
                    className={brand === String(b.Id) ? "active" : ""}
                    onClick={() => update({ brand: b.Id })}
                  >
                    <span>{b.Name}</span>
                    <em className={b.IsLocal ? "tag-local" : "tag-intl"}>{b.IsLocal ? "Local" : "Intl"}</em>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="f-check">
            <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked })} />
            Sirf In Stock products
          </label>

          {hasFilters && (
            <button type="button" className="btn small block" onClick={() => setParams(new URLSearchParams())}>
              <i className="fa-solid fa-rotate-left" /> Filters hatayen
            </button>
          )}

          <button type="button" className="btn primary block filters-done" onClick={() => setShowFilters(false)}>
            {loading ? "Loading..." : `${data.total} products dekhein`}
          </button>
        </div>
      </aside>

      {/* ---------- Products ---------- */}
      <section className="shop-main">
        <div className="shop-head">
          <div>
            <h2>{title}</h2>
            <p className="muted">{loading ? "Loading..." : `${data.total} products mile`}</p>
          </div>
          <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="alert error">{error}</div>}

        {loading ? (
          <div className="center muted section">
            <span className="spinner" /> Loading...
          </div>
        ) : data.items.length === 0 ? (
          <div className="empty box">
            <i className="fa-solid fa-box-open" />
            Is filter me koi product nahi mila.
          </div>
        ) : (
          <div className="p-grid">
            {data.items.map((p) => (
              <ProductCard key={p.Id} product={p} />
            ))}
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="pager">
            <button type="button" className="btn small" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
              <i className="fa-solid fa-chevron-left" /> Prev
            </button>
            <span>
              Page {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              className="btn small"
              disabled={page >= data.totalPages}
              onClick={() => update({ page: page + 1 })}
            >
              Next <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}