-- Raftaar (indexes) aur data ki hifazat (check constraints). Dobara chalane par koi masla nahi.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StockIn_ProductId' AND object_id = OBJECT_ID('dbo.StockIn'))
    CREATE INDEX IX_StockIn_ProductId ON dbo.StockIn(ProductId) INCLUDE (Quantity, CostPrice, CreatedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StockOut_ProductId' AND object_id = OBJECT_ID('dbo.StockOut'))
    CREATE INDEX IX_StockOut_ProductId ON dbo.StockOut(ProductId) INCLUDE (Quantity, SalePrice, CreatedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StockOut_OrderId' AND object_id = OBJECT_ID('dbo.StockOut'))
    CREATE INDEX IX_StockOut_OrderId ON dbo.StockOut(OrderId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Products_CategoryId' AND object_id = OBJECT_ID('dbo.Products'))
    CREATE INDEX IX_Products_CategoryId ON dbo.Products(CategoryId, BrandId) INCLUDE (IsPublished);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_UserId' AND object_id = OBJECT_ID('dbo.Orders'))
    CREATE INDEX IX_Orders_UserId ON dbo.Orders(UserId, Id DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_Status' AND object_id = OBJECT_ID('dbo.Orders'))
    CREATE INDEX IX_Orders_Status ON dbo.Orders(Status, Id DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrderItems_OrderId' AND object_id = OBJECT_ID('dbo.OrderItems'))
    CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems(OrderId);
GO

-- Order ki status aur user ka role sirf sahi qeematon me se ho
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Orders_Status')
    ALTER TABLE dbo.Orders ADD CONSTRAINT CK_Orders_Status
        CHECK (Status IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'staff', 'customer'));
GO