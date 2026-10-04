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
