-- Ek product ki kai tasveerein (gallery). Pehli tasveer (SortOrder sab se chhota) main hoti hai.
IF OBJECT_ID('dbo.ProductImages', 'U') IS NULL
CREATE TABLE dbo.ProductImages (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    ProductId  INT NOT NULL CONSTRAINT FK_ProductImages_Products REFERENCES dbo.Products(Id) ON DELETE CASCADE,
    ImageUrl   NVARCHAR(300) NOT NULL,
    SortOrder  INT NOT NULL DEFAULT 0,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProductImages_ProductId' AND object_id = OBJECT_ID('dbo.ProductImages'))
    CREATE INDEX IX_ProductImages_ProductId ON dbo.ProductImages(ProductId, SortOrder);
GO

-- Purani (pehle se lagi hui) tasveerein bhi gallery me aa jayen
INSERT INTO dbo.ProductImages (ProductId, ImageUrl, SortOrder)
SELECT p.Id, p.ImageUrl, 0
FROM dbo.Products p
WHERE p.ImageUrl IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.ProductImages i WHERE i.ProductId = p.Id);
GO