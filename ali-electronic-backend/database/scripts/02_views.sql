-- 1) Baaki maal = total StockIn - total StockOut  (website ka In Stock / Out of Stock isi se chalta hai)
CREATE OR ALTER VIEW dbo.vw_ProductStock AS
SELECT
    p.Id AS ProductId,
    ISNULL((SELECT SUM(si.Quantity) FROM dbo.StockIn  si WHERE si.ProductId = p.Id), 0) AS TotalIn,
    ISNULL((SELECT SUM(so.Quantity) FROM dbo.StockOut so WHERE so.ProductId = p.Id), 0) AS TotalOut,
    ISNULL((SELECT SUM(si.Quantity) FROM dbo.StockIn  si WHERE si.ProductId = p.Id), 0)
  - ISNULL((SELECT SUM(so.Quantity) FROM dbo.StockOut so WHERE so.ProductId = p.Id), 0) AS StockQuantity
FROM dbo.Products p;
GO

-- 2) Management system ki list: admin panel se jo item add hua wo yahan nazar aata hai, saath me aaya / gaya / baaki
CREATE OR ALTER VIEW dbo.vw_Inventory AS
SELECT
    p.Id            AS ProductId,
    p.Name          AS ProductName,
    p.Sku,
    c.Name          AS CategoryName,
    b.Name          AS BrandName,
    p.Price,
    p.IsPublished,
    p.LowStockLimit,
    s.TotalIn,
    s.TotalOut,
    s.StockQuantity AS Remaining,
    CASE
        WHEN s.StockQuantity <= 0               THEN 'Out of Stock'
        WHEN s.StockQuantity <= p.LowStockLimit THEN 'Low Stock'
        ELSE 'In Stock'
    END AS StockStatus
FROM dbo.Products p
JOIN dbo.Categories c ON c.Id = p.CategoryId
LEFT JOIN dbo.Brands b ON b.Id = p.BrandId
JOIN dbo.vw_ProductStock s ON s.ProductId = p.Id;
GO
