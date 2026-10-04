/* ============================================================
   ALI ELECTRONIC - Database + Tables + Views + Trigger
   SSMS me poori file kholein aur Execute (F5) karein.
   Dobara chalane par bhi data delete nahi hota.
   ============================================================ */
IF DB_ID(N'AliElectronicDB') IS NULL CREATE DATABASE AliElectronicDB;
GO
USE AliElectronicDB;
GO
-- Ali Electronic : tables (dobara chalane par koi masla nahi, IF NOT EXISTS laga hai)

IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Name          NVARCHAR(100) NOT NULL,
    Email         NVARCHAR(150) NOT NULL UNIQUE,
    Phone         NVARCHAR(30)  NULL,
    PasswordHash  NVARCHAR(255) NOT NULL,
    Role          NVARCHAR(20)  NOT NULL DEFAULT 'customer',   -- admin | staff | customer
    IsActive      BIT           NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

IF OBJECT_ID('dbo.Categories', 'U') IS NULL
CREATE TABLE dbo.Categories (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL UNIQUE,
    Slug        NVARCHAR(120) NOT NULL UNIQUE,
    Description NVARCHAR(500) NULL,
    ImageUrl    NVARCHAR(300) NULL,
    IsActive    BIT           NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

IF OBJECT_ID('dbo.Brands', 'U') IS NULL
CREATE TABLE dbo.Brands (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    CategoryId  INT           NOT NULL REFERENCES dbo.Categories(Id),
    IsLocal     BIT           NOT NULL DEFAULT 1,
    LogoUrl     NVARCHAR(300) NULL,
    IsActive    BIT           NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Brands_Name_Category UNIQUE (Name, CategoryId)
);
GO

IF OBJECT_ID('dbo.Products', 'U') IS NULL
CREATE TABLE dbo.Products (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    Name           NVARCHAR(200)  NOT NULL,
    Description    NVARCHAR(MAX)  NULL,
    Sku            NVARCHAR(50)   NULL,
    Price          DECIMAL(12,2)  NOT NULL,
    DiscountPrice  DECIMAL(12,2)  NULL,
    ImageUrl       NVARCHAR(300)  NULL,
    CategoryId     INT            NOT NULL REFERENCES dbo.Categories(Id),
    BrandId        INT            NULL REFERENCES dbo.Brands(Id),
    IsPublished    BIT            NOT NULL DEFAULT 1,   -- website par dikhe ya nahi
    IsFeatured     BIT            NOT NULL DEFAULT 0,
    LowStockLimit  INT            NOT NULL DEFAULT 5,
    CreatedAt      DATETIME2      NOT NULL DEFAULT SYSDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Products_Sku' AND object_id = OBJECT_ID('dbo.Products'))
CREATE UNIQUE INDEX UX_Products_Sku ON dbo.Products(Sku) WHERE Sku IS NOT NULL;
GO

IF OBJECT_ID('dbo.Suppliers', 'U') IS NULL
CREATE TABLE dbo.Suppliers (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    Name      NVARCHAR(150) NOT NULL,
    Phone     NVARCHAR(30)  NULL,
    Address   NVARCHAR(300) NULL,
    IsActive  BIT           NOT NULL DEFAULT 1,
    CreatedAt DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

IF OBJECT_ID('dbo.Orders', 'U') IS NULL
CREATE TABLE dbo.Orders (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    UserId         INT           NULL REFERENCES dbo.Users(Id),
    CustomerName   NVARCHAR(100) NOT NULL,
    Phone          NVARCHAR(30)  NOT NULL,
    Address        NVARCHAR(300) NOT NULL,
    City           NVARCHAR(80)  NULL,
    Note           NVARCHAR(300) NULL,
    PaymentMethod  NVARCHAR(20)  NOT NULL DEFAULT 'COD',
    Status         NVARCHAR(20)  NOT NULL DEFAULT 'Pending',  -- Pending|Confirmed|Shipped|Delivered|Cancelled
    TotalAmount    DECIMAL(12,2) NOT NULL,
    CreatedAt      DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
CREATE TABLE dbo.OrderItems (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    OrderId      INT           NOT NULL REFERENCES dbo.Orders(Id) ON DELETE CASCADE,
    ProductId    INT           NOT NULL REFERENCES dbo.Products(Id),
    ProductName  NVARCHAR(200) NOT NULL,
    Price        DECIMAL(12,2) NOT NULL,
    Quantity     INT           NOT NULL CHECK (Quantity > 0)
);
GO

-- Maal aaya (management system)
IF OBJECT_ID('dbo.StockIn', 'U') IS NULL
CREATE TABLE dbo.StockIn (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    ProductId   INT           NOT NULL REFERENCES dbo.Products(Id),
    SupplierId  INT           NULL REFERENCES dbo.Suppliers(Id),
    Quantity    INT           NOT NULL CHECK (Quantity > 0),
    CostPrice   DECIMAL(12,2) NOT NULL DEFAULT 0,
    Note        NVARCHAR(300) NULL,
    CreatedBy   INT           NULL REFERENCES dbo.Users(Id),
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

-- Maal gaya (shop sale / online order / damage ...)
IF OBJECT_ID('dbo.StockOut', 'U') IS NULL
CREATE TABLE dbo.StockOut (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    ProductId     INT           NOT NULL REFERENCES dbo.Products(Id),
    Quantity      INT           NOT NULL CHECK (Quantity > 0),
    SalePrice     DECIMAL(12,2) NOT NULL DEFAULT 0,
    Reason        NVARCHAR(30)  NOT NULL DEFAULT 'Shop Sale',
    OrderId       INT           NULL REFERENCES dbo.Orders(Id),
    CustomerName  NVARCHAR(100) NULL,
    Note          NVARCHAR(300) NULL,
    CreatedBy     INT           NULL REFERENCES dbo.Users(Id),
    CreatedAt     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

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

-- Safety: stock kabhi minus (negative) nahi ho sakta
CREATE OR ALTER TRIGGER dbo.trg_StockOut_NoNegative
ON dbo.StockOut
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM dbo.vw_ProductStock s
        WHERE s.ProductId IN (SELECT ProductId FROM inserted)
          AND s.StockQuantity < 0
    )
    BEGIN
        RAISERROR('Stock kam hai: itna maal available nahi hai.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

PRINT 'AliElectronicDB ready: tables, views, trigger created.';
GO
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;
