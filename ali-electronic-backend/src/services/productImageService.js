import { query, txQuery } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

export const MAX_IMAGES = 6;

export const getProductImages = async (productId) => {
  const result = await query(
    "SELECT Id, ImageUrl, SortOrder FROM dbo.ProductImages WHERE ProductId = @productId ORDER BY SortOrder, Id",
    { productId }
  );
  return result.recordset;
};

/**
 * Product ki tasveerein final karta hai (ek hi transaction me).
 *  tokens       = admin ka tarteeb: ["id:12", "new:0", "id:15"]  ("id:" = pehle se lagi, "new:" = nayi upload)
 *  uploadedUrls = abhi upload hui nayi tasveeron ke links (tarteeb me)
 * Tokens na mile to purani sab rahti hain aur nayi aakhir me jud jati hain.
 * Pehli tasveer main hoti hai aur Products.ImageUrl me bhi likhi jati hai.
 * Wapas deta hai: hatayi gayi aur kam na aane wali tasveerein (inhe commit ke baad delete karna hai).
 */
export const applyProductImages = async (tx, productId, tokens, uploadedUrls = []) => {
  const existing = (
    await txQuery(
      tx,
      "SELECT Id, ImageUrl FROM dbo.ProductImages WHERE ProductId = @productId ORDER BY SortOrder, Id",
      { productId }
    )
  ).recordset;

  const order = Array.isArray(tokens)
    ? tokens
    : [...existing.map((e) => `id:${e.Id}`), ...uploadedUrls.map((_, i) => `new:${i}`)];

  const final = [];
  const usedOld = new Set();
  const usedNew = new Set();

  for (const token of order) {
    const [type, raw] = String(token).split(":");
    const n = Number(raw);
    if (type === "id") {
      const row = existing.find((e) => e.Id === n);
      if (row && !usedOld.has(n)) {
        usedOld.add(n);
        final.push({ id: n, url: row.ImageUrl });
      }
    } else if (type === "new") {
      if (Number.isInteger(n) && uploadedUrls[n] && !usedNew.has(n)) {
        usedNew.add(n);
        final.push({ url: uploadedUrls[n] });
      }
    }
  }

  if (final.length > MAX_IMAGES) {
    throw new ApiError(400, `Ek product ki zyada se zyada ${MAX_IMAGES} tasveerein ho sakti hain`);
  }

  const removed = existing.filter((e) => !usedOld.has(e.Id));
  for (const row of removed) {
    await txQuery(tx, "DELETE FROM dbo.ProductImages WHERE Id = @id", { id: row.Id });
  }

  for (let i = 0; i < final.length; i++) {
    const item = final[i];
    if (item.id) {
      await txQuery(tx, "UPDATE dbo.ProductImages SET SortOrder = @sort WHERE Id = @id", { id: item.id, sort: i });
    } else {
      await txQuery(
        tx,
        "INSERT INTO dbo.ProductImages (ProductId, ImageUrl, SortOrder) VALUES (@productId, @url, @sort)",
        { productId, url: item.url, sort: i }
      );
    }
  }

  await txQuery(tx, "UPDATE dbo.Products SET ImageUrl = @url WHERE Id = @productId", {
    productId,
    url: final.length ? final[0].url : null,
  });

  return {
    removedUrls: removed.map((r) => r.ImageUrl),
    unusedUploads: uploadedUrls.filter((_, i) => !usedNew.has(i)),
  };
};