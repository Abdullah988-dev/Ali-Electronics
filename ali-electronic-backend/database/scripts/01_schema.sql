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
