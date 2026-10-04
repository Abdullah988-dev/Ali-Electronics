import { query, withTransaction, txQuery } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { effectivePrice } from "../utils/price.js";
import { round2 } from "../utils/parse.js";

const PHONE_RE = /^[0-9+\-\s]{10,16}$/;
const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());

/**
 * Order banata hai (Cash on Delivery).
 * Price aur stock database se check hota hai, aur stock ek hi transaction me kam hota hai.
 */
export const createOrder = async (user, payload = {}) => {
  const customerName = clean(payload.customerName);
  const phone = clean(payload.phone);
  const address = clean(payload.address);
  const city = clean(payload.city) || null;
  const note = clean(payload.note) || null;

  if (customerName.length < 2) throw new ApiError(400, "Apna poora naam likhein");
  if (!PHONE_RE.test(phone)) throw new ApiError(400, "Sahi phone number likhein");
  if (address.length < 8) throw new ApiError(400, "Poora address likhein");

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) throw new ApiError(400, "Cart khali hai");
  if (items.length > 50) throw new ApiError(400, "Ek order me bohat zyada items hain");

  // ek hi product do dafa ho to quantity jama kar do
  const merged = new Map();
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (
      !Number.isInteger(productId) || productId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0 || quantity > 100
    ) {
      throw new ApiError(400, "Cart ka koi item ghalat hai");
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return withTransaction(async (tx) => {
    const lines = [];
    let total = 0;

    for (const productId of [...merged.keys()].sort((a, b) => a - b)) {
      const quantity = merged.get(productId);

      // product ko lock karo taake do log ek saath akhri piece na le saken
      await txQuery(tx, "SELECT Id FROM dbo.Products WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id", { id: productId });

      const found = await txQuery(
        tx,
        `SELECT p.Id, p.Name, p.Price, p.DiscountPrice, p.IsPublished, c.IsActive AS CategoryActive, s.StockQuantity
         FROM dbo.Products p
         JOIN dbo.Categories c ON c.Id = p.CategoryId
         JOIN dbo.vw_ProductStock s ON s.ProductId = p.Id
         WHERE p.Id = @id`,
        { id: productId }
      );
      const p = found.recordset[0];

      if (!p || !p.IsPublished || !p.CategoryActive) {
        throw new ApiError(400, "Cart ka ek product ab available nahi hai. Usay cart se hata dein.");
      }
      if (p.StockQuantity < quantity) {
        throw new ApiError(
          409,
          p.StockQuantity <= 0
            ? `"${p.Name}" Out of Stock ho gaya hai`
            : `"${p.Name}" ke sirf ${p.StockQuantity} pieces bache hain`
        );
      }

      const price = effectivePrice(p); // hamesha database ki price
      lines.push({ productId, name: p.Name, price, quantity });
      total += price * quantity;
    }

    total = round2(total);

    const orderResult = await txQuery(
      tx,
      `INSERT INTO dbo.Orders (UserId, CustomerName, Phone, Address, City, Note, PaymentMethod, Status, TotalAmount)
       OUTPUT INSERTED.Id
       VALUES (@userId, @customerName, @phone, @address, @city, @note, 'COD', 'Pending', @total)`,
      { userId: user.Id, customerName, phone, address, city, note, total }
    );
    const orderId = orderResult.recordset[0].Id;

    for (const line of lines) {
      await txQuery(
        tx,
        `INSERT INTO dbo.OrderItems (OrderId, ProductId, ProductName, Price, Quantity)
         VALUES (@orderId, @productId, @name, @price, @quantity)`,
        { orderId, productId: line.productId, name: line.name, price: line.price, quantity: line.quantity }
      );

      // stock kam: Stock Out me "Online Order" ki entry
      await txQuery(
        tx,
        `INSERT INTO dbo.StockOut (ProductId, Quantity, SalePrice, Reason, OrderId, CustomerName, Note)
         VALUES (@productId, @quantity, @price, 'Online Order', @orderId, @customerName, @note)`,
        {
          productId: line.productId,
          quantity: line.quantity,
          price: line.price,
          orderId,
          customerName,
          note: `Order #${orderId}`,
        }
      );
    }

    return { id: orderId, total };
  });
};

// orders ke saath unke items jodta hai
const attachItems = async (orders) => {
  if (orders.length === 0) return orders;
  const ids = orders.map((o) => Number(o.Id)).join(",");
  const result = await query(
    `SELECT oi.Id, oi.OrderId, oi.ProductId, oi.ProductName, oi.Price, oi.Quantity, p.ImageUrl
     FROM dbo.OrderItems oi
     LEFT JOIN dbo.Products p ON p.Id = oi.ProductId
     WHERE oi.OrderId IN (${ids})
     ORDER BY oi.Id`
  );
  return orders.map((o) => ({ ...o, Items: result.recordset.filter((i) => i.OrderId === o.Id) }));
};

export const listMyOrders = async (userId) => {
  const result = await query("SELECT * FROM dbo.Orders WHERE UserId = @userId ORDER BY Id DESC", { userId });
  return attachItems(result.recordset);
};

export const getOrderForUser = async (id, user) => {
  const result = await query("SELECT * FROM dbo.Orders WHERE Id = @id", { id });
  const order = result.recordset[0];
  if (!order || (user.Role !== "admin" && order.UserId !== user.Id)) throw new ApiError(404, "Order nahi mila");
  return (await attachItems([order]))[0];
};

/** Customer sirf apna Pending order cancel kar sakta hai, stock wapas aa jata hai. */
export const cancelOrder = async (id, user) =>
  withTransaction(async (tx) => {
    const result = await txQuery(tx, "SELECT Id, UserId, Status FROM dbo.Orders WITH (UPDLOCK) WHERE Id = @id", { id });
    const order = result.recordset[0];
    if (!order || order.UserId !== user.Id) throw new ApiError(404, "Order nahi mila");
    if (order.Status !== "Pending") {
      throw new ApiError(400, "Ye order ab cancel nahi ho sakta. Dukan se rabta karein.");
    }
    await txQuery(tx, "DELETE FROM dbo.StockOut WHERE OrderId = @id", { id });
    await txQuery(tx, "UPDATE dbo.Orders SET Status = 'Cancelled' WHERE Id = @id", { id });
  });