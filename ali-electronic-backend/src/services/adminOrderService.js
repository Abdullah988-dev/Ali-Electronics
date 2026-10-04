import { query, withTransaction, txQuery } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ORDER_STATUSES } from "../models/constants.js";

/** Orders ki list (filter, search, page) + har status ki ginti */
export const listOrders = async (f = {}) => {
  const where = [];
  const params = {};

  if (f.status && ORDER_STATUSES.includes(f.status)) {
    where.push("o.Status = @status");
    params.status = f.status;
  }

  const term = f.search ? String(f.search).trim() : "";
  if (term) {
    where.push("(o.CustomerName LIKE @search OR o.Phone LIKE @search OR o.Id = @orderId)");
    params.search = `%${term}%`;
    const asId = Number(term.replace(/^#/, ""));
    params.orderId = Number.isInteger(asId) ? asId : 0;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = Math.max(parseInt(f.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 15, 1), 100);
  params.offset = (page - 1) * limit;
  params.limit = limit;

  const rows = await query(
    `SELECT o.Id, o.CustomerName, o.Phone, o.City, o.Status, o.TotalAmount, o.PaymentMethod, o.CreatedAt,
            (SELECT SUM(oi.Quantity) FROM dbo.OrderItems oi WHERE oi.OrderId = o.Id) AS ItemCount
     FROM dbo.Orders o
     ${whereSql}
     ORDER BY o.Id DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  const count = await query(`SELECT COUNT(*) AS total FROM dbo.Orders o ${whereSql}`, params);

  const grouped = await query("SELECT Status, COUNT(*) AS n FROM dbo.Orders GROUP BY Status");
  const statusCounts = { All: 0 };
  ORDER_STATUSES.forEach((s) => (statusCounts[s] = 0));
  grouped.recordset.forEach((r) => {
    statusCounts[r.Status] = r.n;
    statusCounts.All += r.n;
  });

  const total = count.recordset[0].total;
  return {
    items: rows.recordset,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    statusCounts,
  };
};

/** Ek order poori tafseel ke saath */
export const getOrder = async (id) => {
  const result = await query(
    `SELECT o.*, u.Email AS UserEmail
     FROM dbo.Orders o
     LEFT JOIN dbo.Users u ON u.Id = o.UserId
     WHERE o.Id = @id`,
    { id }
  );
  const order = result.recordset[0];
  if (!order) throw new ApiError(404, "Order nahi mila");

  const items = await query(
    `SELECT oi.Id, oi.ProductId, oi.ProductName, oi.Price, oi.Quantity, p.ImageUrl
     FROM dbo.OrderItems oi
     LEFT JOIN dbo.Products p ON p.Id = oi.ProductId
     WHERE oi.OrderId = @id
     ORDER BY oi.Id`,
    { id }
  );
  return { ...order, Items: items.recordset };
};

/**
 * Status badalna. Delivered aur Cancelled aakhri halat hain (badal nahi sakti).
 * Cancel par maal wapas stock me chala jata hai.
 */
export const updateOrderStatus = async (id, status) => {
  if (!ORDER_STATUSES.includes(status)) throw new ApiError(400, "Ghalat status");

  await withTransaction(async (tx) => {
    const result = await txQuery(tx, "SELECT Id, Status FROM dbo.Orders WITH (UPDLOCK) WHERE Id = @id", { id });
    const order = result.recordset[0];
    if (!order) throw new ApiError(404, "Order nahi mila");

    if (order.Status === "Cancelled" || order.Status === "Delivered") {
      throw new ApiError(400, `${order.Status} order ki status ab badal nahi sakti`);
    }
    if (order.Status === status) return;

    if (status === "Cancelled") {
      await txQuery(tx, "DELETE FROM dbo.StockOut WHERE OrderId = @id", { id });
    }
    await txQuery(tx, "UPDATE dbo.Orders SET Status = @status WHERE Id = @id", { id, status });
  });

  return getOrder(id);
};

/** Dashboard ke numbers + haal ke orders */
export const getSummary = async () => {
  const stats = await query(
    `SELECT
       (SELECT COUNT(*) FROM dbo.Categories) AS categories,
       (SELECT COUNT(*) FROM dbo.Brands) AS brands,
       (SELECT COUNT(*) FROM dbo.Products) AS products,
       (SELECT COUNT(*) FROM dbo.Orders) AS totalOrders,
       (SELECT COUNT(*) FROM dbo.Orders WHERE Status = 'Pending') AS pendingOrders,
       (SELECT COUNT(*) FROM dbo.Orders WHERE CAST(CreatedAt AS DATE) = CAST(SYSDATETIME() AS DATE)) AS todayOrders,
       (SELECT ISNULL(SUM(TotalAmount), 0) FROM dbo.Orders WHERE Status = 'Delivered') AS revenue,
       (SELECT COUNT(*) FROM dbo.vw_Inventory WHERE StockStatus = 'Low Stock') AS lowStock,
       (SELECT COUNT(*) FROM dbo.vw_Inventory WHERE StockStatus = 'Out of Stock') AS outOfStock`
  );
  const recent = await query(
    "SELECT TOP 6 Id, CustomerName, Status, TotalAmount, CreatedAt FROM dbo.Orders ORDER BY Id DESC"
  );
  return { ...stats.recordset[0], recentOrders: recent.recordset };
};