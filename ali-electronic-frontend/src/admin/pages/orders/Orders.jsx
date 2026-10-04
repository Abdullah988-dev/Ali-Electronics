import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../services/adminService.js";
import { errorMessage } from "../../../config/api.js";
import { formatPrice, imgUrl } from "../../../utils/format.js";
import { useToast } from "../../../context/ToastContext.jsx";
import Modal from "../../../components/common/Modal.jsx";
import ConfirmDialog from "../../../components/common/ConfirmDialog.jsx";

const STATUS_CLASS = { Pending: "warn", Confirmed: "intl", Shipped: "intl", Delivered: "ok", Cancelled: "off" };
const TABS = ["All", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

// agla qadam: Pending -> Confirmed -> Shipped -> Delivered
const NEXT = {
  Pending: { status: "Confirmed", label: "Order confirm karein", icon: "fa-circle-check" },
  Confirmed: { status: "Shipped", label: "Shipped mark karein", icon: "fa-truck" },
  Shipped: { status: "Delivered", label: "Delivered mark karein", icon: "fa-check-double" },
};

const fmtDate = (d) => new Date(d).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });

export default function Orders() {
  const toast = useToast();

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1, statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState(null); // null = band, { id, order } = khula
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setError("");
        const params = { page, limit: 15 };
        if (tab !== "All") params.status = tab;
        if (debouncedSearch) params.search = debouncedSearch;
        setData(await adminApi.listOrders(params));
      } catch (err) {
        if (!silent) setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [tab, debouncedSearch, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  // naye orders khud nazar aa jayen (har 30 second)
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const changeTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const openDetail = async (id) => {
    setDetail({ id, order: null });
    try {
      const order = await adminApi.getOrder(id);
      setDetail({ id, order });
    } catch (err) {
      toast.error(errorMessage(err));
      setDetail(null);
    }
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const order = await adminApi.setOrderStatus(detail.id, status);
      setDetail({ id: detail.id, order });
      toast.success(status === "Cancelled" ? "Order cancel ho gaya, maal wapas stock me chala gaya" : `Order ab "${status}" hai`);
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const o = detail?.order;
  const next = o ? NEXT[o.Status] : null;
  const isFinal = o && (o.Status === "Delivered" || o.Status === "Cancelled");

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Orders</h2>
          <p className="muted">Website se aane wale saare orders yahan nazar aayen ge.</p>
        </div>
        <button type="button" className="btn" onClick={() => load()}>
          <i className="fa-solid fa-rotate" /> Refresh
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`tab ${tab === t ? "active" : ""}`} onClick={() => changeTab(t)}>
            {t} <em>{data.statusCounts?.[t] ?? 0}</em>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Naam, phone ya order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="muted">{data.total} orders</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="center muted">
                  <span className="spinner" /> Loading...
                </td>
              </tr>
            )}

            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="7">
                  <div className="empty">
                    <i className="fa-solid fa-receipt" />
                    Koi order nahi mila.
                  </div>
                </td>
              </tr>
            )}

            {data.items.map((x) => (
              <tr key={x.Id}>
                <td>
                  <strong>#{x.Id}</strong>
                </td>
                <td>
                  <div className="prod-info">
                    <strong>{x.CustomerName}</strong>
                    <small className="muted">
                      {x.Phone}
                      {x.City ? ` • ${x.City}` : ""}
                    </small>
                  </div>
                </td>
                <td>
                  <span className="pill">{x.ItemCount}</span>
                </td>
                <td>
                  <strong>{formatPrice(x.TotalAmount)}</strong>
                </td>
                <td>
                  <span className={`badge ${STATUS_CLASS[x.Status] || "off"}`}>{x.Status}</span>
                </td>
                <td className="muted">{fmtDate(x.CreatedAt)}</td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => openDetail(x.Id)}>
                    <i className="fa-solid fa-eye" /> View
                  </button>
                </td>
              </tr>
            ))}
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

      {detail && (
        <Modal
          size="lg"
          title={`Order #${detail.id}`}
          subtitle={o ? fmtDate(o.CreatedAt) : "Loading..."}
          icon="fa-receipt"
          onClose={() => setDetail(null)}
        >
          {!o ? (
            <div className="center muted">
              <span className="spinner" /> Loading...
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <span className={`badge ${STATUS_CLASS[o.Status] || "off"}`}>{o.Status}</span>
              </div>

              <div className="info-grid">
                <div>
                  <label>Customer</label>
                  {o.CustomerName}
                </div>
                <div>
                  <label>Phone</label>
                  <a href={`tel:${o.Phone}`}>{o.Phone}</a>
                </div>
                <div>
                  <label>Shehar</label>
                  {o.City || "-"}
                </div>
                <div>
                  <label>Account email</label>
                  {o.UserEmail || "-"}
                </div>
                <div className="full">
                  <label>Address</label>
                  {o.Address}
                </div>
                {o.Note && (
                  <div className="full">
                    <label>Customer ka note</label>
                    {o.Note}
                  </div>
                )}
                <div>
                  <label>Payment</label>
                  {o.PaymentMethod === "COD" ? "Cash on Delivery" : o.PaymentMethod}
                </div>
              </div>

              <div className="o-items">
                {o.Items.map((i) => (
                  <div key={i.Id} className="o-item">
                    {i.ImageUrl ? (
                      <img src={imgUrl(i.ImageUrl)} alt={i.ProductName} />
                    ) : (
                      <div className="thumb thumb-empty">{i.ProductName.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="o-name">
                      <span>{i.ProductName}</span>
                      <small className="muted">
                        {formatPrice(i.Price)} x {i.Quantity}
                      </small>
                    </div>
                    <strong>{formatPrice(i.Price * i.Quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="o-total">
                <span>Total</span>
                <strong>{formatPrice(o.TotalAmount)}</strong>
              </div>

              {isFinal ? (
                <div className="hint">
                  <i className="fa-solid fa-circle-info" /> Ye order {o.Status === "Delivered" ? "deliver ho chuka" : "cancel ho chuka"} hai, is ki status ab badal nahi sakti.
                </div>
              ) : (
                <div className="status-actions">
                  {next && (
                    <button type="button" className="btn primary" disabled={busy} onClick={() => changeStatus(next.status)}>
                      <i className={`fa-solid ${next.icon}`} /> {next.label}
                    </button>
                  )}
                  <button type="button" className="btn danger" disabled={busy} onClick={() => setConfirmCancel(true)}>
                    <i className="fa-solid fa-ban" /> Order cancel karein
                  </button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {confirmCancel && (
        <ConfirmDialog
          title="Order cancel karna hai?"
          message="Order cancel hone par is ka maal wapas stock me chala jaye ga. Ye dobara wapas nahi ho sakta."
          confirmText="Haan, cancel karein"
          busy={busy}
          onConfirm={() => changeStatus("Cancelled")}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}