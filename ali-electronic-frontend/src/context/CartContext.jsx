import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const KEY = "ae_cart";

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const unitPrice = (p) =>
  p.DiscountPrice && Number(p.DiscountPrice) < Number(p.Price) ? Number(p.DiscountPrice) : Number(p.Price);

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  // product (API se aaya hua) cart me daalo, quantity stock se zyada nahi ho sakti
  const add = (product, qty = 1) => {
    const stock = Number(product.StockQuantity) || 0;
    if (stock <= 0) return;
    setItems((list) => {
      const existing = list.find((i) => i.productId === product.Id);
      if (existing) {
        return list.map((i) =>
          i.productId === product.Id ? { ...i, stock, quantity: Math.min(i.quantity + qty, stock) } : i
        );
      }
      return [
        ...list,
        {
          productId: product.Id,
          name: product.Name,
          brand: product.BrandName || "",
          image: product.ImageUrl || null,
          price: unitPrice(product),
          stock,
          quantity: Math.min(qty, stock),
        },
      ];
    });
  };

  const update = (productId, quantity) =>
    setItems((list) =>
      list.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i))
    );

  const remove = (productId) => setItems((list) => list.filter((i) => i.productId !== productId));
  const clear = () => setItems([]);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      add,
      update,
      remove,
      clear,
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);